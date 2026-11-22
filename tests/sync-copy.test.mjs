import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('deployed copy describes backend progress sync', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /学习进度只保存在本机/);
  assert.doesNotMatch(index, /学习进度保存在本机浏览器/);
});
