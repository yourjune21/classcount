/* ===== 계산 엔진 (UI와 독립) ===== */
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

// 'YYYY-MM-DD' <-> UTC day number
function d2n(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  const [y, m, d] = s.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
function n2d(n) {
  const t = new Date(n * 86400000);
  return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
}
function dowOf(n) { return new Date(n * 86400000).getUTCDay(); }

/* 주차 계산
   nth : 그 달의 n번째 같은 요일 (1~7일=1주, 8~14일=2주 … 29~31일=5주)
   cal : 달력 기준 주 (월요일 시작, 1일이 든 주가 1주) */
function weekOfMonth(n, mode) {
  const dom = new Date(n * 86400000).getUTCDate();
  if (mode === 'cal') {
    const first = n - dom + 1, offset = (dowOf(first) + 6) % 7;
    return Math.floor((dom - 1 + offset) / 7) + 1;
  }
  return Math.ceil(dom / 7);
}
function week5On(state, dept) {
  const w = dept ? dept.week5 : 'inherit';
  if (w === 'yes') return true;
  if (w === 'no') return false;
  return state.cal.week5 !== false;
}

// 날짜 목록 문자열 파싱: "2026-10-27, 2026-11-03~2026-11-05" 또는 "10/27" (학년도 기준 연도 추정)
function parseDateList(text, schoolYear) {
  const out = new Set();
  if (!text) return out;
  const toIso = (tok) => {
    tok = tok.trim().replace(/\./g, '-').replace(/\//g, '-').replace(/-$/, '');
    let m = tok.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    m = tok.match(/^(\d{1,2})-(\d{1,2})$/);
    if (m && schoolYear) {
      const mo = Number(m[1]);
      const y = mo <= 2 ? Number(schoolYear) + 1 : Number(schoolYear);
      return y + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
    }
    return null;
  };
  text.split(/[,\n;]+/).forEach((part) => {
    part = part.trim();
    if (!part) return;
    const r = part.split('~');
    if (r.length === 2) {
      const a = d2n(toIso(r[0])), b = d2n(toIso(r[1]));
      if (!isNaN(a) && !isNaN(b)) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(n2d(i));
    } else {
      const iso = toIso(part);
      if (iso && !isNaN(d2n(iso))) out.add(iso);
    }
  });
  return out;
}

/* 우주항공청 월력요항 기준 공휴일 (자동 입력용, 사용 전 확인 권장) */
const KR_HOLIDAYS = {
  2026: [['01-01', '신정'], ['02-16', '설날'], ['02-17', '설날'], ['02-18', '설날'], ['03-01', '삼일절'], ['03-02', '대체공휴일(삼일절)'], ['05-01', '노동절'], ['05-05', '어린이날'], ['05-24', '부처님오신날'], ['05-25', '대체공휴일(부처님오신날)'], ['06-03', '전국동시지방선거'], ['06-06', '현충일'], ['07-17', '제헌절'], ['08-15', '광복절'], ['08-17', '대체공휴일(광복절)'], ['09-24', '추석'], ['09-25', '추석'], ['09-26', '추석'], ['10-03', '개천절'], ['10-05', '대체공휴일(개천절)'], ['10-09', '한글날'], ['12-25', '성탄절']],
  2027: [['01-01', '신정'], ['02-06', '설날'], ['02-07', '설날'], ['02-08', '설날'], ['02-09', '대체공휴일(설날)'], ['03-01', '삼일절'], ['05-01', '노동절'], ['05-03', '대체공휴일(노동절)'], ['05-05', '어린이날'], ['05-13', '부처님오신날'], ['06-06', '현충일'], ['07-17', '제헌절'], ['07-19', '대체공휴일(제헌절)'], ['08-15', '광복절'], ['08-16', '대체공휴일(광복절)'], ['09-14', '추석'], ['09-15', '추석'], ['09-16', '추석'], ['10-03', '개천절'], ['10-04', '대체공휴일(개천절)'], ['10-09', '한글날'], ['10-11', '대체공휴일(한글날)'], ['12-25', '성탄절'], ['12-27', '대체공휴일(성탄절)']],
  2028: [['01-01', '신정'], ['01-25', '설날'], ['01-26', '설날'], ['01-27', '설날'], ['03-01', '삼일절'], ['04-12', '국회의원선거'], ['05-01', '노동절'], ['05-02', '부처님오신날'], ['05-05', '어린이날'], ['06-06', '현충일'], ['07-17', '제헌절'], ['08-15', '광복절'], ['10-02', '추석'], ['10-03', '추석·개천절'], ['10-04', '추석'], ['10-05', '대체공휴일(추석)'], ['10-09', '한글날'], ['12-25', '성탄절']],
  // 2029~2030년: 음력 환산 기준 예정일 (선거일·임시공휴일은 정해지면 최고관리자 ‘공휴일 관리’에서 추가)
  2029: [['01-01', '신정'], ['02-12', '설날'], ['02-13', '설날'], ['02-14', '설날'], ['03-01', '삼일절'], ['05-01', '노동절'], ['05-05', '어린이날'], ['05-07', '대체공휴일(어린이날)'], ['05-20', '부처님오신날'], ['05-21', '대체공휴일(부처님오신날)'], ['06-06', '현충일'], ['07-17', '제헌절'], ['08-15', '광복절'], ['09-21', '추석'], ['09-22', '추석'], ['09-23', '추석'], ['09-24', '대체공휴일(추석)'], ['10-03', '개천절'], ['10-09', '한글날'], ['12-25', '성탄절']],
  2030: [['01-01', '신정'], ['02-02', '설날'], ['02-03', '설날'], ['02-04', '설날'], ['02-05', '대체공휴일(설날)'], ['03-01', '삼일절'], ['05-01', '노동절'], ['05-05', '어린이날'], ['05-06', '대체공휴일(어린이날)'], ['05-09', '부처님오신날'], ['06-06', '현충일'], ['07-17', '제헌절'], ['08-15', '광복절'], ['09-11', '추석'], ['09-12', '추석'], ['09-13', '추석'], ['10-03', '개천절'], ['10-09', '한글날'], ['12-25', '성탄절']],
};
// 최고관리자가 추가·제외한 공휴일 (서버 설정에서 받아 적용)
const HOL_OVERRIDE = { add: [], off: [] };
function setHolidayOverrides(add, off) {
  HOL_OVERRIDE.add = (Array.isArray(add) ? add : []).filter((h) => h && !isNaN(d2n(h.date))).map((h) => ({ date: h.date, name: String(h.name || '공휴일') }));
  HOL_OVERRIDE.off = (Array.isArray(off) ? off : []).filter((d) => !isNaN(d2n(d)));
}
function builtinHolidays(year) { return (KR_HOLIDAYS[year] || []).map(([md, name]) => ({ date: year + '-' + md, name })); }

function holidaysInRange(start, end) {
  const a = d2n(start), b = d2n(end), out = [];
  if (isNaN(a) || isNaN(b)) return out;
  const off = new Set(HOL_OVERRIDE.off), seen = new Set();
  Object.keys(KR_HOLIDAYS).forEach((y) => {
    KR_HOLIDAYS[y].forEach(([md, name]) => {
      const iso = y + '-' + md, n = d2n(iso);
      if (n >= a && n <= b && !off.has(iso)) { out.push({ date: iso, name }); seen.add(iso); }
    });
  });
  HOL_OVERRIDE.add.forEach((h) => { const n = d2n(h.date); if (n >= a && n <= b && !seen.has(h.date)) { out.push({ date: h.date, name: h.name, custom: true }); seen.add(h.date); } });
  return out.sort((x, y) => (x.date < y.date ? -1 : 1));
}

/* 하루 단위 학사 달력 생성 */
function buildCalendar(state) {
  const cal = state.cal, a = d2n(cal.start), b = d2n(cal.end);
  if (isNaN(a) || isNaN(b) || b < a || b - a > 800) return [];
  const qs = state.quarters.map((q, i) => ({ i, name: q.name, a: d2n(q.start), b: d2n(q.end) }));
  const vacs = cal.vacations.map((v) => ({ ...v, a: d2n(v.start), b: d2n(v.end) }));
  const closures = new Map();
  cal.closures.forEach((c) => {
    const ca = d2n(c.start), cb = isNaN(d2n(c.end)) ? ca : d2n(c.end);
    if (isNaN(ca)) return;
    for (let n = ca; n <= cb; n++) if (!closures.has(n)) closures.set(n, c);
  });
  const sem2 = d2n(cal.sem2Start);
  const days = [];
  for (let n = a; n <= b; n++) {
    const q = qs.find((x) => n >= x.a && n <= x.b);
    const v = vacs.find((x) => n >= x.a && n <= x.b);
    const iso = n2d(n);
    days.push({
      n, iso, dow: dowOf(n),
      ym: iso.slice(0, 7),
      q: q ? q.i : -1,
      vac: v || null,
      closure: closures.get(n) || null,
      sem: isNaN(sem2) ? 1 : (n < sem2 ? 1 : 2),
      wk: weekOfMonth(n, cal.weekMode),
    });
  }
  return days;
}

/* 해당 날짜에 방과후 운영이 가능한가 (부서 무관 기본 조건) */
function baseOpen(day, vacRun) {
  if (day.q < 0 || day.closure) return false;
  if (day.vac) {
    const run = vacRun === 'yes' ? true : vacRun === 'no' ? false : !!day.vac.run;
    if (!run) return false;
  }
  return true;
}

/* 공통 운영 가능일 (학사일정 + 전체 5주차 설정) */
function commonOpen(state, day) {
  return baseOpen(day, 'inherit') && !(day.wk >= 5 && !week5On(state, null));
}

/* 부서별 수업일 계산 (opts.skipped 배열을 주면 5주차로 빠진 날을 담음) */
function deptSessions(state, days, dept, opts) {
  const w5 = week5On(state, dept);
  const ex = parseDateList(dept.except, state.info.year);
  const extra = parseDateList(dept.extra, state.info.year);
  // 휴강·보강 메뉴에서 입력한 목록 [{d:'YYYY-MM-DD', note}]
  (dept.cancels || []).forEach((c) => c && c.d && ex.add(c.d));
  (dept.makeups || []).forEach((c) => c && c.d && extra.add(c.d));
  const da = d2n(dept.start), db = d2n(dept.end);
  const out = [];
  for (const day of days) {
    if (extra.has(day.iso) && day.q >= 0) { out.push(day); continue; }
    if (!dept.days.includes(day.dow)) continue;
    if (!isNaN(da) && day.n < da) continue;
    if (!isNaN(db) && day.n > db) continue;
    if (ex.has(day.iso)) continue;
    if (!baseOpen(day, dept.vacRun)) continue;
    if (!w5 && day.wk >= 5) { if (opts && opts.skipped) opts.skipped.push(day); continue; }
    out.push(day);
  }
  return out;
}

function inScope(day, scope) {
  if (scope === '1학기') return day.sem === 1;
  if (scope === '2학기') return day.sem === 2;
  return true;
}

/* 전체 통계 */
function computeStats(state, scope) {
  scope = scope || '연간';
  const days = buildCalendar(state);
  const allDays = days.filter((d) => inScope(d, scope));
  const nq = state.quarters.length;
  const months = [...new Set(allDays.filter((d) => d.q >= 0).map((d) => d.ym))];

  // 요일별 운영 가능일 (분기 × 요일)
  const weekday = state.quarters.map(() => [0, 0, 0, 0, 0, 0, 0]);
  const wdClosed = state.quarters.map(() => [0, 0, 0, 0, 0, 0, 0]);
  allDays.forEach((d) => {
    if (d.q < 0 || d.dow === 0) return;
    if (commonOpen(state, d)) weekday[d.q][d.dow]++;
    else wdClosed[d.q][d.dow]++;
  });

  const depts = state.depts.map((dept) => {
    const skipped = [];
    const ss = deptSessions(state, days, dept, { skipped }).filter((d) => inScope(d, scope));
    const byWk = [0, 0, 0, 0, 0, 0, 0];
    ss.forEach((d) => byWk[d.wk]++);
    const per = Math.max(0, Number(dept.periods) || 1);
    const rate = Number(String(dept.rate || '').replace(/[^\d.]/g, '')) || 0;
    const byQ = Array(nq).fill(0), byM = {}, byDow = [0, 0, 0, 0, 0, 0, 0];
    ss.forEach((d) => {
      if (d.q >= 0) byQ[d.q]++;
      byM[d.ym] = (byM[d.ym] || 0) + 1;
      byDow[d.dow]++;
    });
    const count = ss.length;
    return {
      dept, count, periods: count * per, per, rate,
      fee: count * per * rate,
      byQ, byQP: byQ.map((c) => c * per), byQFee: byQ.map((c) => c * per * rate),
      byM, byDow, byWk, dates: ss.map((d) => d.iso),
      skipped5: skipped.filter((d) => inScope(d, scope)).length,
    };
  });

  // 강사별 집계
  const tmap = new Map();
  depts.forEach((r) => {
    const key = (r.dept.teacher || '(강사 미입력)').trim();
    if (!tmap.has(key)) tmap.set(key, { teacher: key, depts: [], count: 0, periods: 0, fee: 0, byQP: Array(nq).fill(0), byQFee: Array(nq).fill(0) });
    const t = tmap.get(key);
    t.depts.push(r.dept.name);
    t.count += r.count; t.periods += r.periods; t.fee += r.fee;
    r.byQP.forEach((v, i) => (t.byQP[i] += v));
    r.byQFee.forEach((v, i) => (t.byQFee[i] += v));
  });

  return { days, scopedDays: allDays, months, weekday, wdClosed, depts, teachers: [...tmap.values()] };
}

if (typeof module !== 'undefined') module.exports = { weekOfMonth, week5On, commonOpen, d2n, n2d, dowOf, parseDateList, holidaysInRange, setHolidayOverrides, builtinHolidays, buildCalendar, deptSessions, computeStats, baseOpen, KR_HOLIDAYS, DOW };
