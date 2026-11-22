const MAX_ITEMS = 20000;
const MAX_HISTORY_DAYS = 5000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredObject(value, label) {
  if (!isObject(value)) throw new Error(`${label} must be an object`);
  return value;
}

function boundedInt(value, label, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value == null ? 0 : value);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return Math.floor(number);
}

function dateValue(value, label, allowEmpty = true) {
  if (value == null || (allowEmpty && value === '')) return '';
  if (typeof value !== 'string' || value.length > 32 || !DATE_RE.test(value)) {
    throw new Error(`${label} must be a date`);
  }
  return value;
}

function wordId(value, knownWordIds, label) {
  if (typeof value !== 'string' || value.length > 64 || !knownWordIds.has(value)) {
    throw new Error(`${label} references an unknown word`);
  }
  return value;
}

function normalizeProgressEntry(value, label) {
  const source = requiredObject(value, label);
  return {
    seen: boundedInt(source.seen, `${label}.seen`, 1000000),
    correct: boundedInt(source.correct, `${label}.correct`, 1000000),
    wrong: boundedInt(source.wrong, `${label}.wrong`, 1000000),
    streak: boundedInt(source.streak, `${label}.streak`, 1000000),
    mastered: Boolean(source.mastered),
    lastSeen: dateValue(source.lastSeen, `${label}.lastSeen`),
    due: dateValue(source.due, `${label}.due`)
  };
}

function normalizeToday(value, knownWordIds) {
  if (value == null) return null;
  const source = requiredObject(value, 'today');
  const queue = Array.isArray(source.queue) ? source.queue : (() => { throw new Error('today.queue must be an array'); })();
  if (queue.length > MAX_ITEMS) throw new Error('today.queue is too large');
  const normalizedQueue = queue.map((id, index) => wordId(id, knownWordIds, `today.queue[${index}]`));
  const sourceResults = requiredObject(source.results || {}, 'today.results');
  const results = {};
  for (const [id, result] of Object.entries(sourceResults)) {
    wordId(id, knownWordIds, 'today.results');
    if (result !== 'ok' && result !== 'bad' && result !== 'skip') throw new Error('today.results contains an invalid result');
    results[id] = result;
  }
  return { date: dateValue(source.date, 'today.date', false), queue: normalizedQueue, results };
}

export function isValidClientId(value) {
  return typeof value === 'string' && (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    /^[a-z0-9_-]{24,80}$/i.test(value)
  );
}

export function normalizeProgressSnapshot(input, knownWordIds) {
  const source = requiredObject(input, 'snapshot');
  if (!(knownWordIds instanceof Set)) throw new Error('knownWordIds must be a Set');

  const sourceProgress = requiredObject(source.progress || {}, 'progress');
  const progressEntries = Object.entries(sourceProgress);
  if (progressEntries.length > MAX_ITEMS) throw new Error('progress is too large');
  const progress = {};
  for (const [id, value] of progressEntries) {
    wordId(id, knownWordIds, 'progress');
    progress[id] = normalizeProgressEntry(value, `progress.${id}`);
  }

  const sourceWrongBook = source.wrongBook == null ? [] : source.wrongBook;
  if (!Array.isArray(sourceWrongBook) || sourceWrongBook.length > MAX_ITEMS) throw new Error('wrongBook must be an array');
  const wrongBook = [...new Set(sourceWrongBook.map((id, index) => wordId(id, knownWordIds, `wrongBook[${index}]`)))];

  const sourceCheckin = source.checkin == null ? {} : requiredObject(source.checkin, 'checkin');
  const sourceHistory = source.history == null ? {} : requiredObject(source.history, 'history');
  const historyEntries = Object.entries(sourceHistory);
  if (historyEntries.length > MAX_HISTORY_DAYS) throw new Error('history is too large');
  const history = {};
  for (const [date, value] of historyEntries) {
    dateValue(date, 'history date', false);
    const day = requiredObject(value, `history.${date}`);
    history[date] = {
      done: boundedInt(day.done, `history.${date}.done`, 1000000),
      correct: boundedInt(day.correct, `history.${date}.correct`, 1000000)
    };
  }

  const clientUpdatedAt = source.clientUpdatedAt == null ? 0 : boundedInt(source.clientUpdatedAt, 'clientUpdatedAt');
  return {
    version: 1,
    progress,
    wrongBook,
    today: normalizeToday(source.today, knownWordIds),
    checkin: {
      lastDate: dateValue(sourceCheckin.lastDate, 'checkin.lastDate'),
      days: boundedInt(sourceCheckin.days, 'checkin.days', 1000000)
    },
    history,
    totalPracticed: boundedInt(source.totalPracticed, 'totalPracticed', 100000000),
    totalCorrect: boundedInt(source.totalCorrect, 'totalCorrect', 100000000),
    clientUpdatedAt
  };
}
