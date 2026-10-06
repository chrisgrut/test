// Baut lightroom/index.html aus den Quelldateien in lightroom/src.
// Aufruf: node lightroom/build.mjs [--fragment <ziel>]
// --fragment schreibt zusätzlich eine Variante ohne <html>/<head>/<body>-Gerüst (für Einbettungen).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const src = f => readFileSync(join(dir, 'src', f), 'utf8');
const SCRIPTS = ['core.js', 'samples.js', 'shaders.js', 'renderer.js', 'analysis.js', 'state.js', 'icons.js', 'view.js', 'panels.js', 'tools.js', 'library.js', 'app.js'];

const head = `<title>Dunkelkammer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap">
<style>
${src('styles.css')}</style>`;
const body = `${src('markup.html')}
<script>
${SCRIPTS.map(f => `/* ---- ${f} ---- */\n${src(f)}`).join('\n')}
</script>`;

const full = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync(join(dir, 'index.html'), full);
const i = process.argv.indexOf('--fragment');
if (i > 0) writeFileSync(process.argv[i + 1], `${head}\n${body}\n`);
console.log(`index.html: ${(full.length / 1024).toFixed(0)} KB`);
