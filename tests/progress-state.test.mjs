import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProgressSnapshot, isValidClientId } from '../progress-state.mjs';

test('normalizes a learning snapshot and strips unrelated fields', () => {
  const snapshot = normalizeProgressSnapshot({
    progress: {
      b01: { seen: 2, correct: 1, wrong: 1, streak: 0, mastered: false, lastSeen: '2026-11-22', due: '2026-11-29' }
    },
    wrongBook: ['b01'],
    today: { date: '2026-11-22', queue: ['b01'], results: { b01: 'bad' } },
    checkin: { lastDate: '2026-11-22', days: 1 },
    history: { '2026-11-22': { done: 1, correct: 0 } },
    totalPracticed: 1,
    totalCorrect: 0,
    settings: { speech: true },
    clientUpdatedAt: 123
  }, new Set(['b01']));

  assert.deepEqual(snapshot, {
    version: 1,
    progress: {
      b01: { seen: 2, correct: 1, wrong: 1, streak: 0, mastered: false, lastSeen: '2026-11-22', due: '2026-11-29' }
    },
    wrongBook: ['b01'],
    today: { date: '2026-11-22', queue: ['b01'], results: { b01: 'bad' } },
    checkin: { lastDate: '2026-11-22', days: 1 },
    history: { '2026-11-22': { done: 1, correct: 0 } },
    totalPracticed: 1,
    totalCorrect: 0,
    clientUpdatedAt: 123
  });
});

test('rejects progress that references an unknown word', () => {
  assert.throws(
    () => normalizeProgressSnapshot({ progress: { missing: { seen: 1 } } }, new Set(['b01'])),
    /unknown word/i
  );
});

test('accepts UUID-shaped client IDs and rejects arbitrary headers', () => {
  assert.equal(isValidClientId('123e4567-e89b-12d3-a456-426614174000'), true);
  assert.equal(isValidClientId('short'), false);
  assert.equal(isValidClientId('not a client id'), false);
});
