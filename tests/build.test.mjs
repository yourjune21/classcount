// 빌드 결과(public/)가 소스와 같은지, 화면·서버 버전이 같은지 확인
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('public/ 이 소스와 같고 버전이 일치한다', () => {
  execFileSync(process.execPath, ['scripts/build.mjs', '--check'], { stdio: 'pipe' });
  const ui = readFileSync('src/ui.js', 'utf8'), w = readFileSync('worker/_worker.js', 'utf8');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const v = ui.match(/APP_VERSION = '([^']+)'/)[1];
  assert.equal(w.match(/SERVER_VERSION = '([^']+)'/)[1], v);
  assert.equal(pkg.version, v, 'package.json version도 같게 맞추세요');
});

test('서버 코드가 문법적으로 올바른 모듈이다', async () => {
  const mod = await import('../worker/_worker.js');
  assert.equal(typeof mod.default.fetch, 'function');
});
