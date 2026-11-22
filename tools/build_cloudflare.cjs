const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const generated = path.join(root, '.generated');
const sandbox = { window: {} };
for (const file of ['words.js', 'bank-extended.js', 'audio/breeze-manifest.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}
const bank = {};
for (const w of sandbox.window.WORDBANK) {
  bank[w.id] = w.sentence.replace('___', w.word).replace(/\s+([,;:.!?])/g, '$1');
}
for (const [id, , word] of sandbox.window.EXTENDED_BANK_RAW) bank[id] = word;
fs.mkdirSync(generated, { recursive: true });
fs.writeFileSync(path.join(generated, 'speech-bank.json'), JSON.stringify(bank));
fs.mkdirSync(out, { recursive: true });
for (const file of ['app.js', 'styles.css', 'words.js', 'bank-extended.js', 'sentence-prompts.js', 'ECDICT-LICENSE.txt']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
fs.writeFileSync(path.join(out, 'index.html'), html.replace('<script src="app.js"></script>', '<script>window.CLOUD_TTS_ENABLED = true;</script>\n<script src="app.js"></script>'));
const audio = path.join(out, 'audio');
fs.mkdirSync(audio, { recursive: true });
fs.copyFileSync(path.join(root, 'audio/breeze-manifest.js'), path.join(audio, 'breeze-manifest.js'));
for (const voice of ['aria', 'guy', 'breeze']) {
  const src = path.join(root, 'audio', voice);
  const dest = path.join(audio, voice);
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src, { withFileTypes: true })) {
    if (file.isFile() && /^[a-z0-9]+\.mp3$/.test(file.name)) {
      fs.copyFileSync(path.join(src, file.name), path.join(dest, file.name));
    }
  }
}
console.log(`Prepared ${Object.keys(bank).length} speech entries and public assets.`);
