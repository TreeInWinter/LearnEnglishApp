import { DurableObject } from 'cloudflare:workers';
import bank from './.generated/speech-bank.json';
import { isValidClientId, normalizeProgressSnapshot } from './progress-state.mjs';

const VOICE = 'voc_6t4xfzxkq25c'; // Alma, American English
const MODEL = 'breeze-tts-2';
const FORMAT = 'mp3_24000_64';
const MAX_AUDIO_BYTES = 256 * 1024;
const MAX_PROGRESS_BYTES = 512 * 1024;
const NOTES = {
  x02107: 'Pronounce project as a noun, with the stress on the first syllable.',
  x08007: 'Pronounce present as a noun, with the stress on the first syllable.',
  x08145: 'Pronounce record as a noun, with the stress on the first syllable.',
};
const ROUTE = /^\/api\/tts\/([a-z][0-9]{2,5})$/;
const PROGRESS_ROUTE = /^\/api\/progress$/;

function error(status, code) {
  return Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function audio(bytes, hit) {
  return new Response(bytes, { headers: {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-TTS-Cache': hit ? 'HIT' : 'MISS',
  } });
}

function getId(request) {
  return new URL(request.url).pathname.match(ROUTE)?.[1];
}

function progressJson(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function progressClient(request) {
  const value = request.headers.get('X-Learning-Client') || '';
  return isValidClientId(value) ? value : '';
}

export class ProgressStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.knownWordIds = new Set(Object.keys(bank));
  }

  async fetch(request) {
    if (request.method === 'GET') {
      const saved = await this.storage.get('snapshot');
      return progressJson(saved || { snapshot: null, revision: null, updatedAt: 0 });
    }
    if (request.method !== 'PUT') return new Response(null, { status: 405, headers: { Allow: 'GET, PUT' } });

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_PROGRESS_BYTES) return progressJson({ code: 'PROGRESS_TOO_LARGE' }, 413);
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_PROGRESS_BYTES) {
      return progressJson({ code: 'PROGRESS_TOO_LARGE' }, 413);
    }

    let input;
    try { input = JSON.parse(body); } catch { return progressJson({ code: 'INVALID_PROGRESS' }, 400); }
    let snapshot;
    try {
      snapshot = normalizeProgressSnapshot(input, this.knownWordIds);
    } catch {
      return progressJson({ code: 'INVALID_PROGRESS' }, 400);
    }
    const updatedAt = Date.now();
    const revision = crypto.randomUUID();
    const result = { snapshot, revision, updatedAt };
    await this.storage.put('snapshot', result);
    return progressJson(result);
  }
}

async function readMp3(response) {
  if (response.status !== 200 || !response.headers.get('Content-Type')?.toLowerCase().startsWith('audio/mpeg')) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES) { await reader.cancel(); return null; }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.byteLength; }
  if (size < 512 || !(result[0] === 255 && (result[1] & 224) === 224 ||
      result[0] === 73 && result[1] === 68 && result[2] === 51)) return null;
  return result.buffer;
}

export class SpeechStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.config = env;
    this.pending = new Set();
  }

  async fetch(request) {
    const id = getId(request);
    if (!id || !Object.hasOwn(bank, id)) return error(404, 'UNKNOWN_WORD');
    const text = bank[id];
    const instructions = 'Read exactly the supplied text in clear, natural American English, once. ' + (NOTES[id] || '');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([VOICE, MODEL, FORMAT, text, instructions])));
    const key = 'mp3:' + id + ':' + Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
    const kv = this.storage.kv;
    const saved = kv.get(key);
    if (saved) return audio(saved, true);
    if (!this.config.BREEZE_API_KEY) return error(503, 'TTS_NOT_CONFIGURED');
    if (this.pending.has(key)) return error(409, 'IN_PROGRESS');
    if (this.pending.size >= 2) return error(429, 'TTS_BUSY');

    // Text consists of trusted bank entries. Breeze meters Latin text and punctuation by code point.
    const units = Array.from(text).reduce((n, char) => n + (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(char) ? 2 : 1), 0);
    const cap = Math.min(400, Number(this.config.TTS_DAILY_CREDITS));
    if (!Number.isFinite(cap) || cap <= 0) return error(429, 'DAILY_LIMIT');
    // A single globally addressed object reserves before outbound I/O. Unknown outcomes are not refunded.
    const day = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const accepted = this.storage.transactionSync(() => {
      const current = kv.get('budget');
      const used = current?.day === day ? current.used : 0;
      if (used + units > Math.floor(cap * 10)) return false;
      kv.put('budget', { day, used: used + units });
      return true;
    });
    if (!accepted) return error(429, 'DAILY_LIMIT');
    this.pending.add(key);
    try {
      await this.storage.sync();
      const response = await fetch(`https://api.breeze.blue/v1/text-to-speech/${VOICE}?output_format=${FORMAT}`, {
        method: 'POST',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': this.config.BREEZE_API_KEY },
        body: JSON.stringify({ text, instructions, model_id: MODEL, language_code: 'en' }),
        signal: AbortSignal.timeout(12000),
      });
      const bytes = await readMp3(response);
      if (!bytes) {
        if (response.status === 402) return error(429, 'BREEZE_CREDITS_EXHAUSTED');
        return error(response.status === 429 ? 429 : 502, 'BREEZE_UNAVAILABLE');
      }
      kv.put(key, bytes);
      return audio(bytes, false);
    } catch {
      return error(502, 'BREEZE_UNAVAILABLE');
    } finally {
      this.pending.delete(key);
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (PROGRESS_ROUTE.test(url.pathname)) {
      if (request.method !== 'GET' && request.method !== 'PUT') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, PUT' } });
      }
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return error(403, 'WRONG_ORIGIN');
      const clientId = progressClient(request);
      if (!clientId) return error(400, 'INVALID_LEARNING_CLIENT');
      const contentType = (request.headers.get('Content-Type') || '').split(';', 1)[0].trim().toLowerCase();
      if (request.method === 'PUT' && contentType !== 'application/json') {
        return error(415, 'JSON_REQUIRED');
      }
      if (!env.PROGRESS_STORAGE) return error(503, 'PROGRESS_NOT_CONFIGURED');
      try {
        const stub = env.PROGRESS_STORAGE.get(env.PROGRESS_STORAGE.idFromName(clientId));
        return await stub.fetch(request);
      } catch {
        return error(503, 'PROGRESS_UNAVAILABLE');
      }
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const id = getId(request);
    if (!id || !Object.hasOwn(bank, id)) return error(404, 'UNKNOWN_WORD');
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (request.headers.get('Origin') !== url.origin) return error(403, 'WRONG_ORIGIN');
    // The browser sends a separate site passphrase, never the Breeze credential.
    const expected = env.TTS_ACCESS_TOKEN;
    if (!expected || expected.length < 24) return error(503, 'TTS_NOT_CONFIGURED');
    const value = request.headers.get('X-TTS-Access') || '';
    const given = new TextEncoder().encode(value);
    const required = new TextEncoder().encode(expected);
    if (given.length !== required.length || !crypto.subtle.timingSafeEqual(given, required)) {
      return error(401, 'TTS_ACCESS_REQUIRED');
    }
    try {
      const stub = env.TTS_STORAGE.get(env.TTS_STORAGE.idFromName('global-speech-budget'));
      return await stub.fetch(new Request(url, { method: 'POST' }));
    } catch {
      return error(503, 'TTS_UNAVAILABLE');
    }
  },
};
