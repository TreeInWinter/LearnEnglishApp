import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadGenerator() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../sentence-prompts.js', import.meta.url), 'utf8'), context);
  return context.window.generateClozeSentence;
}

function loadExtendedBank() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../bank-extended.js', import.meta.url), 'utf8'), context);
  return context.window.EXTENDED_BANK_RAW;
}

test('generates one stable cloze blank from a dictionary definition', () => {
  const generate = loadGenerator();
  assert.equal(
    generate('leverage', 'v.', 'v. to use something you already have to gain more value'),
    'In this lesson, ___ means to use something you already have to gain more value.'
  );
});

test('uses a safe fallback when a definition is empty', () => {
  const generate = loadGenerator();
  assert.equal(generate('word', 'n.', ''), 'In this lesson, ___ is used as a vocabulary word.');
});

test('every extended-bank entry can become a sentence prompt', () => {
  const generate = loadGenerator();
  const bank = loadExtendedBank();
  assert.equal(bank.length, 11920);
  for (const entry of bank) {
    const sentence = generate(entry[2], entry[4], entry[6]);
    assert.equal((sentence.match(/___/g) || []).length, 1);
    assert.ok(sentence.includes('.'));
  }
});
