/* ============================================================
 * Cloze · 场景填词  —  应用逻辑
 * 纯 JS 前端；学习进度存在 localStorage，Cloudflare 版另有可选语音 API
 * ============================================================ */
(function () {
  'use strict';

  var STORE_KEY = 'cloze_state_v1';
  var CATS = window.CATEGORIES || [];
  var CAT_MAP = {};
  CATS.forEach(function (c) { CAT_MAP[c.id] = c; });

  /* 词库分两层：
   *   cloze  —— words.js 里手工精编的场景填词（80 条，带真人级音频）
   *   define —— bank-extended.js 扩展词库（11920 条，真实词典字段，释义拼词）
   * 两者共用同一套间隔复习、错词本、打卡与统计。 */
  var BANK = (window.WORDBANK || []).map(function (w) {
    w.mode = 'cloze'; w.tier = 'core'; return w;
  });
  (window.EXTENDED_BANK_RAW || []).forEach(function (r) {
    BANK.push({
      id: r[0], cat: r[1], word: r[2], phonetic: r[3], pos: r[4],
      meaning: r[5], meaningEn: r[6], level: r[7], frq: r[8], tier: r[9],
      accepted: [], mode: 'define', scene: '', sentence: '',
      translation: '', collocation: ''
    });
  });
  var BANK_MAP = {};
  BANK.forEach(function (w) { BANK_MAP[w.id] = w; });
  var CORE_COUNT = BANK.filter(function (w) { return w.mode === 'cloze'; }).length;
  var BREEZE_IDS = new Set(window.BREEZE_AUDIO_IDS || []);
  var BREEZE_WORD_COUNT = BANK.filter(function (w) { return w.mode === 'define' && BREEZE_IDS.has(w.id); }).length;
  var BREEZE_SENTENCE_COUNT = BREEZE_IDS.size - BREEZE_WORD_COUNT;

  /* define 题「看中文释义拼词」有天然歧义：多个英文词常共用同一中文首义项
   * （实测 1414 组、涉及 3288 词）。运行时按中文首义项建同义组，判分时接受
   * 同组词并在反馈中点明目标词，避免用户填了同义词却被判错。 */
  var SYNONYMS = {};
  (function buildSynonyms() {
    var groups = {};
    BANK.forEach(function (w) {
      if (w.mode !== 'define') return;
      var key = String(w.meaning || '').split(/[；;，,／\/]/)[0]
        .replace(/[（(].*?[)）]/g, '').trim().toLowerCase();
      if (!key || key.length < 2) return;
      if (!groups[key]) groups[key] = [];
      if (groups[key].indexOf(w.word) === -1) groups[key].push(w.word);
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (g.length < 2) return;
      g.forEach(function (word) {
        SYNONYMS[word] = g.filter(function (x) { return x !== word; });
      });
    });
  })();

  /* ---------- 日期工具 ---------- */
  function dstr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function today() { return dstr(new Date()); }
  function addDays(base, n) {
    var d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return dstr(d);
  }
  function yesterday() { return addDays(today(), -1); }

  /* ---------- 默认状态 ---------- */
  function defaults() {
    return {
      version: 1,
      view: 'today',
      settings: {
        dailyGoal: 10,
        cats: CATS.map(function (c) { return c.id; }),
        scope: 'mixed',           // mixed | cloze | define 练习范围
        freqBand: 'all',          // all | advanced(frq<=15000) | core(frq<=5000)
        speech: false,
        ttsVoice: 'breeze',      // breeze | aria | guy | browser
        ttsVersion: 2,           // 旧版默认 Aria 升级为 Breeze 优先
        browserVoiceURI: '',     // '' = 自动挑选最佳可用语音
        rate: 0.95
      },
      progress: {},          // id -> {seen,correct,wrong,streak,mastered,lastSeen,due}
      wrongBook: [],
      today: null,           // {date, queue:[ids], results:{id:'ok'|'bad'|'skip'}}
      checkin: { lastDate: '', days: 0 },
      history: {},           // 'YYYY-MM-DD' -> {done, correct}
      totalPracticed: 0,
      totalCorrect: 0
    };
  }

  var state = load();

  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return d;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || Array.isArray(s)) return d;

      if (s.settings && typeof s.settings === 'object' && !Array.isArray(s.settings)) {
        d.settings = Object.assign(d.settings, s.settings);
      }
      // 老数据里没有「商业思考」类：默认纳入，用户仍可自行关闭
      if (Array.isArray(d.settings.cats) && d.settings.cats.length === 3 &&
          d.settings.cats.indexOf('strategy') === -1) {
        d.settings.cats = d.settings.cats.concat(['strategy']);
      }
      if (!Array.isArray(d.settings.cats) || !d.settings.cats.length) {
        d.settings.cats = CATS.map(function (c) { return c.id; });
      }
      d.settings.cats = d.settings.cats.filter(function (c) { return !!CAT_MAP[c]; });
      if (!d.settings.cats.length) d.settings.cats = CATS.map(function (c) { return c.id; });
      d.settings.dailyGoal = clampGoal(d.settings.dailyGoal);
      if ((!s.settings || s.settings.ttsVersion !== 2) && d.settings.ttsVoice === 'aria') d.settings.ttsVoice = 'breeze';
      if (['breeze', 'aria', 'guy', 'browser'].indexOf(d.settings.ttsVoice) === -1) d.settings.ttsVoice = 'breeze';
      d.settings.ttsVersion = 2;
      if (['mixed', 'cloze', 'define'].indexOf(d.settings.scope) === -1) d.settings.scope = 'mixed';
      if (['all', 'advanced', 'core'].indexOf(d.settings.freqBand) === -1) d.settings.freqBand = 'all';
      d.settings.rate = clampRate(d.settings.rate);

      // 结构校验：损坏/旧版备份不能让 renderTop() 里的 Object.keys(undefined) 中断启动。
      var t = s.today;
      d.today = (t && typeof t === 'object' && !Array.isArray(t) &&
                 typeof t.date === 'string' && Array.isArray(t.queue) &&
                 t.results && typeof t.results === 'object' && !Array.isArray(t.results))
        ? { date: t.date, queue: t.queue.slice(), results: t.results } : null;
      d.progress = (s.progress && typeof s.progress === 'object' && !Array.isArray(s.progress))
        ? s.progress : {};
      // 过滤词库里已不存在的幽灵 id，避免错词本计数虚高、复习队列出现空题
      d.wrongBook = Array.isArray(s.wrongBook)
        ? s.wrongBook.filter(function (id) { return typeof id === 'string' && !!BANK_MAP[id]; }) : [];
      var ck = s.checkin;
      d.checkin = (ck && typeof ck === 'object' && !Array.isArray(ck))
        ? { lastDate: typeof ck.lastDate === 'string' ? ck.lastDate : '', days: Number(ck.days) || 0 }
        : { lastDate: '', days: 0 };
      d.history = (s.history && typeof s.history === 'object' && !Array.isArray(s.history))
        ? s.history : {};
      d.totalPracticed = Number(s.totalPracticed) || 0;
      d.totalCorrect = Number(s.totalCorrect) || 0;
      d.view = typeof s.view === 'string' ? s.view : 'today';
    } catch (e) { /* 数据损坏时回到默认 */ }
    return d;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function clampGoal(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return 10;
    return Math.max(1, Math.min(60, n));
  }

  function getP(id, create) {
    if (!state.progress[id]) {
      if (!create) return { seen: 0, correct: 0, wrong: 0, streak: 0, mastered: false, lastSeen: '', due: '' };
      state.progress[id] = { seen: 0, correct: 0, wrong: 0, streak: 0, mastered: false, lastSeen: '', due: '' };
    }
    return state.progress[id];
  }

  function wordById(id) { return BANK_MAP[id] || null; }

  /* ---------- 会话（内存） ---------- */
  // {view:'today'|'review', mode:'daily'|'extra'|'review', queue:[ids], idx, done,
  //  phase:'answering'|'feedback', lastOk, lastInput, draft, hintLevel}
  var session = null;

  function makeDailySession() {
    ensureToday();
    var t = state.today;
    var idx = Object.keys(t.results).length;
    return {
      view: 'today', mode: 'daily', queue: t.queue.slice(), idx: idx,
      done: idx >= t.queue.length, phase: 'answering',
      lastOk: null, lastInput: '', draft: '', hintLevel: 0
    };
  }

  function ensureToday() {
    var d = today();
    if (state.today && state.today.date === d && state.today.queue && state.today.queue.length) return;
    state.today = { date: d, queue: buildQueue(state.settings.dailyGoal), results: {} };
    save();
  }

  /* 队列：到期复习（硬性预留）→ 错词 → 新词 → 学习中 → 已掌握，再做分类均衡。
   * 范围：cloze=精编场景题 / define=扩展释义题 / mixed=两者混合。
   * 难度带：core(frq<=5000) / advanced(frq<=15000) / all，只作用于扩展词。
   * 12000 词全量排序开销可控（只在生成当日队列/加练时执行一次）。 */
  function pickByScore(pool, n) {
    if (n <= 0 || !pool.length) return [];
    var d = today();
    var scored = pool.map(function (w) {
      var p = getP(w.id), s = 0;
      if (p.wrong > 0 && !p.mastered) s += 100;
      if (p.seen === 0) s += 60;
      else if (!p.mastered) s += 40;
      if (p.mastered && p.due && p.due <= d) s += 130;   // 到期复习必须压过未学新词
      if (p.mastered && (!p.due || p.due > d)) s -= 60;
      if (p.wrong > 0) s += Math.min(p.wrong, 5) * 3;
      s += Math.random() * 12;
      return { w: w, s: s };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, n).map(function (x) { return x.w; });
  }

  /* 硬性取出到期应复习的词：11920 个未学新词否则会把它们永远压在后面。
   * 按到期日升序（逾期越久越优先），最多占当日配额的 1/4。 */
  function takeDueReviews(pool, scope, limit) {
    if (limit <= 0) return [];
    var d = today();
    var cand = pool.filter(function (w) {
      if (scope === 'cloze' && w.mode !== 'cloze') return false;
      if (scope === 'define' && w.mode !== 'define') return false;
      var p = getP(w.id);
      return p.mastered && p.due && p.due <= d;
    });
    cand.sort(function (a, b) {
      return String(getP(a.id).due).localeCompare(String(getP(b.id).due));
    });
    return cand.slice(0, limit);
  }

  function buildQueue(goal, exclude) {
    var cats = state.settings.cats;
    var scope = state.settings.scope || 'mixed';
    var band = state.settings.freqBand || 'all';
    var maxFrq = band === 'core' ? 5000 : band === 'advanced' ? 15000 : Infinity;
    var pool = BANK.filter(function (w) {
      if (cats.indexOf(w.cat) === -1) return false;
      if (exclude && exclude.indexOf(w.id) !== -1) return false;
      if (w.mode === 'define' && Number(w.frq) > maxFrq) return false;
      return true;
    });
    if (!pool.length) pool = BANK.filter(function (w) { return cats.indexOf(w.cat) !== -1; });
    if (!pool.length) pool = BANK.slice();

    // 1) 到期复习硬性占位，保证「7 天后回顾」真的排进今日队列
    var quota = Math.min(Math.max(1, Math.round(goal * 0.25)), goal);
    var reviews = takeDueReviews(pool, scope, quota);
    var reviewIds = {};
    reviews.forEach(function (w) { reviewIds[w.id] = 1; });
    var restPool = pool.filter(function (w) { return !reviewIds[w.id]; });
    var restGoal = Math.max(0, goal - reviews.length);

    // 2) 剩余名额走原有分值排序
    var core = restPool.filter(function (w) { return w.mode === 'cloze'; });
    var ext = restPool.filter(function (w) { return w.mode === 'define'; });
    var chosen;

    if (scope === 'cloze') {
      chosen = pickByScore(core, restGoal);
      if (chosen.length < restGoal) chosen = chosen.concat(pickByScore(ext, restGoal - chosen.length));
    } else if (scope === 'define') {
      chosen = pickByScore(ext, restGoal);
      if (chosen.length < restGoal) chosen = chosen.concat(pickByScore(core, restGoal - chosen.length));
    } else {
      // 混合：约 1/3 场景填词 + 2/3 释义拼词，保证核心体验不被大词库淹没
      var nCore = restGoal > 0 ? Math.min(core.length, Math.max(1, Math.round(restGoal / 3))) : 0;
      chosen = pickByScore(core, nCore).concat(pickByScore(ext, restGoal - nCore));
      if (chosen.length < restGoal) {
        var rest = restPool.filter(function (w) { return chosen.indexOf(w) === -1; });
        chosen = chosen.concat(pickByScore(rest, restGoal - chosen.length));
      }
    }
    return reviews.concat(interleave(chosen)).map(function (w) { return w.id; });
  }

  function interleave(arr) {
    var groups = {}, keys = [], out = [], i = 0;
    arr.forEach(function (w) {
      if (!groups[w.cat]) { groups[w.cat] = []; keys.push(w.cat); }
      groups[w.cat].push(w);
    });
    while (out.length < arr.length) {
      var added = false;
      keys.forEach(function (k) { if (groups[k][i]) { out.push(groups[k][i]); added = true; } });
      if (!added) break;
      i++;
    }
    return out;
  }

  /* ---------- 判定与记录 ---------- */
  function normalize(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function isCorrect(input, w) {
    var v = normalize(input);
    if (!v) return false;
    var accepted = [w.word].concat(w.accepted || []);
    // 释义题接受同义组；场景填词有唯一语境答案，不做宽容
    if (w.mode === 'define') accepted = accepted.concat(SYNONYMS[w.word] || []);
    return accepted.some(function (a) { return normalize(a) === v; });
  }
  /* 用户填的是同义词而非本题目标词时返回该词，用于反馈里点明差异 */
  function synonymOf(input, w) {
    var v = normalize(input);
    if (!v || w.mode !== 'define' || normalize(w.word) === v) return '';
    return (SYNONYMS[w.word] || []).filter(function (a) { return normalize(a) === v; })[0] || '';
  }

  function addWrong(id) { if (state.wrongBook.indexOf(id) === -1) state.wrongBook.push(id); }
  function removeWrong(id) {
    var i = state.wrongBook.indexOf(id);
    if (i !== -1) state.wrongBook.splice(i, 1);
  }

  function record(w, ok, skipped) {
    var p = getP(w.id, true);
    p.seen++; p.lastSeen = today();
    state.totalPracticed++;

    if (ok) {
      p.correct++; p.streak++; state.totalCorrect++;
      if (p.streak >= 2) { p.mastered = true; p.due = addDays(today(), 7); }
      removeWrong(w.id);
    } else {
      p.wrong++; p.streak = 0; p.mastered = false; p.due = today();
      addWrong(w.id);
    }

    if (session && session.mode === 'daily') {
      if (!state.today) ensureToday();
      if (!state.today.results) state.today.results = {};
      state.today.results[w.id] = skipped ? 'skip' : (ok ? 'ok' : 'bad');
      if (Object.keys(state.today.results).length >= state.today.queue.length) markCheckin();
    }

    var h = state.history[today()] || { done: 0, correct: 0 };
    h.done++; if (ok) h.correct++;
    state.history[today()] = h;
    save();
  }

  function markCheckin() {
    var c = state.checkin;
    if (c.lastDate === today()) return;
    c.days = (c.lastDate === yesterday()) ? (c.days || 0) + 1 : 1;
    c.lastDate = today();
  }

  /* ---------- 发音：静态音频优先，手动点读时可访问 Cloudflare 后端 ---------- */
  var audioEl = null;
  var audioUrl = null;
  var cloudRequest = null;
  var speechUtterance = null;
  var voicesCache = [];
  var cloudEnabled = window.CLOUD_TTS_ENABLED === true;
  var accessToken = '';
  if (cloudEnabled) {
    try { accessToken = sessionStorage.getItem('cloze_tts_access') || ''; } catch (e) {}
  }

  function fullSentence(w) {
    return w.mode === 'define' ? w.word : w.sentence.replace('___', w.word);
  }

  function speak(w, force, onStart) {
    if (!w || (!force && !state.settings.speech)) return;
    stopAudio();
    var mode = state.settings.ttsVoice;
    var candidates = [];
    if (mode === 'breeze' && BREEZE_IDS.has(w.id)) {
      candidates.push({ dir: 'breeze', label: 'BreezeTTS · Alma' });
    }
    if (mode === 'breeze' && cloudEnabled && force && accessToken && navigator.onLine !== false) {
      candidates.push({ cloud: true, label: 'BreezeTTS · Alma' });
    }
    if (w.mode === 'cloze' && mode !== 'browser') {
      var voice = mode === 'guy' ? 'guy' : 'aria';
      candidates.push({ dir: voice, label: voice === 'guy' ? 'Guy' : 'Aria' });
    }
    function playNext() {
      var clip = candidates.shift();
      if (!clip) { speakBrowser(fullSentence(w), force, onStart); return; }
      function started() { if (onStart) onStart(clip.label); }
      if (clip.cloud) { playCloud(w.id, playNext, started); return; }
      playNeural('audio/' + clip.dir + '/' + w.id + '.mp3', playNext, started);
    }
    playNext();
  }

  async function playCloud(id, fallback, onStart) {
    var controller = new AbortController();
    cloudRequest = controller;
    var timeout = setTimeout(function () { controller.abort(); }, 14000);
    try {
      var res = await fetch('/api/tts/' + encodeURIComponent(id), {
        method: 'POST', headers: { 'X-TTS-Access': accessToken }, signal: controller.signal
      });
      if (!res.ok || !/^audio\/mpeg/i.test(res.headers.get('Content-Type') || '')) {
        if (cloudRequest !== controller) return;
        if (res.status === 401) toast('云端朗读口令不正确，请到设置更新');
        else if (res.status === 429) toast('云端朗读额度已用完或服务繁忙，使用备用音源');
        throw new Error('Cloud voice unavailable');
      }
      var blob = await res.blob();
      if (cloudRequest !== controller) return;
      cloudRequest = null;
      audioUrl = URL.createObjectURL(blob);
      playNeural(audioUrl, fallback, onStart);
    } catch (e) {
      if (cloudRequest !== controller) return;
      cloudRequest = null;
      fallback();
    } finally {
      clearTimeout(timeout);
    }
  }

  function playNeural(src, fallback, onStart) {
    var a;
    function fail() {
      if (audioEl !== a) return;
      releaseAudio();
      fallback();
    }
    try { a = new Audio(src); } catch (e) { releaseAudio(); fallback(); return; }
    audioEl = a;
    a.onerror = fail;
    a.onended = function () { if (audioEl === a) releaseAudio(); };
    a.onplaying = function () {
      if (audioEl !== a) return;
      a.onplaying = null;
      onStart();
    };
    try {
      var p = a.play();
      if (p && typeof p.catch === 'function') p.catch(fail);
    } catch (e) { fail(); }
  }

  function releaseAudio() {
    var a = audioEl;
    audioEl = null;
    if (a) {
      a.onerror = a.onplaying = a.onended = null;
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    }
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null; }
  }

  function stopAudio() {
    var pending = cloudRequest;
    cloudRequest = null;
    if (pending) pending.abort();
    releaseAudio();
    speechUtterance = null;
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  /* ---- 浏览器语音：自动挑最优（在线 / 神经 voice 优先） ---- */
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    try { voicesCache = window.speechSynthesis.getVoices() || []; } catch (e) {}
  }

  function voiceScore(v) {
    var name = (v.name || '') + ' ' + (v.voiceURI || '');
    var lang = String(v.lang || '').replace('_', '-').toLowerCase();
    var s = 0;
    if (lang.indexOf('en-us') === 0) s += 40;
    else if (lang.indexOf('en') === 0) s += 25;
    if (v.localService === false) s += 45;                          // 在线语音多为神经网络合成
    if (/natural|neural|online|premium|enhanced/i.test(name)) s += 35;
    if (/google/i.test(name)) s += 20;
    if (/aria|jenny|guy|samantha|ava|allison|zira|david/i.test(name)) s += 10;
    if (/compact|espeak|pico|novelty/i.test(name)) s -= 30;
    return s;
  }

  function browserVoiceOptions() {
    return voicesCache.filter(function (v) {
      return String(v.lang || '').toLowerCase().indexOf('en') === 0;
    }).sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
  }

  function pickVoice() {
    var opts = browserVoiceOptions();
    var uri = state.settings.browserVoiceURI;
    if (uri) {
      var m = opts.filter(function (v) { return v.voiceURI === uri; })[0];
      if (m) return m;
    }
    return opts[0] || null;
  }

  function speakBrowser(text, force, onStart) {
    if (!('speechSynthesis' in window)) { if (force) toast('当前浏览器不支持朗读'); return; }
    try {
      var u = new SpeechSynthesisUtterance(String(text));
      speechUtterance = u;
      u.lang = 'en-US';
      u.rate = clampRate(state.settings.rate);
      u.pitch = 1.0;
      var v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang || 'en-US'; }
      u.onstart = function () {
        if (speechUtterance === u && onStart) onStart('浏览器语音' + (v ? ' · ' + v.name : ''));
      };
      u.onend = function () { if (speechUtterance === u) speechUtterance = null; };
      u.onerror = function () {
        if (speechUtterance !== u) return;
        speechUtterance = null;
        if (force) toast('浏览器未能播放朗读，请检查可用音色');
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      speechUtterance = null;
      if (force) toast('浏览器未能播放朗读');
    }
  }

  function clampRate(n) {
    n = parseFloat(n);
    if (isNaN(n)) return 0.95;
    return Math.max(0.6, Math.min(1.3, n));
  }

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t);
    }
    t.textContent = msg; t.className = 'show';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.className = ''; }, 2300);
  }
  function catStyle(cat) {
    var c = CAT_MAP[cat];
    return c ? '--cat:' + c.color : '';
  }
  function catName(cat) {
    var c = CAT_MAP[cat];
    return c ? c.name : cat;
  }
  function accuracy() {
    if (!state.totalPracticed) return 0;
    return Math.round(state.totalCorrect / state.totalPracticed * 100);
  }
  function masteredCount() {
    return Object.keys(state.progress).filter(function (id) { return state.progress[id].mastered; }).length;
  }

  /* ============================================================
   *  渲染
   * ============================================================ */
  function renderAll() {
    renderTop();
    ['today', 'bank', 'review', 'stats', 'settings'].forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('hidden', state.view !== v);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === state.view);
    });
    if (state.view === 'today') renderToday();
    else if (state.view === 'bank') renderBank();
    else if (state.view === 'review') renderReview();
    else if (state.view === 'stats') renderStats();
    else if (state.view === 'settings') renderSettings();
  }

  function renderTop() {
    var done = state.today && state.today.date === today() ? Object.keys(state.today.results || {}).length : 0;
    var total = state.today && state.today.date === today() ? state.today.queue.length : state.settings.dailyGoal;
    document.getElementById('streakBadge').innerHTML =
      '<span class="flame">◆</span> 连续 <b>' + (state.checkin.days || 0) + '</b> 天';
    document.getElementById('todayBadge').innerHTML = '今日 <b>' + done + '</b> / ' + total;
    var wc = document.getElementById('wrongCount');
    wc.textContent = state.wrongBook.length ? String(state.wrongBook.length) : '';
  }

  /* ---------- 练习卡片（通用） ---------- */
  function cleanSlotChars(str) {
    return (String(str || '').match(/[A-Za-z0-9]/g) || []).join('');
  }

  /* 将答案解析为槽位模板：字母/数字为可填槽，空格为词间分隔，连字符等为固定符号 */
  function parseAnswerTemplate(answer) {
    var raw = String(answer || '').trim().replace(/\s+/g, ' ');
    var tokens = [];
    var words = [];
    var currentWord = [];
    var seps = [];
    var slotIndex = 0;
    var spaceCount = 0;

    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      if (ch === ' ') {
        if (currentWord.length) {
          words.push(currentWord);
          currentWord = [];
        }
        tokens.push({ type: 'space', text: ' ', afterSlot: slotIndex });
        spaceCount++;
      } else if (/[A-Za-z0-9]/.test(ch)) {
        var tok = { type: 'char', slotIndex: slotIndex, expected: ch };
        tokens.push(tok);
        currentWord.push(tok);
        slotIndex++;
      } else {
        var sep = { type: 'sep', text: ch, afterSlot: slotIndex };
        tokens.push(sep);
        currentWord.push(sep);
        if (seps.indexOf(ch) === -1) seps.push(ch);
      }
    }
    if (currentWord.length) words.push(currentWord);

    return {
      raw: raw,
      tokens: tokens,
      words: words,
      seps: seps,
      slotCount: slotIndex,
      spaceCount: spaceCount
    };
  }

  /* 将用户输入的纯字母序列按模板还原为含空格与固定符号的答案字符串 */
  function assembleAnswer(tpl, letters) {
    var s = String(letters || '');
    if (!s) return '';
    var out = '';
    for (var i = 0; i < tpl.tokens.length; i++) {
      var t = tpl.tokens[i];
      if (t.type === 'char') {
        if (t.slotIndex < s.length) out += s.charAt(t.slotIndex);
      } else if (t.type === 'space' || t.type === 'sep') {
        if (s.length > t.afterSlot && t.afterSlot > 0) out += t.text;
      }
    }
    return out;
  }

  function ghostCountFor(w, hintLevel, slotCount) {
    if (w.mode === 'define') return Math.min(hintLevel >= 1 ? 2 : 1, slotCount);
    return hintLevel >= 1 ? Math.min(1, slotCount) : 0;
  }

  function inlineBlankHtml(w, s, tpl) {
    var draft = cleanSlotChars(s.draft || '').slice(0, tpl.slotCount);
    var ghostCount = ghostCountFor(w, s.hintLevel || 0, tpl.slotCount);
    var label = w.mode === 'define' ? '输入英文单词答案' : '在句子空缺处输入英文单词或词组';

    var h = '<span class="inline-blank" id="inlineBlank">';
    h += '<input class="inline-input" id="answerInput" type="text" ' +
         'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" ' +
         'inputmode="text" aria-label="' + label + '" value="' + esc(draft) + '">';
    h += '<span class="inline-slots" aria-hidden="true">';
    tpl.words.forEach(function (wordTokens, wi) {
      if (wi > 0) h += '<span class="slot-space" title="空格"></span>';
      h += '<span class="slot-word">';
      wordTokens.forEach(function (tok) {
        if (tok.type === 'char') {
          var ch = draft.charAt(tok.slotIndex);
          var ghost = tok.slotIndex < ghostCount ? tok.expected : '';
          var cls = 'slot' + (ch ? ' is-filled' : '');
          var inner = ch ? esc(ch) : (ghost ? '<span class="slot-ghost">' + esc(ghost) + '</span>' : '&nbsp;');
          h += '<span class="' + cls + '" data-slot-idx="' + tok.slotIndex + '"' +
               (ghost ? ' data-ghost="' + esc(ghost) + '"' : '') + '>' + inner + '</span>';
        } else {
          h += '<span class="slot-sep">' + esc(tok.text) + '</span>';
        }
      });
      h += '</span>';
    });
    h += '</span></span>';
    return h;
  }

  function blankMetaTip(w, tpl) {
    var parts = [];
    if (tpl.spaceCount > 0) {
      parts.push((tpl.spaceCount + 1) + ' 个词（' + tpl.slotCount + ' 个字母，' + tpl.spaceCount + ' 个空格）');
    } else {
      parts.push(tpl.slotCount + ' 个字母');
    }
    if (tpl.seps.length) parts.push('含固定符号 ' + tpl.seps.join(' '));
    if (w.mode === 'define') parts.push('首字母已给出');
    parts.push('点击空缺处直接输入，按 Enter 提交');
    return '<div class="blank-tip">' + esc(parts.join(' · ')) + '</div>';
  }

  function sentenceHtml(w, s, tpl, filled, status) {
    var blank = filled
      ? '<span class="blank ' + (status === 'ok' ? 'correct' : 'wrong') + '">' + esc(filled) + '</span>'
      : inlineBlankHtml(w, s, tpl);
    return esc(w.sentence).replace('___', blank);
  }

  /* 扩展词题面：直接在按真实词长生成的槽位上输入，首字母淡色提示消歧 */
  function maskWord(w, s, tpl, filled, status) {
    if (filled) {
      return '<span class="blank ' + (status === 'ok' ? 'correct' : 'wrong') + '">' + esc(filled) + '</span>';
    }
    return inlineBlankHtml(w, s, tpl);
  }

  function renderUserDiff(userText, answerText) {
    var u = String(userText || '');
    var a = String(answerText || '');
    var out = '';
    for (var i = 0; i < u.length; i++) {
      var ch = u.charAt(i);
      var match = i < a.length && ch.toLowerCase() === a.charAt(i).toLowerCase();
      out += match ? esc(ch) : '<mark class="diff-bad">' + esc(ch) + '</mark>';
    }
    return out;
  }

  function renderPractice(s) {
    if (s.done) return renderDone(s);
    var w = wordById(s.queue[s.idx]);
    if (!w) { s.done = true; return renderDone(s); }

    var feedback = s.phase === 'feedback';
    var ok = !!s.lastOk;
    var shownAnswer = feedback ? w.word : '';
    var isDefine = w.mode === 'define';
    var tpl = parseAnswerTemplate(w.word);

    var html = '<div class="card">';
    html += '<div class="practice-head">';
    html += '<span class="chip" style="' + catStyle(w.cat) + '"><span class="dot"></span>' + esc(catName(w.cat)) + ' · ' + esc(w.level) + '</span>';
    html += '<span class="counter">第 <b>' + (s.idx + 1) + '</b> / ' + s.queue.length + ' 题</span>';
    html += '</div>';
    html += '<div class="mode-tag ' + (isDefine ? 'define' : 'cloze') + '">' +
            (isDefine ? '释义拼词 · 看中英释义写出单词' : '场景填词 · 在具体语境中补全句子') + '</div>';

    var pct = Math.round(s.idx / s.queue.length * 100);
    html += '<div class="progress"><div class="progress-fill" style="width:' + pct + '%"></div></div>';

    if (isDefine) {
      html += '<div class="scenario-box define-box" style="' + catStyle(w.cat) + '">';
      html += '<div class="scenario-label">释义 / Definition</div>';
      html += '<p class="define-zh">' + esc(w.meaning) + '</p>';
      if (w.meaningEn) html += '<p class="define-en" lang="en">' + esc(w.meaningEn) + '</p>';
      html += '<div class="define-meta">' +
              (w.pos ? esc(w.pos) + ' · ' : '') + esc(w.level) +
              (w.frq < 999999 ? ' · 词频 #' + w.frq : '') +
              (w.tier === 'topic' ? ' · 主题词' : ' · 通用词') + '</div>';
      html += '</div>';
      html += '<div class="sentence-block">';
      html += '<div class="sentence-label"><span>根据释义写出英文单词</span>' +
              '<button class="speak-btn" data-action="speak" data-id="' + w.id + '">🔊 听读音</button></div>';
      html += '<p class="sentence sentence-define" lang="en">' + maskWord(w, s, tpl, shownAnswer, ok ? 'ok' : 'bad') + '</p>';
      if (!feedback) html += blankMetaTip(w, tpl);
      html += '</div>';
    } else {
      html += '<div class="scenario-box" style="' + catStyle(w.cat) + '">';
      html += '<div class="scenario-label">场景 / Scenario</div>';
      html += '<p>' + esc(w.scene) + '</p></div>';
      html += '<div class="sentence-block">';
      html += '<div class="sentence-label"><span>补全这句话</span>' +
              '<button class="speak-btn" data-action="speak" data-id="' + w.id + '">🔊 朗读</button></div>';
      html += '<p class="sentence" lang="en">' + sentenceHtml(w, s, tpl, shownAnswer, ok ? 'ok' : 'bad') + '</p>';
      if (!feedback) html += blankMetaTip(w, tpl);
      if (feedback) html += '<p class="sentence-zh">' + esc(w.translation) + '</p>';
      html += '</div>';
    }

    if (!feedback) {
      html += '<div class="practice-actions">';
      html += '<button class="btn primary" data-action="submit">提交</button>';
      html += '<button class="btn ghost sm" data-action="hint">' + (s.hintLevel === 0 ? '提示' : s.hintLevel === 1 ? '再给点提示' : '看答案（记为未掌握）') + '</button>';
      html += '<button class="btn soft sm" data-action="skip">不认识，看答案</button>';
      html += '</div>';
      if (s.hintLevel > 0) html += hintHtml(w, s.hintLevel, tpl);
    } else {
      html += renderFeedback(w, ok, s);
    }

    html += '</div>';
    return html;
  }

  function hintHtml(w, level, tpl) {
    tpl = tpl || parseAnswerTemplate(w.word);
    var lenDesc = tpl.spaceCount > 0
      ? '共 <b>' + (tpl.spaceCount + 1) + '</b> 个词（<b>' + tpl.slotCount + '</b> 个字母）'
      : '共 <b>' + tpl.slotCount + '</b> 个字母';
    var hint = w.mode === 'define'
      ? '前 2 个字母 <b>' + esc(w.word.slice(0, 2)) + '</b> · ' + lenDesc
      : '首字母 <b>' + esc(w.word.charAt(0)) + '</b> · ' + lenDesc;
    if (w.pos) hint += ' · ' + esc(w.pos);
    if (level >= 2) hint += '<br>音标：<b>' + esc(w.phonetic) + '</b>';
    return '<div class="hint-box">' + hint + '</div>';
  }

  function renderFeedback(w, ok, s) {
    var isDefine = w.mode === 'define';
    var h = '<div class="feedback ' + (ok ? 'ok' : 'bad') + '">';
    h += '<div class="fb-head"><span class="fb-icon">' + (ok ? '✓' : '✕') + '</span>' +
         (ok ? '答对了' : (s.lastInput ? '再记一遍' : '这个词记住它')) + '</div>';
    h += '<div class="fb-word" lang="en">' + esc(w.word) + '</div>';
    if (!ok && s.lastInput) {
      h += '<div class="fb-yours">你的填写：<span lang="en">' + renderUserDiff(s.lastInput, w.word) + '</span></div>';
    }
    if (s.synonymHit) {
      h += '<div class="fb-syn">你填的是同义词 <b lang="en">' + esc(s.synonymHit) +
           '</b>，已按答对接受；本题目标词是 <b lang="en">' + esc(w.word) +
           '</b>，建议再单独拼一次。</div>';
    }
    h += '<div class="fb-meta">' + esc(w.phonetic) + (w.pos ? ' · ' + esc(w.pos) : '') +
         ' · ' + esc(w.level) + '</div>';
    h += '<div class="fb-meaning">' + esc(w.meaning) + '</div>';
    if (w.meaningEn) h += '<div class="fb-meaning-en" lang="en">' + esc(w.meaningEn) + '</div>';
    h += '<div class="fb-grid">';
    if (!isDefine && w.collocation) {
      h += '<div class="fb-item"><span class="k">搭配</span>' + esc(w.collocation) + '</div>';
      h += '<div class="fb-item"><span class="k">整句</span><span class="fb-trans">' +
           esc(w.sentence.replace('___', '[' + w.word + ']')) + '</span></div>';
    } else {
      h += '<div class="fb-item"><span class="k">分类</span>' + esc(catName(w.cat)) +
           ' · ' + (w.tier === 'topic' ? '主题相关词' : '通用高频词') + '</div>';
      if (w.frq < 999999) h += '<div class="fb-item"><span class="k">词频</span>约 #' + w.frq +
                               '（数值越小越常用）</div>';
    }
    h += '</div>';
    h += '<div class="fb-actions">';
    h += '<button class="btn ghost sm" data-action="speak" data-id="' + w.id + '">🔊 ' +
         (isDefine ? '听单词' : '朗读整句') + '</button>';
    h += '<button class="btn primary sm" data-action="next">下一题 →</button>';
    h += '</div>';
    h += '</div>';
    return h;
  }

  var lastImeToastAt = 0;

  function bindPracticeInput(s) {
    if (!s || s.done || s.phase !== 'answering') return;
    var w = wordById(s.queue[s.idx]);
    var blank = document.getElementById('inlineBlank');
    var inp = document.getElementById('answerInput');
    if (!w || !blank || !inp) return;

    var tpl = parseAnswerTemplate(w.word);
    var slots = Array.prototype.slice.call(blank.querySelectorAll('.slot'));
    var composing = false;
    var prevVal = cleanSlotChars(inp.value).slice(0, tpl.slotCount);
    inp.value = prevVal;

    function syncSlots() {
      var val = inp.value;
      var focused = document.activeElement === inp;
      var start = inp.selectionStart == null ? val.length : inp.selectionStart;
      var end = inp.selectionEnd == null ? start : inp.selectionEnd;
      var hasSel = focused && start !== end;
      var caretAtEnd = focused && !hasSel && start >= tpl.slotCount && tpl.slotCount > 0;
      var activeIdx = (focused && !hasSel && !caretAtEnd) ? Math.min(start, tpl.slotCount - 1) : -1;

      blank.classList.toggle('is-focused', focused);
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        var ch = val.charAt(i);
        var ghost = slot.getAttribute('data-ghost') || '';
        if (ch) {
          if (slot.textContent !== ch || !slot.classList.contains('is-filled')) {
            slot.textContent = ch;
          }
          slot.classList.add('is-filled');
        } else {
          slot.classList.remove('is-filled');
          if (ghost) {
            if (!slot.querySelector('.slot-ghost')) {
              slot.innerHTML = '<span class="slot-ghost">' + esc(ghost) + '</span>';
            }
          } else if (slot.textContent !== '\u00a0') {
            slot.textContent = '\u00a0';
          }
        }
        slot.classList.toggle('is-active', i === activeIdx);
        slot.classList.toggle('is-caret-end', caretAtEnd && i === tpl.slotCount - 1);
        slot.classList.toggle('is-selected', hasSel && i >= start && i < end);
      }
    }

    function normalizeInput() {
      var raw = inp.value;
      var caret = inp.selectionStart == null ? raw.length : inp.selectionStart;
      if (/[\u4e00-\u9fff]/.test(raw) && Date.now() - lastImeToastAt > 4000) {
        lastImeToastAt = Date.now();
        toast('请切换英文输入法');
      }
      var beforeCaret = cleanSlotChars(raw.slice(0, caret));
      var cleaned = cleanSlotChars(raw);
      var newCaret = beforeCaret.length;

      // 已填满槽位时，若在中间输入单个字母，覆盖原位置字母而不挤掉末尾
      if (prevVal.length === tpl.slotCount && cleaned.length === tpl.slotCount + 1 &&
          newCaret > 0 && newCaret <= tpl.slotCount) {
        cleaned = cleaned.slice(0, newCaret) + cleaned.slice(newCaret + 1);
      }
      if (cleaned.length > tpl.slotCount) {
        cleaned = cleaned.slice(0, tpl.slotCount);
      }
      if (newCaret > cleaned.length) newCaret = cleaned.length;

      if (inp.value !== cleaned) {
        inp.value = cleaned;
        try { inp.setSelectionRange(newCaret, newCaret); } catch (e) {}
      }
      prevVal = cleaned;
      s.draft = cleaned;
      syncSlots();
    }

    function focusAt(pos) {
      var p = Math.max(0, Math.min(pos, inp.value.length));
      inp.focus();
      try { inp.setSelectionRange(p, p); } catch (e) {}
      syncSlots();
    }

    function onBlankPointer(e) {
      var slotEl = e.target.closest('.slot');
      var targetPos = inp.value.length;
      if (slotEl) {
        var idx = parseInt(slotEl.getAttribute('data-slot-idx'), 10);
        if (!isNaN(idx)) {
          if (idx < inp.value.length) {
            var rect = slotEl.getBoundingClientRect();
            targetPos = (e.clientX > rect.left + rect.width * 0.6) ? idx + 1 : idx;
          } else {
            targetPos = inp.value.length;
          }
        }
      }
      focusAt(targetPos);
    }

    blank.addEventListener('mousedown', function (e) {
      e.preventDefault();
      onBlankPointer(e);
    });
    blank.addEventListener('click', function (e) {
      onBlankPointer(e);
    });

    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () {
      composing = false;
      normalizeInput();
    });
    inp.addEventListener('input', function () {
      if (composing) return;
      normalizeInput();
    });
    inp.addEventListener('keydown', function (e) {
      if (composing) return;
      if (e.key === 'Enter') {
        onAnswerKey(e);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
        setTimeout(syncSlots, 0);
      }
    });
    inp.addEventListener('keyup', syncSlots);
    inp.addEventListener('select', syncSlots);
    inp.addEventListener('focus', syncSlots);
    inp.addEventListener('blur', syncSlots);

    focusAt(inp.value.length);
  }

  function renderDone(s) {
    var correct = 0, total = s.queue.length;
    if (s.mode === 'daily') {
      var rs = (state.today && state.today.results) || {};
      s.queue.forEach(function (id) { if (rs[id] === 'ok') correct++; });
    } else {
      correct = s.correctCount || 0;
    }
    var rate = total ? Math.round(correct / total * 100) : 0;
    var h = '<div class="card"><div class="done">';
    h += '<div class="done-ring">✓</div>';
    h += '<h2>' + (s.mode === 'daily' ? '今日任务完成' : (s.mode === 'review' ? '复习完成' : '加练完成')) + '</h2>';
    h += '<p>' + (rate >= 80 ? '状态不错，保持这个节奏。' : rate >= 50 ? '错词已进错词本，明天会优先安排。' : '别急，慢就是快，明天再见一次。') + '</p>';
    h += '<div class="done-stats">';
    h += '<div class="done-stat"><b>' + total + '</b><span>完成题数</span></div>';
    h += '<div class="done-stat"><b>' + rate + '%</b><span>正确率</span></div>';
    h += '<div class="done-stat"><b>' + masteredCount() + '</b><span>累计掌握</span></div>';
    h += '</div><div class="done-actions">';
    h += '<button class="btn primary" data-action="extra">再来一组</button>';
    if (state.wrongBook.length) h += '<button class="btn ghost" data-action="go-review">复习错词 (' + state.wrongBook.length + ')</button>';
    h += '<button class="btn soft" data-action="go-stats">查看统计</button>';
    h += '</div></div></div>';
    return h;
  }

  /* ---------- 今日练习 ---------- */
  function renderToday() {
    if (!session || session.view !== 'today') session = makeDailySession();
    document.getElementById('todayMount').innerHTML = renderPractice(session);
    var inp = document.getElementById('answerInput');
    if (inp && session.phase === 'answering') {
      inp.focus();
      inp.addEventListener('keydown', onAnswerKey);
    }
  }

  /* ---------- 词库（分页渲染，避免 12000 条 DOM 卡顿） ---------- */
  var BANK_PAGE_SIZE = 40;
  var bankFilter = { cat: 'all', layer: 'all', q: '' };
  var bankOpen = {};
  var bankPage = 0;

  function renderBank() {
    var h = '<div class="card">';
    h += '<h3 class="section-title">词库</h3>';
    h += '<p class="section-sub">共 ' + BANK.length + ' 词（精编场景 ' + CORE_COUNT +
         ' + 扩展释义 ' + (BANK.length - CORE_COUNT) + '）· 四类各 3000 词，点开任一条查看详情</p>';
    h += '<div class="bank-toolbar">';
    h += '<input class="search-input" id="bankSearch" type="search" placeholder="搜索单词、中文或英文释义…" value="' + esc(bankFilter.q) + '">';
    h += '<div class="filter-chips">';
    h += '<button class="filter-chip' + (bankFilter.cat === 'all' ? ' active' : '') + '" data-action="bank-filter" data-cat="all">全部</button>';
    CATS.forEach(function (c) {
      h += '<button class="filter-chip' + (bankFilter.cat === c.id ? ' active' : '') + '" data-action="bank-filter" data-cat="' + c.id + '">' + esc(c.name) + '</button>';
    });
    h += '</div><div class="filter-chips layer-chips">';
    [['all', '全部层级'], ['cloze', '精编场景'], ['define', '扩展释义']].forEach(function (x) {
      h += '<button class="filter-chip' + (bankFilter.layer === x[0] ? ' active' : '') +
           '" data-action="bank-layer" data-layer="' + x[0] + '">' + x[1] + '</button>';
    });
    h += '</div></div>';
    h += '<div class="bank-count" id="bankCount"></div>';
    h += '<div class="word-list" id="wordList"></div>';
    h += '<div class="pager" id="bankPager"></div>';
    h += '</div>';
    document.getElementById('bankMount').innerHTML = h;
    var si = document.getElementById('bankSearch');
    if (si) si.addEventListener('input', function () {
      bankFilter.q = this.value.trim();
      bankPage = 0;
      renderBankList();
    });
    renderBankList();
  }

  function bankMatches() {
    var q = bankFilter.q.toLowerCase();
    return BANK.filter(function (w) {
      if (bankFilter.cat !== 'all' && w.cat !== bankFilter.cat) return false;
      if (bankFilter.layer !== 'all' && w.mode !== bankFilter.layer) return false;
      if (!q) return true;
      return (w.word + ' ' + w.meaning + ' ' + w.meaningEn + ' ' + w.scene + ' ' + w.collocation + ' ' + w.sentence)
        .toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderBankList() {
    var list = bankMatches();
    var pages = Math.max(1, Math.ceil(list.length / BANK_PAGE_SIZE));
    if (bankPage >= pages) bankPage = pages - 1;
    var cnt = document.getElementById('bankCount');
    if (cnt) cnt.textContent = '匹配 ' + list.length + ' 词' +
      (bankFilter.q ? '（搜索：' + bankFilter.q + '）' : '') +
      ' · 第 ' + (bankPage + 1) + ' / ' + pages + ' 页';

    var box = document.getElementById('wordList');
    var pager = document.getElementById('bankPager');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="empty"><div class="empty-mark">?</div><h3>没有匹配的词</h3><p>换个关键词或切换分类试试</p></div>';
      if (pager) pager.innerHTML = '';
      return;
    }

    var pageItems = list.slice(bankPage * BANK_PAGE_SIZE, (bankPage + 1) * BANK_PAGE_SIZE);
    var h = '';
    pageItems.forEach(function (w) {
      var p = getP(w.id);
      var st = p.mastered ? 'mastered' : (p.seen > 0 ? 'learning' : 'new');
      var stTxt = p.mastered ? '已掌握' : (p.seen > 0 ? '学习中' : '未学');
      h += '<div class="word-item">';
      h += '<div class="word-row" data-action="bank-toggle" data-id="' + w.id + '">';
      h += '<div class="word-main"><div><span class="word-name">' + esc(w.word) + '</span>' +
           '<span class="word-ph">' + esc(w.phonetic) + '</span><span class="word-pos">' + esc(w.pos) + '</span></div>' +
           '<div class="word-meaning">' + esc(w.meaning) + '</div></div>';
      h += '<div class="word-tags"><span class="tag-cat" style="' + catStyle(w.cat) + '">' + esc(catName(w.cat)) + '</span>' +
           '<span class="tag-layer ' + w.mode + '">' + (w.mode === 'cloze' ? '精编' : '释义') + '</span>' +
           '<span class="tag-status ' + st + '">' + stTxt + '</span></div>';
      h += '</div>';
      if (bankOpen[w.id]) {
        h += '<div class="word-detail">';
        if (w.mode === 'cloze') {
          h += '<div class="wd-block"><div class="wd-k">场景</div><div class="wd-text">' + esc(w.scene) + '</div></div>';
          h += '<div class="wd-block"><div class="wd-k">目标句</div><div class="wd-sentence">' +
               esc(w.sentence).replace('___', '<em>' + esc(w.word) + '</em>') + '</div>' +
               '<div class="wd-text">' + esc(w.translation) + '</div></div>';
          h += '<div class="wd-block"><div class="wd-k">英文释义 / 搭配</div><div class="wd-text">' +
               esc(w.meaningEn) + '<br>' + esc(w.collocation) + '</div></div>';
        } else {
          h += '<div class="wd-block"><div class="wd-k">中文释义</div><div class="wd-text">' + esc(w.meaning) + '</div></div>';
          if (w.meaningEn) h += '<div class="wd-block"><div class="wd-k">英文释义</div><div class="wd-text">' + esc(w.meaningEn) + '</div></div>';
          h += '<div class="wd-block"><div class="wd-k">词条信息</div><div class="wd-text">' +
               esc(w.level) + ' · ' + (w.tier === 'topic' ? '主题相关词' : '通用高频词') +
               (w.frq < 999999 ? ' · 词频 #' + w.frq : '') + '</div></div>';
        }
        h += '<div class="wd-actions">';
        h += '<button class="btn ghost sm" data-action="speak" data-id="' + w.id + '">🔊 ' +
             (w.mode === 'cloze' ? '朗读' : '听读音') + '</button>';
        h += '<button class="btn primary sm" data-action="bank-practice" data-id="' + w.id + '">练这一条 →</button>';
        h += '</div></div>';
      }
      h += '</div>';
    });
    box.innerHTML = h;

    if (pager) {
      var ph = '<button class="btn ghost sm" data-action="bank-page" data-delta="-1"' +
               (bankPage <= 0 ? ' disabled' : '') + '>← 上一页</button>';
      ph += '<span class="pager-info">' + (bankPage + 1) + ' / ' + pages + '</span>';
      ph += '<button class="btn ghost sm" data-action="bank-page" data-delta="1"' +
            (bankPage >= pages - 1 ? ' disabled' : '') + '>下一页 →</button>';
      pager.innerHTML = ph;
    }
  }

  /* ---------- 错词本 ---------- */
  function renderReview() {
    if (session && session.view === 'review' && !session.done) {
      document.getElementById('reviewMount').innerHTML = renderPractice(session);
      var inp = document.getElementById('answerInput');
      if (inp && session.phase === 'answering') { inp.focus(); inp.addEventListener('keydown', onAnswerKey); }
      return;
    }
    if (session && session.view === 'review' && session.done) {
      document.getElementById('reviewMount').innerHTML = renderDone(session);
      return;
    }
    var ids = state.wrongBook.slice();
    var h = '<div class="card">';
    h += '<div class="review-head"><div><h3 class="section-title">错词本</h3>' +
         '<p>答错或跳过的词会自动进这里，复习答对即移出。</p></div>' +
         (ids.length ? '<button class="btn primary" data-action="start-review">开始复习 (' + ids.length + ') →</button>' : '') +
         '</div>';
    if (!ids.length) {
      h += '<div class="empty"><div class="empty-mark">✓</div><h3>错词本是空的</h3>' +
           '<p>要么全答对了，要么还没开始练 —— 两种情况都挺好。</p>' +
           '<button class="btn primary" data-action="go-today">去今日练习</button></div>';
    } else {
      h += '<div class="word-list">';
      ids.forEach(function (id) {
        var w = wordById(id);
        if (!w) return;
        var p = getP(id);
        h += '<div class="word-item"><div class="word-row">';
        h += '<div class="word-main"><div><span class="word-name">' + esc(w.word) + '</span>' +
             '<span class="word-ph">' + esc(w.phonetic) + '</span></div>' +
             '<div class="word-meaning">' + esc(w.meaning) + ' · 错 ' + p.wrong + ' 次</div></div>';
        h += '<div class="word-tags"><span class="tag-cat" style="' + catStyle(w.cat) + '">' + esc(catName(w.cat)) + '</span></div>';
        h += '</div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    document.getElementById('reviewMount').innerHTML = h;
  }

  /* ---------- 统计 ---------- */
  function renderStats() {
    var done = state.today && state.today.date === today() ? Object.keys(state.today.results || {}).length : 0;
    var goal = state.today && state.today.date === today() ? state.today.queue.length : state.settings.dailyGoal;
    var h = '<div class="stat-grid">';
    h += '<div class="stat-card accent"><b>' + done + '/' + goal + '</b><span>今日完成</span></div>';
    h += '<div class="stat-card"><b>' + masteredCount() + '</b><span>已掌握词汇</span></div>';
    h += '<div class="stat-card"><b>' + state.totalPracticed + '</b><span>累计练习次数</span></div>';
    h += '<div class="stat-card"><b>' + accuracy() + '%</b><span>总体正确率</span></div>';
    h += '</div>';

    h += '<div class="card"><h3 class="section-title">分类掌握进度</h3>' +
         '<p class="section-sub">连续答对 2 次记为已掌握，7 天后自动安排回顾 · 每类 3000 词</p>';
    var tally = {};
    CATS.forEach(function (c) { tally[c.id] = { total: 0, mastered: 0, seen: 0 }; });
    BANK.forEach(function (w) {
      var t = tally[w.cat]; if (!t) return;
      t.total++;
      var p = state.progress[w.id];
      if (p) { if (p.mastered) t.mastered++; if (p.seen > 0) t.seen++; }
    });
    CATS.forEach(function (c) {
      var t = tally[c.id];
      var pct = t.total ? Math.round(t.mastered / t.total * 100) : 0;
      h += '<div class="bar-row"><span class="bar-name">' + esc(c.name) + '</span>' +
           '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%;background:' + c.color + '"></span></span>' +
           '<span class="bar-num">' + t.mastered + ' / ' + t.total + '</span></div>';
    });
    h += '</div>';

    h += '<div class="card"><h3 class="section-title">近 7 天练习量</h3>' +
         '<p class="section-sub">连续打卡 ' + (state.checkin.days || 0) + ' 天 · 柱子高度 = 当天完成题数</p>';
    var days = [], max = 1;
    for (var i = 6; i >= 0; i--) {
      var d = addDays(today(), -i);
      var v = state.history[d] ? state.history[d].done : 0;
      if (v > max) max = v;
      days.push({ d: d, v: v, isToday: i === 0 });
    }
    h += '<div class="week-chart">';
    days.forEach(function (x) {
      var pct = Math.round(x.v / max * 100);
      h += '<div class="week-col' + (x.isToday ? ' today' : '') + '">' +
           '<div class="week-bar' + (x.v ? ' has' : '') + '" style="height:' + Math.max(pct, 3) + '%" title="' + x.d + '：' + x.v + ' 题"></div>' +
           '<span>' + x.d.slice(5) + '</span></div>';
    });
    h += '</div></div>';
    document.getElementById('statsMount').innerHTML = h;
  }

  /* ---------- 设置 ---------- */
  function renderSettings() {
    var g = state.settings.dailyGoal;
    var h = '<div class="card"><h3 class="section-title">学习设置</h3>' +
            '<p class="section-sub">修改后立即生效：今日已答结果保留，未答部分按新设置重排</p>';

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>每天学多少词</h4><p>默认 10 词，范围 1–60。调整后今日剩余题目立即按新数量重排。</p></div>' +
         '<div class="setting-control"><div class="goal-control">' +
         '<input class="goal-input" id="goalInput" type="number" min="1" max="60" value="' + g + '">' +
         '<span class="goal-unit">词 / 天</span></div><div class="quick-btns">';
    [5, 10, 15, 20, 30].forEach(function (n) {
      h += '<button class="quick' + (g === n ? ' active' : '') + '" data-action="goal-quick" data-n="' + n + '">' + n + '</button>';
    });
    h += '</div></div></div>';

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>练习场景</h4><p>四类各 3000 词；至少保留一类，队列会在所选类别间自动交替。</p></div>' +
         '<div class="setting-control"><div class="cat-toggles">';
    CATS.forEach(function (c) {
      var on = state.settings.cats.indexOf(c.id) !== -1;
      h += '<button class="cat-toggle' + (on ? ' on' : '') + '" style="' + catStyle(c.id) + '" ' +
           'data-action="toggle-cat" data-cat="' + c.id + '"><span class="box"></span>' + esc(c.name) + '</button>';
    });
    h += '</div></div></div>';

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>练习范围</h4><p>精编场景题是手写语境句；扩展释义题来自真实词典，看中英释义拼出单词。</p></div>' +
         '<div class="setting-control"><select class="voice-select" id="scopeSelect">' +
         '<option value="mixed"' + (state.settings.scope === 'mixed' ? ' selected' : '') + '>混合（约 1/3 场景 + 2/3 释义）</option>' +
         '<option value="cloze"' + (state.settings.scope === 'cloze' ? ' selected' : '') + '>仅精编场景填词（' + CORE_COUNT + ' 词）</option>' +
         '<option value="define"' + (state.settings.scope === 'define' ? ' selected' : '') + '>仅扩展释义拼词（' + (BANK.length - CORE_COUNT) + ' 词）</option>' +
         '</select></div></div>';

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>词汇难度</h4><p>按真实词频过滤扩展词，避免一上来就撞上生僻词；精编场景题始终保留。</p></div>' +
         '<div class="setting-control"><select class="voice-select" id="freqBandSelect">' +
         '<option value="core"' + (state.settings.freqBand === 'core' ? ' selected' : '') + '>常用核心（词频 ≤ 5000）</option>' +
         '<option value="advanced"' + (state.settings.freqBand === 'advanced' ? ' selected' : '') + '>进阶（词频 ≤ 15000）</option>' +
         '<option value="all"' + (state.settings.freqBand === 'all' ? ' selected' : '') + '>全量（含低频词）</option>' +
         '</select></div></div>';

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>朗读音色</h4><p>BreezeTTS · Alma（美式女声）已预生成 ' + BREEZE_SENTENCE_COUNT + ' 条例句和 ' +
         BREEZE_WORD_COUNT + ' 个单词。' + (cloudEnabled ? '开通云端点读后，未覆盖的题也可手动点读。' : '未覆盖的题沿用原发音。') +
         '下方浏览器音色也用于回退。</p></div>' +
         '<div class="setting-control"><div class="voice-controls">' +
         '<select class="voice-select" id="ttsVoice" aria-label="朗读音色">' +
         '<option value="breeze"' + (state.settings.ttsVoice === 'breeze' ? ' selected' : '') + '>优先 BreezeTTS · Alma</option>' +
         '<option value="aria"' + (state.settings.ttsVoice === 'aria' ? ' selected' : '') + '>神经语音 · Aria（女声）</option>' +
         '<option value="guy"' + (state.settings.ttsVoice === 'guy' ? ' selected' : '') + '>神经语音 · Guy（男声）</option>' +
         '<option value="browser"' + (state.settings.ttsVoice === 'browser' ? ' selected' : '') + '>浏览器语音</option>' +
         '</select>' +
         '<select class="voice-select" id="browserVoice" aria-label="浏览器语音音色">' +
         '<option value="">自动选择浏览器语音</option>' +
         browserVoiceOptions().map(function (v) {
           return '<option value="' + esc(v.voiceURI) + '"' +
                  (state.settings.browserVoiceURI === v.voiceURI ? ' selected' : '') + '>' +
                  esc(v.name) + (v.localService === false ? ' · 在线' : ' · 本地') + '</option>';
         }).join('') +
         '</select>' +
         '<button class="btn ghost sm" data-action="preview-voice" data-id="b01">试听例句</button>' +
         '<button class="btn ghost sm" data-action="preview-voice" data-id="x00494">试听单词</button>' +
         '</div></div></div>';

    if (cloudEnabled) {
      h += '<div class="setting-row"><div class="setting-info">' +
           '<h4>云端点读</h4><p>填入站点口令（不是 Breeze API Key），仅在当前标签页保留。' +
           '缺少预生成音频时，手动点读才会请求云端；答对后自动朗读不会使用云端额度。</p></div>' +
           '<div class="setting-control"><form id="cloudAccessForm" class="voice-controls">' +
           '<input class="voice-select" id="cloudAccess" type="password" maxlength="256" autocomplete="off" ' +
           'aria-label="站点朗读口令" placeholder="' + (accessToken ? '已设置，可重新输入' : '输入站点朗读口令') + '">' +
           '<button type="submit" class="btn ghost sm">启用</button>' +
           (accessToken ? '<button type="button" class="btn ghost sm" data-action="clear-tts-access">关闭</button>' +
             '<button type="button" class="btn ghost sm" data-action="preview-voice" data-id="b04">试听云端</button>' : '') +
           '</form></div></div>';
    }

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>语速</h4><p>仅对浏览器语音生效（包括回退）；预生成音频使用固定语速。</p></div>' +
         '<div class="setting-control"><div class="rate-control">' +
         '<input type="range" id="rateRange" min="0.7" max="1.2" step="0.05" value="' + clampRate(state.settings.rate) + '">' +
         '<span class="rate-val" id="rateVal">' + clampRate(state.settings.rate).toFixed(2) + '×</span>' +
         '</div></div></div>';

    h += '<div class="setting-row"><div class="setting-info">' +
         '<h4>答对后自动朗读</h4><p>场景题读整句，释义题读单词。手动朗读不受此开关限制。</p></div>' +
         '<div class="setting-control"><button class="switch' + (state.settings.speech ? ' on' : '') + '" ' +
         'data-action="toggle-speech" aria-label="自动朗读开关"></button></div></div>';
    h += '</div>';

    h += '<div class="card"><h3 class="section-title">数据管理</h3>' +
         '<p class="section-sub">全部数据只存在这台设备的浏览器里，零云端。换设备或清缓存前，请先导出备份。</p>' +
         '<div class="setting-row"><div class="setting-info"><h4>导出 / 导入进度</h4>' +
         '<p>导出为 JSON 文件，包含进度、错词本、打卡与设置。</p></div>' +
         '<div class="setting-control"><div class="data-actions">' +
         '<button class="btn ghost sm" data-action="export">导出备份</button>' +
         '<button class="btn ghost sm" data-action="import">导入备份</button>' +
         '<input type="file" id="importFile" accept=".json,application/json" class="hidden">' +
         '</div></div></div>' +
         '<div class="setting-row"><div class="setting-info"><h4>导出词库表格</h4>' +
         '<p>把全部 ' + BANK.length + ' 词导出为 CSV（snake_case 字段，含掌握状态），可用 Excel / 表格打开。</p></div>' +
         '<div class="setting-control"><div class="data-actions">' +
         '<button class="btn ghost sm" data-action="export-csv">导出 CSV</button>' +
         '</div></div></div>' +
         '<div class="setting-row"><div class="setting-info"><h4>重置全部进度</h4>' +
         '<p>清空学习记录、错词本与打卡，设置保留。此操作不可撤销。</p></div>' +
         '<div class="setting-control"><button class="btn danger sm" data-action="reset">重置进度</button></div></div>' +
         '</div>';

    h += '<div class="card"><h3 class="section-title">关于</h3>' +
         '<p class="section-sub" style="margin-bottom:0">Cloze · 场景填词 · 四类各 ' +
         Math.round(BANK.length / CATS.length) + ' 词，共 ' + BANK.length + ' 词：精编场景 ' +
         CORE_COUNT + ' 条（手写语境句 + 神经网络语音 mp3，女声 / 男声各一套），扩展释义 ' +
         (BANK.length - CORE_COUNT) + ' 条（数据源 ECDICT 开源词典，无编造例句，部分单词已有 BreezeTTS 音频）。' +
         (cloudEnabled ? '学习进度只保存在本机。云端点读通过 Cloudflare 后端生成音频，后续点读可复用。' :
           '此本地版本无需后端，预生成音频从网站文件加载。') +
         '页面打开后断网仍可答题；语音能否离线播放取决于文件是否可用或浏览器是否安装了本地音色。' +
         '每日队列会优先安排到期复习（最多 1/4 配额）；释义题接受同义词，并在反馈中标出本题目标词。</p></div>';

    document.getElementById('settingsMount').innerHTML = h;
    var gi = document.getElementById('goalInput');
    if (gi) gi.addEventListener('change', function () {
      var n = clampGoal(this.value);
      this.value = n;
      setGoal(n);
    });
    var sc = document.getElementById('scopeSelect');
    if (sc) sc.addEventListener('change', function () {
      setScope(this.value);
    });
    var fb = document.getElementById('freqBandSelect');
    if (fb) fb.addEventListener('change', function () {
      if (['all', 'advanced', 'core'].indexOf(this.value) === -1) return;
      if (state.settings.freqBand === this.value) return;
      state.settings.freqBand = this.value;
      regenerateQueue();
      save(); renderSettings(); renderTop();
      toast('词汇难度已切换并立即生效');
    });
    var tv = document.getElementById('ttsVoice');
    if (tv) tv.addEventListener('change', function () {
      stopAudio();
      state.settings.ttsVoice = this.value;
      save(); renderSettings();
    });
    var form = document.getElementById('cloudAccessForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = document.getElementById('cloudAccess').value.trim();
      if (value.length < 24 || !/^[!-~]+$/.test(value)) { toast('请输入有效的站点朗读口令'); return; }
      stopAudio();
      accessToken = value;
      try { sessionStorage.setItem('cloze_tts_access', value); } catch (err) {}
      state.settings.ttsVoice = 'breeze';
      save(); renderSettings();
      toast('已启用云端点读，可点击「试听云端」验证');
    });
    var bv = document.getElementById('browserVoice');
    if (bv) bv.addEventListener('change', function () {
      state.settings.browserVoiceURI = this.value;
      save();
    });
    var rr = document.getElementById('rateRange');
    if (rr) {
      rr.addEventListener('input', function () {
        var lab = document.getElementById('rateVal');
        if (lab) lab.textContent = parseFloat(this.value).toFixed(2) + '×';
      });
      rr.addEventListener('change', function () {
        state.settings.rate = clampRate(this.value);
        save();
      });
    }
    var fi = document.getElementById('importFile');
    if (fi) fi.addEventListener('change', function () {
      if (this.files && this.files[0]) importData(this.files[0]);
      this.value = '';
    });
  }

  /* 设置变更后立即生效：保留已答结果，只重排剩余题目。
   * 已完成的题放队列前部，保证 session.idx（= 结果数）正好指向第一道未答题。 */
  function regenerateQueue() {
    if (!state.today || state.today.date !== today()) return;
    var doneIds = Object.keys(state.today.results || {});
    var remaining = state.settings.dailyGoal - doneIds.length;
    if (remaining <= 0) {
      // 新目标 <= 已答题数：今日队列收敛为已答部分，直接判定完成并补打卡
      state.today.queue = doneIds.slice();
      if (state.checkin.lastDate !== today()) markCheckin();
    } else {
      state.today.queue = doneIds.concat(buildQueue(remaining, doneIds));
    }
    // 只重建正在进行的「每日练习」会话；加练 / 错词复习 / 词库单条练习不打断
    if (session && session.view === 'today' && session.mode === 'daily') {
      session = makeDailySession();
    }
  }

  function setScope(v) {
    if (['mixed', 'cloze', 'define'].indexOf(v) === -1) return;
    if (state.settings.scope === v) return;
    state.settings.scope = v;
    regenerateQueue();
    save();
    renderSettings();
    renderTop();
    toast('练习范围已切换并立即生效');
  }

  function setGoal(n) {
    if (state.settings.dailyGoal === n) return;
    state.settings.dailyGoal = n;
    regenerateQueue();
    save();
    renderSettings();
    renderTop();
    toast('每日词量已设为 ' + n + ' 词');
  }

  /* ============================================================
   *  交互
   * ============================================================ */
  function submitAnswer(skip) {
    if (!session || session.done || session.phase !== 'answering') return;
    var w = wordById(session.queue[session.idx]);
    if (!w) return;
    var inp = document.getElementById('answerInput');
    var val = skip ? '' : (inp ? inp.value : '');
    if (!skip && !normalize(val)) { if (inp) inp.focus(); return; }
    var ok = skip ? false : isCorrect(val, w);

    session.lastInput = skip ? '' : val;
    session.lastOk = ok;
    session.synonymHit = skip ? '' : synonymOf(val, w);
    session.phase = 'feedback';
    if (session.mode !== 'daily') {
      if (!session.correctCount) session.correctCount = 0;
      if (ok) session.correctCount++;
    }
    record(w, ok, !!skip);
    if (ok) speak(w, false);
    rerenderPractice();
  }

  function nextQuestion() {
    if (!session) return;
    stopAudio();
    session.idx++;
    session.phase = 'answering';
    session.lastOk = null;
    session.lastInput = '';
    session.synonymHit = '';
    session.hintLevel = 0;
    if (session.idx >= session.queue.length) session.done = true;
    rerenderPractice();
  }

  function rerenderPractice() {
    if (session.view === 'today') renderToday();
    else renderReview();
    renderTop();
  }

  function giveHint() {
    if (!session || session.phase !== 'answering') return;
    // 第 3 级原本直接显示答案，用户照抄提交会被记为「答对」，导致掌握率虚高。
    // 改为按「跳过」结算：反馈页本来就会完整展示答案、音标与释义。
    if (session.hintLevel >= 2) {
      submitAnswer(true);
      toast('已显示答案，本题记为未掌握');
      return;
    }
    session.hintLevel++;
    renderToday_orReview();
  }
  function renderToday_orReview() {
    if (session.view === 'today') renderToday(); else renderReview();
  }

  function startExtra() {
    var exclude = (state.today && state.today.date === today()) ? state.today.queue.slice() : [];
    var q = buildQueue(state.settings.dailyGoal, exclude.length < BANK.length ? exclude : null);
    session = { view: 'today', mode: 'extra', queue: q, idx: 0, done: false,
                phase: 'answering', lastOk: null, lastInput: '', hintLevel: 0, correctCount: 0 };
    state.view = 'today'; save(); renderAll();
  }

  function startReview() {
    var q = state.wrongBook.slice();
    if (!q.length) { toast('错词本是空的'); return; }
    // 错得多的排前面
    q.sort(function (a, b) { return getP(b).wrong - getP(a).wrong; });
    session = { view: 'review', mode: 'review', queue: q, idx: 0, done: false,
                phase: 'answering', lastOk: null, lastInput: '', hintLevel: 0, correctCount: 0 };
    state.view = 'review'; save(); renderAll();
  }

  function practiceOne(id) {
    session = { view: 'today', mode: 'extra', queue: [id], idx: 0, done: false,
                phase: 'answering', lastOk: null, lastInput: '', hintLevel: 0, correctCount: 0 };
    state.view = 'today'; save(); renderAll();
  }

  function switchView(v) {
    if (state.view !== v) stopAudio();
    state.view = v;
    if (v === 'today') {
      if (!session || session.view !== 'today') session = makeDailySession();
      // 从词库单条练习返回时，若已完成则回到今日主队列
      if (session.done && session.mode === 'extra') session = makeDailySession();
    } else if (v === 'review') {
      // 只清掉每日练习会话；加练 / 单条练习保留，避免返回时丢队列
      if (session && session.view !== 'review' && session.mode === 'daily') session = null;
    } else {
      if (session && session.done) session = null;
    }
    save(); renderAll();
  }

  function onAnswerKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!session) return;
    if (session.phase === 'answering') submitAnswer(false);
    else nextQuestion();
  }

  /* ---------- 导入导出 ---------- */
  function exportData() {
    try {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'cloze-backup-' + today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('备份已导出');
    } catch (e) { toast('导出失败：' + e.message); }
  }

  /* 词库全量 CSV 导出：snake_case 字段，含掌握状态，可直接用表格软件打开 */
  function exportCsv() {
    try {
      var cols = ['id', 'category', 'word', 'phonetic', 'pos', 'meaning_zh', 'meaning_en',
                  'level', 'mode', 'tier', 'freq_rank', 'seen', 'correct', 'wrong',
                  'mastered', 'sync_state', 'updated_at'];
      var lines = [cols.join(',')];
      var stamp = today();
      function cell(v) {
        var s = String(v == null ? '' : v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? '"' + s + '"' : s;
      }
      BANK.forEach(function (w) {
        var p = getP(w.id);
        lines.push([
          w.id, catName(w.cat), w.word, w.phonetic, w.pos, w.meaning, w.meaningEn,
          w.level, w.mode, w.tier, w.frq < 999999 ? w.frq : '',
          p.seen || 0, p.correct || 0, p.wrong || 0, p.mastered ? 1 : 0,
          'local', stamp
        ].map(cell).join(','));
      });
      var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'cloze-wordbank-' + today() + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('已导出 ' + BANK.length + ' 词 CSV');
    } catch (e) { toast('导出失败：' + e.message); }
  }

  function importData(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || typeof d !== 'object' || Array.isArray(d) ||
            !d.settings || typeof d.settings !== 'object' ||
            !d.progress || typeof d.progress !== 'object') throw new Error('格式不正确');
        localStorage.setItem(STORE_KEY, JSON.stringify(d));
        state = load();
        session = null;
        renderAll();
        toast('导入成功，进度已恢复');
      } catch (e) { toast('导入失败：文件格式不正确'); }
    };
    r.readAsText(file);
  }

  function resetProgress() {
    if (!window.confirm('确定重置全部学习进度吗？\n将清空练习记录、错词本、打卡与统计，且不可撤销。\n（设置项会保留，建议先导出备份）')) return;
    var s = state.settings;
    state = defaults();
    state.settings = s;
    session = null;
    save(); renderAll();
    toast('进度已重置');
  }

  /* ---------- 事件委托 ---------- */
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (tab) { switchView(tab.getAttribute('data-view')); return; }

    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.getAttribute('data-action');

    switch (a) {
      case 'submit': submitAnswer(false); break;
      case 'skip': submitAnswer(true); break;
      case 'next': nextQuestion(); break;
      case 'hint': giveHint(); break;
      case 'speak': {
        var sw = wordById(el.getAttribute('data-id'));
        if (sw) speak(sw, true);
        break;
      }
      case 'extra': startExtra(); break;
      case 'go-review': switchView('review'); break;
      case 'go-stats': switchView('stats'); break;
      case 'go-today': switchView('today'); break;
      case 'start-review': startReview(); break;
      case 'bank-filter':
        bankFilter.cat = el.getAttribute('data-cat'); bankPage = 0; renderBank(); break;
      case 'bank-layer':
        bankFilter.layer = el.getAttribute('data-layer'); bankPage = 0; renderBank(); break;
      case 'bank-page':
        bankPage += parseInt(el.getAttribute('data-delta'), 10);
        renderBankList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'bank-toggle':
        var id = el.getAttribute('data-id');
        bankOpen[id] = !bankOpen[id]; renderBankList(); break;
      case 'bank-practice': practiceOne(el.getAttribute('data-id')); break;
      case 'goal-quick': setGoal(parseInt(el.getAttribute('data-n'), 10)); break;
      case 'toggle-cat': {
        var c = el.getAttribute('data-cat');
        var i = state.settings.cats.indexOf(c);
        if (i !== -1) {
          if (state.settings.cats.length === 1) { toast('至少保留一个场景'); return; }
          state.settings.cats.splice(i, 1);
        } else state.settings.cats.push(c);
        // 与 setScope / setGoal 一致：保留已答结果，只重排剩余题目
        regenerateQueue();
        save(); renderSettings(); renderTop(); break;
      }
      case 'toggle-speech':
        state.settings.speech = !state.settings.speech; save(); renderSettings(); break;
      case 'clear-tts-access':
        stopAudio(); accessToken = '';
        try { sessionStorage.removeItem('cloze_tts_access'); } catch (err) {}
        renderSettings(); toast('已关闭云端点读'); break;
      case 'preview-voice': {
        loadVoices();
        speak(wordById(el.getAttribute('data-id')), true, function (source) {
          toast('正在试听：' + source);
        });
        break;
      }
      case 'export': exportData(); break;
      case 'export-csv': exportCsv(); break;
      case 'import': {
        var f = document.getElementById('importFile');
        if (f) f.click();
        break;
      }
      case 'reset': resetProgress(); break;
    }
  });

  /* 全局键盘：反馈阶段按 Enter 进入下一题（输入框已 disabled 时） */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !session || session.done) return;
    if (session.phase !== 'feedback') return;
    if (e.target && e.target.tagName === 'INPUT') return;
    var v = state.view;
    if (v === 'today' || v === 'review') { e.preventDefault(); nextQuestion(); }
  });

  /* ---------- 启动 ---------- */
  loadVoices();
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.onvoiceschanged = function () {
        loadVoices();
        if (state.view === 'settings') renderSettings();
      };
    } catch (e) {}
  }
  if (state.today && state.today.date !== today()) state.today = null;
  if (state.view === 'today') session = makeDailySession();
  renderAll();
})();
