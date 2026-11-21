#!/usr/bin/env python3
"""
从 ECDICT（开源英汉词典）生成 Cloze 扩展词库 bank-extended.js。

设计原则：
- 全部字段来自真实词典，绝不编造例句/场景。
- 优先 CET-4/6/考研/雅思/托福 标签词，不足部分按词频补齐。
- 按四类语义种子打分归类；未命中的通用词标记 tier='general'，不伪装成主题词。
- 每类恰好 3000 词（含 words.js 里的精编词），四类是独立配额。

用法：
    1) 取得词典 CSV（约 63MB）：
       curl -sL -H "Accept: application/vnd.github.raw+json" \
         "https://api.github.com/repos/skywind3000/ECDICT/git/blobs/<sha>" -o ecdict.csv
       （sha 可从 https://api.github.com/repos/skywind3000/ECDICT/git/trees/master?recursive=1 查 ecdict.csv）
       或直接用仓库里的 ecdict.csv。
    2) python3 tools/build_extended_bank.py [ecdict.csv路径]

可复现构建（换机器 / CI）：
    把 ecdict.csv 放到 tools/ecdict.csv，或设置环境变量 ECDICT_CSV 指向它。
    脚本按「命令行参数 > ECDICT_CSV > tools/ecdict.csv > /tmp 临时文件」顺序查找；
    /tmp 路径仅供本机临时构建，不要依赖它复现词库。
"""
import csv
import json
import os
import re
import subprocess
import sys
import collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_REPO_CSV = os.path.join(ROOT, "tools", "ecdict.csv")
DEFAULT_CSV = os.environ.get("ECDICT_CSV") or (
    _REPO_CSV if os.path.exists(_REPO_CSV) else "/tmp/ec_blob_head.bin"
)
CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV
OUT = os.path.join(ROOT, "bank-extended.js")
PER_CAT = 3000

CAT_IDS = ["business", "agent", "thinking", "strategy"]

