#!/usr/bin/env node
/**
 * 빌드 스크립트 (외부 패키지 없음, Node 18 이상)
 *
 *   src/index.template.html + src/style.css + src/engine.js + src/ui.js  →  public/index.html
 *   worker/_worker.js                                                      →  public/_worker.js
 *   src/ui.js 의 CHANGELOG                                                 →  CHANGELOG.md
 *
 * 화면 버전(src/ui.js의 APP_VERSION)과 서버 버전(worker/_worker.js의 SERVER_VERSION)이
 * 다르면 빌드를 멈춥니다. 둘을 같은 번호로 올려 주세요.
 *
 * 사용법:  npm run build          (또는 node scripts/build.mjs)
 *          npm run build -- --check   public/이 소스와 같은지 확인만 (CI용)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const check = process.argv.includes('--check');

const ui = read('src/ui.js');
const worker = read('worker/_worker.js');
const appVersion = (ui.match(/const APP_VERSION = '([^']+)'/) || [])[1];
const serverVersion = (worker.match(/const SERVER_VERSION = '([^']+)'/) || [])[1];
if (!appVersion || !serverVersion) {
  console.error('✗ 버전 문자열을 찾지 못했습니다. src/ui.js의 APP_VERSION, worker/_worker.js의 SERVER_VERSION을 확인하세요.');
  process.exit(1);
}
if (appVersion !== serverVersion) {
  console.error(`✗ 버전 불일치: 화면 v${appVersion} / 서버 v${serverVersion}. 두 파일의 버전을 같게 맞추세요.`);
  process.exit(1);
}

// 치환 문자열 안의 $ 기호가 특수문자로 해석되지 않도록 함수 형태로 바꿈
const html = read('src/index.template.html')
  .replace('/*CSS*/', () => read('src/style.css'))
  .replace('/*ENGINE*/', () => read('src/engine.js'))
  .replace('/*UI*/', () => ui);

// CHANGELOG.md — src/ui.js의 CHANGELOG 배열에서 자동 생성(화면의 ‘변경 내역’과 항상 같음)
const clText = (ui.match(/const CHANGELOG = (\[[\s\S]*?\n\]);/) || [])[1];
const changelog = clText ? Function('return ' + clText)() : [];
const changelogMd = '# 변경 내역\n\n> 이 파일은 `npm run build` 가 `src/ui.js` 의 `CHANGELOG` 에서 자동으로 만듭니다. 직접 고치지 마세요.\n\n'
  + changelog.map(([v, d, t]) => `## v${v} — ${d}\n\n${t.split(/,\s*(?![^(]*\))/).map((x) => '- ' + x.trim()).join('\n')}\n`).join('\n');

const outputs = [
  ['public/index.html', html],
  ['public/_worker.js', worker],
  ['CHANGELOG.md', changelogMd],
];

if (check) {
  const stale = outputs.filter(([p, c]) => !existsSync(join(root, p)) || read(p) !== c).map(([p]) => p);
  if (stale.length) {
    console.error('✗ public/ 이 소스와 다릅니다: ' + stale.join(', ') + '\n  npm run build 를 실행한 뒤 함께 커밋하세요.');
    process.exit(1);
  }
  console.log(`✓ public/ 최신 상태 (v${appVersion})`);
} else {
  mkdirSync(join(root, 'public'), { recursive: true });
  for (const [p, c] of outputs) writeFileSync(join(root, p), c);
  console.log(`✓ 빌드 완료 v${appVersion} → public/index.html (${(html.length / 1024).toFixed(0)} KB), public/_worker.js`);
}
