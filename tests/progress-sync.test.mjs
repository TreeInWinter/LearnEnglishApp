import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadSync() {
  const context = { window: {}, crypto: { randomUUID: () => '123e4567-e89b-12d3-a456-426614174000' } };
  vm.runInNewContext(fs.readFileSync(new URL('../progress-sync.js', import.meta.url), 'utf8'), context);
  return context.window.LearningProgressSync;
}

const localState = {
  settings: { dailyGoal: 10, speech: true },
  progress: { b01: { seen: 1 } },
  wrongBook: ['b01'],
  today: { date: '2026-11-22', queue: ['b01'], results: {} },
  checkin: { lastDate: '', days: 0 },
  history: {},
  totalPracticed: 1,
  totalCorrect: 1
};

test('serializes only learning fields and keeps local settings out', () => {
  const sync = loadSync();
  const payload = sync.snapshotFromState(localState, 123);
  assert.equal(payload.clientUpdatedAt, 123);
  assert.equal(payload.settings, undefined);
  assert.equal(payload.progress.b01.seen, 1);
});

test('merges remote learning records without overwriting settings', () => {
  const sync = loadSync();
  const target = structuredClone({ ...localState, progress: { b01: { seen: 1, correct: 1, wrong: 0, streak: 1, mastered: false, lastSeen: '2026-11-21', due: '' } } });
  sync.mergeSnapshot(target, {
    progress: {
      b01: { seen: 3, correct: 3, wrong: 0, streak: 2, mastered: true, lastSeen: '2026-11-22', due: '2026-11-29' },
      b02: { seen: 1, correct: 0, wrong: 1, streak: 0, mastered: false, lastSeen: '2026-11-22', due: '2026-11-22' }
    },
    wrongBook: ['b02'], today: null, checkin: { lastDate: '2026-11-22', days: 2 },
    history: { '2026-11-22': { done: 3, correct: 3 } }, totalPracticed: 3, totalCorrect: 3
  });
  assert.equal(target.settings.speech, true);
  assert.equal(target.progress.b01.mastered, true);
  assert.equal(target.progress.b02.wrong, 1);
  assert.equal(target.totalCorrect, 3);
});