# 语义种子：中文释义关键词 / 英文释义词根。命中数即为该类得分。
SEEDS = {
    "business": (
        ["管理", "商业", "贸易", "公司", "企业", "市场", "销售", "客户", "顾客", "会议",
         "谈判", "合同", "财务", "雇", "办公室", "报告", "项目", "供应", "价格", "利润",
         "预算", "员工", "职员", "经理", "广告", "订单", "发票", "交易", "生意", "账单",
         "工资", "薪", "税", "银行", "会计", "审计", "零售", "批发", "董事", "部门",
         "招聘", "佣金", "代理", "交付", "期限", "商务", "办公", "邮件", "协商", "协议"],
        ["manag", "business", "compan", "market", "sell", "sale", "customer", "client",
         "contract", "meeting", "negotiat", "financ", "employ", "office", "report",
         "project", "supply", "price", "profit", "budget", "staff", "manager", "advertis",
         "order", "invoice", "trade", "commerce", "corporat", "firm", "deal", "agreement",
         "salary", "wage", "tax", "bank", "account", "audit", "retail", "wholesal",
         "director", "department", "recruit", "commission", "deliver", "deadline",
         "merchant", "purchas", "vendor", "payroll", "commerce"]
    ),
    "agent": (
        ["计算", "程序", "数据", "网络", "系统", "算法", "模型", "信息", "软件", "机器",
         "自动", "处理", "存储", "编码", "逻辑", "接口", "信号", "数字", "运算", "文件",
         "检索", "概率", "统计", "样本", "参数", "变量", "函数", "指令", "内存", "芯片",
         "电路", "电子", "模拟", "虚拟", "同步", "缓存", "编译", "协议", "字节", "数组",
         "字符", "数据库", "人工智能", "推理", "训练", "评估", "部署", "服务器", "终端",
         "编程", "代码", "输入", "输出", "带宽", "延迟", "加密", "解析", "索引", "查询"],
        ["comput", "program", "data", "network", "system", "algorithm", "model", "informat",
         "software", "machine", "automat", "process", "stor", "code", "logic", "interface",
         "signal", "digital", "file", "retriev", "probabil", "statis", "sample", "parameter",
         "variable", "function", "instruction", "memory", "chip", "circuit", "electron",
         "simulat", "virtual", "synchron", "cache", "compile", "protocol", "byte", "array",
         "string", "database", "intelligence", "inference", "train", "evaluat", "deploy",
         "server", "client", "parse", "token", "index", "query", "binary", "syntax",
         "encrypt", "bandwidth", "latency", "buffer", "thread", "debug", "framework"]
    ),
    "thinking": (
        ["思考", "推理", "判断", "认知", "心理", "逻辑", "概念", "意识", "记忆", "理解",
         "分析", "综合", "抽象", "想象", "注意", "感知", "理性", "智力", "学习", "知识",
         "观点", "假设", "证明", "因果", "怀疑", "信念", "反省", "直觉", "归纳", "演绎",
         "批判", "反思", "偏见", "洞察", "智慧", "心智", "观念", "推断", "结论", "论据",
         "前提", "矛盾", "悖论", "错觉", "领悟", "考虑", "思索", "理性", "察觉", "意图"],
        ["think", "thought", "reason", "judge", "cognit", "mental", "logic", "concept",
         "conscious", "memory", "understand", "analy", "synthes", "abstract", "imagine",
         "attention", "perceiv", "rational", "intellect", "learn", "knowledge", "opinion",
         "assumption", "proof", "caus", "doubt", "belief", "reflect", "intuition", "induc",
         "deduc", "critic", "bias", "insight", "wisdom", "mind", "idea", "notion", "infer",
         "contemplat", "hypothes", "eviden", "premise", "contradict", "paradox", "perceive"]
    ),
    "strategy": (
        ["战略", "竞争", "增长", "优势", "壁垒", "份额", "定价", "渠道", "创新", "扩张",
         "投资", "资本", "风险", "收益", "周期", "规模", "效率", "资源", "定位", "差异",
         "生态", "平台", "垄断", "供需", "议价", "并购", "长期", "可持续", "杠杆", "复利",
         "期权", "边际", "收入", "成本", "护城河", "颠覆", "留存", "流失", "细分", "利基",
         "渗透", "转化", "回报", "逆风", "阻力", "选择权", "防御", "壁垒"],
        ["strateg", "compet", "growth", "advantag", "barrier", "share", "pricing", "channel",
         "innov", "expand", "invest", "capital", "risk", "return", "cycle", "scale",
         "efficien", "resource", "position", "differentiat", "ecosystem", "platform",
         "monopol", "demand", "bargain", "merger", "acquisition", "sustain", "leverage",
         "compound", "option", "margin", "revenue", "cost", "moat", "incumbent", "disrupt",
         "retention", "churn", "segment", "niche", "penetrat", "conversion", "payoff",
         "optionality", "defensib", "friction", "recurring", "distribution"]
    ),
}

# 音标字符清洗（ECDICT 混用了西里尔 ә 等）
PHON_MAP = {"ә": "ə", "ɑ": "ɑ", "ɒ": "ɒ", "ː": "ː", "ˈ": "ˈ", "ˌ": "ˌ", "ʃ": "ʃ", "ʒ": "ʒ"}
WORD_RE = re.compile(r"^[a-z]{3,18}$")  # 纯小写字母，排除缩写/连字符词/人名式词条
POS_RE = re.compile(r"\b(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux|art|a)\.", re.I)
# 词典里的专有名词/缩写/行业标记，学习价值低，剔除
JUNK_MARKERS = ("abbr", "缩写", "男子名", "女子名", "人名", "地名", "〔", "（美）",
                "(美)", "商标", "<", ">")


def clean_phon(p):
    for a, b in PHON_MAP.items():
        p = p.replace(a, b)
    return p.strip()


def first_line(s):
    return re.split(r"\\n|\n|\r", s or "")[0].strip()


