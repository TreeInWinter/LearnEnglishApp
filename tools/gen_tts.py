#!/usr/bin/env python3
"""
为 Cloze 词库批量生成神经网络语音（本地 mp3）。

用法：
    pip install edge-tts
    python3 tools/gen_tts.py           # 只补缺失 / 过小的文件
    python3 tools/gen_tts.py --force   # 强制全部重新生成
    python3 tools/gen_tts.py --provider breeze  # 只补 Breeze 试点音频
    python3 tools/gen_tts.py --provider breeze --ids b01 x00494  # 指定题库 ID

说明：
- 读取 ../words.js 中的精编题；Breeze 另外支持 ../bank-extended.js 的扩展词。
- 输出到 ../audio/<voice>/<id>.mp3；Breeze 另生成静态覆盖清单。
- 生成阶段使用联网服务，前端只加载生成好的文件，不调用合成 API。
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

# edge-tts 仅在旧生成路径按需导入。

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORDS_JS = os.path.join(ROOT, "words.js")
OUT_DIR = os.path.join(ROOT, "audio")
VOICES = {"aria": "en-US-AriaNeural", "guy": "en-US-GuyNeural"}
RATE = "-5%"          # 略慢，便于跟读
MIN_BYTES = 2000      # 小于此值视为失败
sem = asyncio.Semaphore(3)
BREEZE_VOICE = "voc_6t4xfzxkq25c"  # Alma, 美式英语
BREEZE_DIR = Path(OUT_DIR) / "breeze"
PILOT_IDS = (
    "b01", "b02", "b03", "a01", "a10", "a11", "t01", "t04", "s01", "s04",
    "x00494", "x02107", "x02366", "x03015", "x03692", "x05145", "x06645",
    "x08007", "x08179", "x11493",
)
BREEZE_WORD_NOTES = {
    "x02107": "Pronounce project as a noun, with the stress on the first syllable.",
    "x08007": "Pronounce present as a noun, with the stress on the first syllable.",
    "x08145": "Pronounce record as a noun, with the stress on the first syllable.",
}


def export_words(include_extended=False):
    js = "global.window={};require(%s);" % json.dumps(WORDS_JS)
    if include_extended:
        js += "require(%s);" % json.dumps(os.path.join(ROOT, "bank-extended.js"))
        js += "window.WORDBANK.push(...window.EXTENDED_BANK_RAW.map(r=>({id:r[0],word:r[2]})));"
    js += "process.stdout.write(JSON.stringify(window.WORDBANK));"
    try:
        raw = subprocess.check_output(["node", "-e", js])
    except FileNotFoundError:
        sys.exit("未找到 node，请先安装 Node.js")
    return json.loads(raw)


def generate_breeze(ids, force):
    words = {w["id"]: w for w in export_words(include_extended=True)}
    unknown = [key for key in ids if key not in words]
    if unknown:
        sys.exit("未知词条 ID：" + ", ".join(unknown))
    cli = os.environ.get("BREEZE_CLI_BIN") or shutil.which("breeze") or str(Path.home() / ".local/bin/breeze")
    pending = [key for key in dict.fromkeys(ids) if force or not valid_audio(BREEZE_DIR / (key + ".mp3"))]
    if not pending:
        write_breeze_manifest(words)
        print("音频已齐全，未提交生成请求。")
        return 0

    texts = {key: re.sub(r"\s+([,;:.!?])", r"\1", words[key]["sentence"].replace("___", words[key]["word"]))
             if "sentence" in words[key] else words[key]["word"] for key in pending}
    # 英文输入每 10 个字符 1 积分；实际费用以服务返回为准。
    estimate = sum(len(text) for text in texts.values()) / 10
    try:
        balance = breeze_call(cli, "balance", "--agent")
        if float(balance["balance"]) < estimate:
            sys.exit(f"Breeze 积分不足：预计 {estimate:.1f}，余额 {balance['balance']}")
    except (OSError, RuntimeError, KeyError, ValueError) as exc:
        sys.exit(f"无法确认 Breeze 余额：{exc}")
    print(f"准备合成 {len(pending)} 条，预计 {estimate:.1f} 积分。", flush=True)
    BREEZE_DIR.mkdir(parents=True, exist_ok=True)
    scratch = Path(ROOT) / ".local" / "breezetts"
    scratch.mkdir(parents=True, exist_ok=True)
    failures = 0
    # 批处理不在本机连续自动播放；完成后可在网站选择试听。
    with TemporaryDirectory(prefix="batch-", dir=scratch) as temp:
        for key in pending:
            source = Path(temp) / (key + ".txt")
            target = Path(temp) / (key + ".mp3")
            source.write_text(texts[key], encoding="utf-8")
            instructions = BREEZE_WORD_NOTES.get(key, "Read exactly the supplied text in clear, natural American English, without adding any words. If the text is a single word, say it only once.")
            try:
                breeze_call(cli, "tts", "--input", str(source), "--voice", BREEZE_VOICE,
                            "--language", "en", "--instructions", instructions,
                            "--format", "mp3", "--file", str(target), "--stream", "--no-play", "--agent")
                if not valid_audio(target):
                    raise RuntimeError("输出不是有效的 MP3")
                target.replace(BREEZE_DIR / target.name)
                print(f"  OK {key}: {words[key]['word']}", flush=True)
            except (OSError, RuntimeError) as exc:
                failures += 1
                print(f"  FAIL {key}: {exc}；停止提交，未自动重试。", file=sys.stderr, flush=True)
                break
    write_breeze_manifest(words)
    return 1 if failures else 0


def breeze_call(cli, *args):
    result = subprocess.run([cli, *args], capture_output=True, text=True, check=False)
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(result.stderr.strip() or "未收到 Breeze JSON 响应") from exc
    if payload.get("error") or result.returncode:
        raise RuntimeError(payload.get("error") or result.stderr.strip() or f"退出状态 {result.returncode}")
    return payload


def valid_audio(path):
    try:
        with path.open("rb") as f:
            header = f.read(3)
        return path.stat().st_size >= 512 and (
            header == b"ID3" or (len(header) >= 2 and header[0] == 255 and header[1] & 224 == 224)
        )
    except OSError:
        return False


def write_breeze_manifest(words):
    keys = sorted(p.stem for p in BREEZE_DIR.glob("*.mp3") if p.stem in words and valid_audio(p))
    manifest = Path(OUT_DIR) / "breeze-manifest.js"
    manifest.write_text("// Generated by tools/gen_tts.py --provider breeze\nwindow.BREEZE_AUDIO_IDS = " +
                        json.dumps(keys, ensure_ascii=True) + ";\n", encoding="utf-8")


async def one(vkey, voice, w, force, edge_tts):
    text = w["sentence"].replace("___", w["word"])
    path = os.path.join(OUT_DIR, vkey, w["id"] + ".mp3")
    os.makedirs(os.path.dirname(path), exist_ok=True)

    if not force and os.path.exists(path) and os.path.getsize(path) >= MIN_BYTES:
        return ("skip", vkey, w["id"])

    err = ""
    for attempt in range(3):
        try:
            async with sem:
                await edge_tts.Communicate(text, voice, rate=RATE).save(path)
            if os.path.getsize(path) >= MIN_BYTES:
                return ("ok", vkey, w["id"])
            err = "文件过小"
        except Exception as e:
            err = str(e)[:120]
        await asyncio.sleep(1.0 + attempt * 1.5)
    return ("fail", vkey, w["id"], err)


async def generate_edge(force):
    try:
        import edge_tts
    except ImportError:
        sys.exit("缺少依赖，请先执行：pip install edge-tts")
    words = export_words()
    print("词条数：%d，音色：%s" % (len(words), ", ".join(VOICES)))
    tasks = [one(k, v, w, force, edge_tts) for k, v in VOICES.items() for w in words]
    results = await asyncio.gather(*tasks)

    ok = [r for r in results if r[0] == "ok"]
    skip = [r for r in results if r[0] == "skip"]
    fail = [r for r in results if r[0] == "fail"]
    print("生成 %d，跳过 %d，失败 %d" % (len(ok), len(skip), len(fail)))
    for f in fail:
        print("  FAIL", f)
    for k in VOICES:
        d = os.path.join(OUT_DIR, k)
        n = len([f for f in os.listdir(d) if f.endswith(".mp3")]) if os.path.isdir(d) else 0
        print("  %s: %d 个文件" % (k, n))
    return 1 if fail else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="为本地英语题库生成 MP3")
    parser.add_argument("--provider", choices=("edge", "breeze"), default="edge")
    parser.add_argument("--force", action="store_true", help="重新合成并覆盖已有音频")
    parser.add_argument("--ids", nargs="+", help="仅合成指定 ID（Breeze）")
    args = parser.parse_args()
    if args.provider == "breeze":
        sys.exit(generate_breeze(args.ids or PILOT_IDS, args.force))
    if args.ids:
        parser.error("--ids 只支持 Breeze")
    sys.exit(asyncio.run(generate_edge(args.force)))
