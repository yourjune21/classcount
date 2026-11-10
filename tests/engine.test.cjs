/**
 * 계산 엔진 테스트 (node --test)
 * 기준 자료: 대전 지역 초등학교의 2026학년도 방과후 수업일지(엑셀)에서 손으로 셌던 분기별 수업 횟수
 */
const test = require('node:test');
const assert = require('node:assert/strict');
// src/engine.js는 브라우저용 스크립트라 vm으로 읽어 module.exports를 받음
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8'), sandbox);
const E = sandbox.module.exports;

const W = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 };
function sample2026(overrides = {}) {
  const spec = {
    사이좋은: '월', 로봇: '화', 자원: '수', 치어리딩: '목', 연극: '금', 탁구: '목', 영어1부: '월수목금', 영어23부: '월화수목금', 놀이영어: '월수',
    수학: '화수목', 주산암산: '화목', 한자: '월수', 과학탐구: '화금', 만화: '화', 캘리: '금', 음악줄넘기: '수', 농구: '화금', 방송댄스: '월',
    요리: '수', 바둑: '월금', 보드게임: '목', 컴퓨터A: '월수', 컴퓨터B: '화목',
  };
  const early = new Set(['로봇', '자원', '치어리딩', '연극']);   // 3/3부터 운영한 기관매칭 부서
  const hol = E.holidaysInRange('2026-03-01', '2027-02-28').map((h) => ({ start: h.date, end: '', name: h.name, type: '공휴일' }));
  return {
    info: { school: '테스트', year: 2026, semester: '연간' },
    cal: {
      start: '2026-03-01', end: '2027-02-28', sem2Start: '2026-08-24', week5: true, weekMode: 'nth',
      vacations: [{ name: '여름방학', start: '2026-07-24', end: '2026-08-23', run: true }, { name: '겨울방학', start: '2027-01-08', end: '2027-02-28', run: true }],
      closures: [...hol, { start: '2026-07-24', end: '2026-07-30', name: '방과후 정비', type: '방과후 미운영' }],
      ...(overrides.cal || {}),
    },
    quarters: [
      { name: '1분기', start: '2026-03-01', end: '2026-05-31' }, { name: '2분기', start: '2026-06-01', end: '2026-08-31' },
      { name: '3분기', start: '2026-09-01', end: '2026-11-30' }, { name: '4분기', start: '2026-12-01', end: '2027-02-19' },
    ],
    depts: Object.entries(spec).map(([name, d]) => ({
      name, days: [...d].map((c) => W[c]), periods: 1, vacRun: 'inherit', week5: 'inherit',
      start: early.has(name) ? '' : '2026-03-09', end: '', except: '', extra: '',
      cancels: name === '주산암산' ? [{ d: '2026-10-27', note: '' }] : [], makeups: [],
    })),
  };
}
const EXPECTED = {
  사이좋은: [11, 12, 12, 10], 로봇: [12, 12, 13, 11], 자원: [13, 11, 13, 12], 치어리딩: [13, 12, 12, 12], 연극: [12, 11, 11, 10], 탁구: [12, 12, 12, 12],
  영어1부: [46, 46, 48, 44], 영어23부: [57, 58, 61, 55], 놀이영어: [23, 23, 25, 22], 수학: [35, 35, 38, 35], 주산암산: [23, 24, 24, 23], 한자: [23, 23, 25, 22],
  과학탐구: [22, 23, 24, 21], 만화: [11, 12, 13, 11], 캘리: [11, 11, 11, 10], 음악줄넘기: [12, 11, 13, 12], 농구: [22, 23, 24, 21], 방송댄스: [11, 12, 12, 10],
  요리: [12, 11, 13, 12], 바둑: [22, 23, 23, 20], 보드게임: [12, 12, 12, 12], 컴퓨터A: [23, 23, 25, 22], 컴퓨터B: [23, 24, 25, 23],
};

test('기존 엑셀 수업일지와 분기별 수업 횟수가 일치한다', () => {
  const st = E.computeStats(sample2026(), '연간');
  for (const r of st.depts) assert.deepEqual([...r.byQ], EXPECTED[r.dept.name], r.dept.name);   // vm 영역의 배열을 이쪽 배열로 복사해 비교
});

test('주차 계산: 그 달의 n번째 요일 / 달력 주', () => {
  const w = (d, m) => E.weekOfMonth(E.d2n(d), m);
  assert.equal(w('2026-03-07', 'nth'), 1); assert.equal(w('2026-03-08', 'nth'), 2); assert.equal(w('2026-03-29', 'nth'), 5);
  assert.equal(w('2026-03-01', 'cal'), 1); assert.equal(w('2026-03-02', 'cal'), 2); assert.equal(w('2026-03-30', 'cal'), 6);
});

test('5주차 미운영이면 29~31일 수업이 빠지고, 프로그램별로 다시 켤 수 있다', () => {
  const s = sample2026({ cal: { week5: false } });
  const on = E.computeStats(sample2026(), '연간').depts.reduce((a, r) => a + r.count, 0);
  const off = E.computeStats(s, '연간').depts.reduce((a, r) => a + r.count, 0);
  assert.ok(off < on);
  s.depts[0].week5 = 'yes';
  const r0 = E.computeStats(s, '연간').depts[0];
  assert.equal(r0.count, E.computeStats(sample2026(), '연간').depts[0].count);
});

test('휴강은 빠지고 보강은 더해진다 (예전 글자 입력과 목록 입력 모두)', () => {
  const s = sample2026();
  const robot = s.depts.find((d) => d.name === '로봇');
  const base = E.computeStats(s, '연간').depts.find((r) => r.dept.name === '로봇').count;
  robot.cancels = [{ d: '2026-03-03', note: '강사 사정' }];
  robot.makeups = [{ d: '2026-03-06', note: '' }];
  robot.except = '3/10';
  robot.extra = '3/13';
  const r = E.computeStats(s, '연간').depts.find((x) => x.dept.name === '로봇');
  assert.equal(r.count, base);            // -2 +2
  assert.ok(!r.dates.includes('2026-03-03') && !r.dates.includes('2026-03-10'));
  assert.ok(r.dates.includes('2026-03-06') && r.dates.includes('2026-03-13'));
});

test('방학 중 미운영·휴업일·학기 범위', () => {
  const s = sample2026({ cal: { vacations: [{ name: '여름방학', start: '2026-07-24', end: '2026-08-23', run: false }] } });
  const r = E.computeStats(s, '연간').depts.find((x) => x.dept.name === '로봇');
  assert.ok(!r.dates.some((d) => d >= '2026-07-24' && d <= '2026-08-23'));
  const sem1 = E.computeStats(sample2026(), '1학기').depts.find((x) => x.dept.name === '로봇');
  assert.ok(sem1.dates.every((d) => d < '2026-08-24'));
});

test('공휴일 자료: 2027년 대체공휴일(제헌절·성탄절) 포함', () => {
  const h = E.holidaysInRange('2027-01-01', '2027-12-31').map((x) => x.date);
  ['2027-02-09', '2027-05-03', '2027-07-19', '2027-08-16', '2027-10-04', '2027-10-11', '2027-12-27'].forEach((d) => assert.ok(h.includes(d), d));
});

test('날짜 목록 해석: 월/일·기간·학년도 넘김', () => {
  const s = E.parseDateList('10/27, 1/5, 11/2~11/4', 2026);
  assert.deepEqual([...s].sort(), ['2026-10-27', '2026-11-02', '2026-11-03', '2026-11-04', '2027-01-05']);
});