def clip(s, n):
    s = (s or "").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def derive_pos(translation, definition):
    m = POS_RE.search(first_line(translation))
    if m:
        return m.group(1).lower() + "."
    m = POS_RE.search(first_line(definition))
    if m:
        return m.group(1).lower() + "."
    return ""


def derive_level(tag):
    t = (tag or "").split()
    for key, label in (("cet4", "CET-4"), ("cet6", "CET-6"), ("ky", "考研"),
                       ("ielts", "IELTS"), ("toefl", "TOEFL"), ("gre", "GRE"),
                       ("gk", "高考"), ("zk", "中考")):
        if key in t:
            return label
    return "高频"


def export_core_words():
    js = ("global.window={};require(%r);"
          "process.stdout.write(JSON.stringify(window.WORDBANK.map(function(w){return w.word;})));"
          % os.path.join(ROOT, "words.js"))
    return set(w.lower() for w in json.loads(subprocess.check_output(["node", "-e", js])))


def load_candidates(core_words):
    csv.field_size_limit(10**7)
    with open(CSV_PATH, encoding="utf-8", errors="replace", newline="") as f:
        r = csv.DictReader(f)
        out = []
        for row in r:
            w = (row.get("word") or "").strip()
            if not WORD_RE.match(w) or w in core_words:
                continue
            phonetic = clean_phon(row.get("phonetic") or "")
            translation = first_line(row.get("translation") or "")
            definition = first_line(row.get("definition") or "")
            if not phonetic or not translation:
                continue
            # 清洗：剔除缩写、人名、行业标记词条；要求有英文释义
            blob = translation + " " + definition
            if any(m in blob for m in JUNK_MARKERS):
                continue
            if not definition:
                continue
            tag = row.get("tag") or ""
            frq_raw = (row.get("frq") or "").strip()
            # frq=0/空 代表「无词频数据」，不能当作高频；统一给极大值排到最后
            frq = int(frq_raw) if frq_raw.isdigit() and int(frq_raw) > 0 else 999999
            collins = (row.get("collins") or "").strip()
            tagset = set(tag.split())
            is_exam = bool(tagset & {"cet4", "cet6", "ky", "ielts", "toefl", "gk", "zk"})
            has_exam_tag = bool(tagset & {"cet4", "cet6", "ky", "ielts", "toefl"})
            # 门槛：有考试标签，或有真实词频(frq 1..30000)，或 Collins >= 2 / Oxford 标记
            is_common = (1 <= frq <= 30000) or (collins.isdigit() and int(collins) >= 2) \
                        or (row.get("oxford") or "").strip() == "1"
            if not (is_exam or is_common):
                continue
            # 排除只有中考/高考标签且无词频的基础词（对六级用户价值低）
            if not has_exam_tag and frq == 999999 and not (collins.isdigit() and int(collins) >= 2):
                continue
            out.append({
                "word": w,
                "phonetic": clip(phonetic, 40),
                "pos": derive_pos(translation, definition),
                "meaning": clip(translation, 44),
                "meaningEn": clip(definition, 110),
                "level": derive_level(tag),
                "frq": frq,
                "exam": 2 if has_exam_tag else (1 if is_exam else 0),
            })
    return out


def score_categories(item):
    text = (item["word"] + " " + item["meaning"] + " " + item["meaningEn"]).lower()
    scores = {}
    for cat, (zh, en) in SEEDS.items():
        s = 0
        for k in zh:
            if k in text:
                s += 2
        for k in en:
            if k in text:
                s += 1
        scores[cat] = s
    return scores


def main():
    if not os.path.exists(CSV_PATH):
        sys.exit("找不到词典 CSV：%s（见脚本顶部说明）" % CSV_PATH)
    core_words = export_core_words()
    print("精编词排除数：", len(core_words))
    pool = load_candidates(core_words)
    print("候选词池：", len(pool))

    # 排序：考试词优先，其次词频（frq 越小越高频）
    pool.sort(key=lambda x: (-x["exam"], x["frq"], x["word"]))

    # 需要补的扩展词总数：每类 3000 - 该类精编 20
    js_core = ("global.window={};require(%r);"
               "var c={};window.WORDBANK.forEach(function(w){c[w.cat]=(c[w.cat]||0)+1;});"
               "process.stdout.write(JSON.stringify(c));" % os.path.join(ROOT, "words.js"))
    core_count = json.loads(subprocess.check_output(["node", "-e", js_core]))
    quota = {c: PER_CAT - core_count.get(c, 0) for c in CAT_IDS}
    print("各类需补：", quota, " 合计", sum(quota.values()))

    if len(pool) < sum(quota.values()):
        sys.exit("候选词不足：%d < %d" % (len(pool), sum(quota.values())))

    chosen = pool[: sum(quota.values())]

    # 归类：先放语义命中的，未命中的进 general 池
    assigned = {c: [] for c in CAT_IDS}
    general = []
    for item in chosen:
        sc = score_categories(item)
        best = max(CAT_IDS, key=lambda c: (sc[c], -CAT_IDS.index(c)))
        if sc[best] == 0:
            general.append(item)
        else:
            item["tier"] = "topic"
            assigned[best].append(item)

    # 语义命中过多的类，溢出部分转入 general 池（按词频保留更高频的）
    for c in CAT_IDS:
        if len(assigned[c]) > quota[c]:
            assigned[c].sort(key=lambda x: x["frq"])
            overflow = assigned[c][quota[c]:]
            assigned[c] = assigned[c][:quota[c]]
            for it in overflow:
                general.append(it)
    general.sort(key=lambda x: x["frq"])

    # 用 general 池按缺口补齐（保证每类恰好 3000）
    gi = 0
    for c in CAT_IDS:  # 循环补齐，避免一次性被前两类吃光
        pass
    need = {c: quota[c] - len(assigned[c]) for c in CAT_IDS}
    while any(v > 0 for v in need.values()) and gi < len(general):
        for c in CAT_IDS:
            if need[c] > 0 and gi < len(general):
                it = general[gi]
                gi += 1
                it["tier"] = "general"
                assigned[c].append(it)
                need[c] -= 1
    if any(v > 0 for v in need.values()):
        sys.exit("补齐失败，剩余缺口：%s" % need)

    # 输出紧凑数组：[id, cat, word, phonetic, pos, meaning, meaningEn, level, frq, tier]
    rows = []
    n = 0
    for c in CAT_IDS:
        assigned[c].sort(key=lambda x: x["word"])
        for it in assigned[c]:
            n += 1
            rows.append([
                "x%05d" % n, c, it["word"], it["phonetic"], it["pos"],
                it["meaning"], it["meaningEn"], it["level"], it["frq"], it["tier"],
            ])

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* Cloze 扩展词库 —— 由 tools/build_extended_bank.py 生成，请勿手工编辑。\n")
        f.write(" * 数据源：ECDICT (skywind3000/ECDICT, MIT)。字段均为真实词典数据，无编造例句。\n")
        f.write(" * tier: topic=语义命中主题词 / general=通用高频词（按配额均衡分配）。\n")
        f.write(" * 列：[id, cat, word, phonetic, pos, meaning, meaningEn, level, frq, tier]\n")
        f.write(" * 每类 3000 词（含 words.js 精编词），与精编层共用间隔复习。\n")
        f.write(" */\n")
        f.write("window.EXTENDED_BANK_RAW = ")
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    size = os.path.getsize(OUT) / 1024 / 1024
    stats = collections.Counter(r[1] for r in rows)
    tiers = collections.Counter(r[9] for r in rows)
    print("输出：%s (%.2f MB)" % (OUT, size))
    print("总数：", len(rows), " 分类：", dict(stats), " tier：", dict(tiers))
    for c in CAT_IDS:
        print("  %-9s %4d (topic %d / general %d)" % (
            c, stats[c],
            sum(1 for r in rows if r[1] == c and r[9] == "topic"),
            sum(1 for r in rows if r[1] == c and r[9] == "general")))


if __name__ == "__main__":
    main()
