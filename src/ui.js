/* ===== UI ===== */
/* ---- 버전 관리: 기능을 바꿀 때마다 APP_VERSION·APP_DATE를 올리고 CHANGELOG 맨 위에 한 줄 추가 ---- */
const APP_VERSION = '1.12.0';
const APP_DATE = '2026-11-10';
const CHANGELOG = [
  ['1.12.0', '2026-11-10', 'Cloudflare 무료 한도에 맞춰 서버 저장 횟수 절감(30초 모아 저장·변경 없으면 건너뜀), 다른 기기에서 동시에 고친 경우 경고, 자동 백업·복원(서버 최근 10개, 이 기기 최근 7일), 최고관리자 공휴일 관리·전체 학교 백업, 2029~2030년 공휴일, 강사 수업 확인서(단순 확인용) 인쇄, 강사 화면에 다음 수업·이번 달 수업, 학교명 변경 안내'],
  ['1.11.3', '2026-11-10', 'Cloudflare KV 바인딩 변수 이름을 SCHOOL로 안내(기존 SCHOOLS도 그대로 동작)'],
  ['1.11.2', '2026-11-10', 'Cloudflare GitHub 연동 배포 오류(Invalid KV namespace ID) 수정: wrangler.toml 제거, 연결 설정은 대시보드에서'],
  ['1.11.1', '2026-11-10', '영문 이름 ClassCount 적용(제목·로고·하단), GitHub 저장소(yourjune21/classcount) 연결 링크'],
  ['1.11.0', '2026-11-10', '통계 첫 화면에 진행 현황 탭(기준일까지 프로그램별 수업 진행을 가로 막대그래프로, 분기별 진행 상태·남은 수업 한눈에 보기), 다음에 추가할 기능 안내 삭제'],
  ['1.10.0', '2026-11-10', 'GitHub 저장소 구성(소스·빌드·자동 테스트·배포 설정·설명서), 최고관리자 메뉴에 새 학교 생성 켜기/끄기, 서버 없는 배포(GitHub Pages 등) 안내 개선'],
  ['1.9.0', '2026-11-10', '휴강·보강 메뉴(5단계, 달력 클릭·사유 입력, 기존 결강·보강일 자동 이전), 1학기 종료일·2학기 시작일 입력 시 여름방학 자동 입력, 공휴일과 학교 휴업일 색 구분'],
  ['1.8.0', '2026-11-10', '분기 종료일을 입력하면 다음 분기 시작일을 다음 평일(주말·공휴일 제외)로 자동 입력'],
  ['1.7.0', '2026-11-10', '학년도 입력 시 학사일정 기간(3.1.~다음 해 2월 말) 자동 설정, 연도 2000~2100년 제한, 날짜 직접 입력 시 커서가 빠지던 오류 수정, 버전 표시'],
  ['1.6.0', '2026-11-10', '다음 학년도로 전환(프로그램 복사·학사일정 재설정), 지난 학년도 조회 전용 보관, 상단 학년도 선택'],
  ['1.5.0', '2026-11-10', '학교명으로 로그인, 등록된 학교 찾기, 예시 학교로 체험하기'],
  ['1.4.0', '2026-11-10', '프로그램별 6자리 강사용 링크·강사용 조회 화면, 수업일 목록/달력 전환'],
  ['1.3.0', '2026-11-10', '5주차 수업 켜기/끄기, 주차별 통계·주차 표시, Cloudflare 서버(_worker.js + KV)'],
  ['1.2.0', '2026-11-10', '학교 생성·로그인, 최고관리자(전체 학교 목록·입력사항 보기·비밀번호 초기화)'],
  ['1.1.0', '2026-11-10', '학사일정 학기별 접기, 부서 2단계 분류·드래그 정렬, 결과표 제목 클릭 정렬, 쿠키 저장·JSON 저장·미저장 경고'],
  ['1.0.0', '2026-11-10', '5단계 입력(기본 정보·학사일정·분기·부서·통계), 분기별·요일별·연간 시수와 수업료 계산, 엑셀 내보내기'],
];
let SERVER_VERSION = null;
const GITHUB_URL = 'https://github.com/yourjune21/classcount';
let SETTINGS = { allowCreate: true, holidays: [], holidayOff: [] };   // 최고관리자 설정
const STORE = 'ash';                       // 쿠키/로컬 저장 키
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => (Number(n) || 0).toLocaleString('ko-KR');
const CLOSURE_TYPES = ['공휴일', '재량휴업일', '방과후 미운영', '학교행사', '기타'];
const STEP_META = [['기본 정보', '학교·학년도·학기'], ['학사일정', '학기별 방학·휴업일'], ['방과후 분기', '분기별 운영기간'], ['부서·강사', '분류·프로그램·요일'], ['휴강·보강', '프로그램별 휴강·보강일'], ['통계', '시수·수업료 집계']];
const LAST_STEP = STEP_META.length;

/* 학년도 기본 기간: 해당 연도 3월 1일 ~ 다음 연도 2월 마지막 날 */
const YEAR_MIN = 2000, YEAR_MAX = 2100;
const validYear = (y) => Number.isInteger(Number(y)) && Number(y) >= YEAR_MIN && Number(y) <= YEAR_MAX && String(y).length === 4;
const yearStart = (y) => y + '-03-01';
const yearEnd = (y) => n2d(d2n((Number(y) + 1) + '-03-01') - 1);
function newDept(group) { return { id: uid(), share: newShare(), cancels: [], makeups: [], group, name: '', teacher: '', days: [], periods: 1, rate: '', vacRun: 'inherit', week5: 'inherit', start: '', end: '', except: '', extra: '', memo: '', open: false }; }
function blankState() {
  const y = new Date().getMonth() < 2 ? new Date().getFullYear() - 1 : new Date().getFullYear();
  const g1 = uid(), g2 = uid();
  return {
    v: 4, savedAt: 0, exportedAt: 0, step: 1,
    info: { school: '', year: y, semester: '연간', manager: '' },
    cal: {
      start: yearStart(y), end: yearEnd(y), sem1End: '', sem2Start: '', week5: true, weekMode: 'nth',
      vacations: [{ id: uid(), sem: 1, name: '여름방학', start: '', end: '', run: true }, { id: uid(), sem: 2, name: '겨울방학', start: '', end: '', run: true }],
      closures: [],
    },
    quarters: [],
    groups: [{ id: g1, name: '초1·2 맞춤형 프로그램', collapsed: false }, { id: g2, name: '방과후학교', collapsed: false }],
    depts: [],
    ui: { tab: 'progress', asOf: '', progSort: 'base', scope: '', unit: 'periods', showFee: true, calDept: '', listDept: '', semOpen: { 1: true, 2: true }, sort: {}, statFold: {} },
  };
}

let S = blankState();
let downloads = null;
let saveTimer = null;

/* ================= 저장: 쿠키(기기) + JSON 파일 ================= */
function normalize(s) {
  const b = blankState();
  s = Object.assign(b, s || {});
  s.info = Object.assign(blankState().info, s.info || {});
  s.cal = Object.assign(blankState().cal, s.cal || {});
  if (s.cal.week5 == null) s.cal.week5 = true;
  if (s.cal.sem1End == null) s.cal.sem1End = '';
  if (validYear(s.info.year)) { if (!s.cal.start) s.cal.start = yearStart(s.info.year); if (!s.cal.end) s.cal.end = yearEnd(s.info.year); }
  if (!s.cal.weekMode) s.cal.weekMode = 'nth';
  s.cal.vacations = (s.cal.vacations || []).map((v, i) => ({ id: v.id || uid(), sem: v.sem || (i === 0 ? 1 : 2), name: v.name || '', start: v.start || '', end: v.end || '', run: v.run !== false, ...(v.auto != null ? { auto: v.auto } : {}) }));
  s.cal.closures = (s.cal.closures || []).map((c) => ({ id: c.id || uid(), sem: c.sem || 1, start: c.start || '', end: c.end || '', name: c.name || '', type: c.type || '기타' }));
  s.quarters = (s.quarters || []).map((q) => ({ id: q.id || uid(), name: q.name || '', start: q.start || '', end: q.end || '' }));
  if (!Array.isArray(s.groups) || !s.groups.length) s.groups = [{ id: uid(), name: '방과후학교', collapsed: false }];
  s.groups = s.groups.map((g) => ({ id: g.id || uid(), name: g.name || '', collapsed: !!g.collapsed }));
  const gids = new Set(s.groups.map((g) => g.id));
  s.depts = (s.depts || []).map((d) => ({
    ...newDept(gids.has(d.group) ? d.group : s.groups[s.groups.length - 1].id),
    id: d.id || uid(), share: /^[A-Za-z0-9]{6}$/.test(d.share || '') ? d.share : newShare(), name: d.name || '', teacher: d.teacher || '', days: Array.isArray(d.days) ? d.days.map(Number) : [],
    periods: d.periods == null || d.periods === '' ? 1 : d.periods, rate: d.rate || '', vacRun: d.vacRun || 'inherit', week5: d.week5 || 'inherit',
    start: d.start || '', end: d.end || '', except: '', extra: '', memo: d.memo || '',
    // 예전 ‘결강일·보강일’ 글자 입력을 휴강·보강 목록으로 옮김
    cancels: mergeChg(d.cancels, d.except, s.info.year), makeups: mergeChg(d.makeups, d.extra, s.info.year),
  }));
  if ((s.v || 1) < 3 && s.step === 5) s.step = 6;   // 예전 5단계(통계) → 6단계
  if ((s.v || 1) < 4) s.ui.tab = 'progress';          // 통계 첫 화면 = 진행 현황
  s.v = 4;
  s.ui = Object.assign(blankState().ui, s.ui || {});
  s.ui.semOpen = Object.assign({ 1: true, 2: true }, s.ui.semOpen || {});
  s.ui.sort = s.ui.sort || {}; s.ui.statFold = s.ui.statFold || {};
  S = s; reorderDepts(); return S;
}
function mergeChg(list, text, year) {
  const out = (Array.isArray(list) ? list : []).filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.d)).map((c) => ({ d: c.d, note: c.note || '' }));
  if (text) [...parseDateList(text, year)].forEach((d) => { if (!out.some((c) => c.d === d)) out.push({ d, note: '' }); });
  return out.sort((a, b) => (a.d < b.d ? -1 : 1));
}
function snapshot() { const c = JSON.parse(JSON.stringify(S)); c.depts.forEach((d) => delete d.open); return c; }

// --- 쿠키: 압축(가능 시) 후 3,500자 단위로 나눠 저장 ---
async function packStr(str) {
  try {
    if (typeof CompressionStream === 'undefined') throw 0;
    const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = new Uint8Array(await new Response(cs).arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return 'z' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) { return 'u' + encodeURIComponent(str); }
}
async function unpackStr(p) {
  if (p[0] === 'u') return decodeURIComponent(p.slice(1));
  let b = p.slice(1).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
  const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const ds = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(ds).text();
}
function readCookies() { const o = {}; try { document.cookie.split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1); }); } catch (e) {} return o; }
function writeCookie(k, v, del) {
  const attrs = '; path=/; max-age=' + (del ? 0 : 60 * 60 * 24 * 400) + (location.protocol === 'https:' ? '; SameSite=None; Secure' : '; SameSite=Lax');
  try { document.cookie = k + '=' + v + attrs; } catch (e) {}
}
async function saveDevice() {
  if (VIEW_YEAR) return false;            // 지난 학년도를 보는 중에는 기기 저장본을 덮어쓰지 않음
  const json = JSON.stringify(snapshot());
  let cookieOk = false;
  try {
    const packed = await packStr(json);
    const size = 3500, n = Math.ceil(packed.length / size);
    const old = Number(readCookies()[STORE + '_n']) || 0;
    for (let i = 0; i < n; i++) writeCookie(STORE + '_' + i, packed.slice(i * size, (i + 1) * size));
    for (let i = n; i < old; i++) writeCookie(STORE + '_' + i, '', true);
    writeCookie(STORE + '_n', String(n));
    cookieOk = Number(readCookies()[STORE + '_n']) === n;
  } catch (e) {}
  // 쿠키가 막힌 브라우저(타사 쿠키 차단 등)를 위해 로컬 저장소에도 함께 보관
  try { localStorage.setItem(STORE + '_json', json); } catch (e) {}
  return cookieOk;
}
async function loadDevice() {
  let fromCookie = null, fromLocal = null;
  try {
    const ck = readCookies(); const n = Number(ck[STORE + '_n']) || 0;
    if (n) { let p = ''; for (let i = 0; i < n; i++) p += ck[STORE + '_' + i] || ''; fromCookie = JSON.parse(await unpackStr(p)); }
  } catch (e) { fromCookie = null; }
  try { const r = localStorage.getItem(STORE + '_json'); if (r) fromLocal = JSON.parse(r); } catch (e) {}
  if (fromCookie && fromLocal) return (fromLocal.savedAt || 0) > (fromCookie.savedAt || 0) ? fromLocal : fromCookie;
  return fromCookie || fromLocal;
}
/* ================= 학교 계정 · 서버 저장 ================= */
let DB = null, USER = null, IS_OWNER = false, CONN = 'pending'; // pending | ok | none
let BE = null;           // 'claude' (claude.ai 웹앱 저장소) | 'http' (Cloudflare 서버)
let ADMIN_TOKEN = null, ADMIN_AVAILABLE = false;
async function api(method, path, body, token) {
  let r;
  try {
    r = await withTimeout(fetch('/api' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }), 15000);
  } catch (e) { throw e && e.code ? e : { code: 'network' }; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw { code: 'http', status: r.status, message: j.error || '서버 오류 (' + r.status + ')', data: j };
  return j;
}
const schoolToken = () => (getSession() || {}).token;
function adminTokenGet() { if (ADMIN_TOKEN) return ADMIN_TOKEN; try { return (ADMIN_TOKEN = sessionStorage.getItem(STORE + '_admin')); } catch (e) { return null; } }
function adminTokenSet(t) { ADMIN_TOKEN = t; try { t ? sessionStorage.setItem(STORE + '_admin', t) : sessionStorage.removeItem(STORE + '_admin'); } catch (e) {} }
let CUR = null;          // 현재 로그인한 학교코드
let MODE = 'gate';       // gate | app | admin
let RO = false;          // 최고관리자 보기 모드(읽기 전용)
let OFFLINE = false;     // 서버 없이 이 기기에서만 사용
let DEMO = false;        // 예시 학교 체험 (아무 데도 저장하지 않음)
let ADMIN_VIEW = false;  // 최고관리자 보기
let VIEW_YEAR = null;    // 보고 있는 지난 학년도 (null = 현재 학년도)
let YEARS = [];          // 보관된 지난 학년도 목록
let S_CURRENT = null;    // 지난 학년도를 보는 동안 현재 학년도 자료 보관
let CLAUDE_ARCHIVE = {}; // claude.ai 저장소: 학교 문서의 archive 필드
let remoteWriting = false, remotePending = false, remoteTimer = null, remoteDirty = false, remoteDenied = false;
let REMOTE_AT = 0;          // 서버에서 마지막으로 받은(또는 저장한) 자료의 수정 시각 → 동시 수정 감지용
let LAST_SENT = null;       // 마지막으로 서버에 보낸 내용 (같으면 다시 보내지 않음)
let CONFLICT = false;       // 다른 기기와 충돌해 자동 저장을 멈춘 상태
let remoteDirtySince = 0;   // 서버에 아직 안 올린 첫 변경 시각
const REMOTE_DELAY_HTTP = 30000, REMOTE_MAXWAIT_HTTP = 120000;   // Cloudflare KV 무료 한도(하루 쓰기 1,000회)를 고려해 모아서 저장
const SESSION_KEY = STORE + '_session';
const CODE_RE = /^[A-Za-z0-9_-]{3,20}$/;

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const newSalt = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
const hashPw = (pw, salt) => sha256(salt + ':' + pw);
const schoolRef = (code) => DB.doc('schools/' + code);
function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
function setSession(v) { try { v ? localStorage.setItem(SESSION_KEY, JSON.stringify(v)) : localStorage.removeItem(SESSION_KEY); } catch (e) {} }
function withTimeout(p, ms = 10000) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); }
function dbErrText(e) {
  if (!e) return '알 수 없는 오류';
  if (e.code === 'http') return e.message;
  if (e.code === 'network') return '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.';
  if (e.code === 'invalid_argument') return '이 계정은 저장 권한이 없습니다. 웹앱 소유자에게 ‘편집자’ 초대를 요청하세요.';
  if (e.code === 'timeout') return '서버 응답이 없습니다. 잠시 후 다시 시도하세요.';
  if (e.code === 'quota_exceeded') return '저장 공간이 가득 찼습니다.';
  return '서버 오류 (' + (e.code || e.message || e) + ')';
}

function isDirty() {
  if (RO || DEMO) return false;
  if (CUR && !OFFLINE) return remoteDirty;                                      // 서버 모드: 서버에 아직 안 올라간 변경
  return (S.savedAt || 0) > (S.exportedAt || 0) && hasContent();                // 기기 모드: JSON 미저장
}
function hasContent() { return !!(S.info.school || S.depts.length || S.cal.closures.length || S.quarters.length); }
let cookiePending = false;
function save() {
  if (RO || MODE !== 'app') return;
  if (DEMO) { updateSaveUI('체험 모드 · 저장되지 않음'); return; }
  S.savedAt = Date.now();
  updateSaveUI('저장 중…');
  localBackup();
  try { localStorage.setItem(STORE + '_json', JSON.stringify(snapshot())); } catch (e) {}
  cookiePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => { cookiePending = false; const ok = await saveDevice(); if (!CUR || OFFLINE) updateSaveUI(ok ? '기기(쿠키)에 자동 저장됨' : '이 기기에 자동 저장됨'); }, 400);
  if (CUR && (DB || BE === 'http') && !OFFLINE) {
    if (!remoteDirty) remoteDirtySince = Date.now();
    remoteDirty = true; clearTimeout(remoteTimer);
    if (CONFLICT) { updateSaveUI('다른 기기와 충돌 · 저장 멈춤'); return; }
    if (BE === 'http') {
      const wait = Math.max(0, Math.min(REMOTE_DELAY_HTTP, remoteDirtySince + REMOTE_MAXWAIT_HTTP - Date.now()));
      remoteTimer = setTimeout(flushRemote, wait);
      updateSaveUI('이 기기에 저장됨 · 잠시 뒤 서버에 저장');
    } else remoteTimer = setTimeout(flushRemote, 1000);
  }
}
/* ---- 이 기기 자동 백업: 날마다 처음 고치기 전 상태를 최근 7일치 보관 ---- */
const LOCAL_BK_KEEP = 7;
const localBkKey = () => STORE + '_bk_' + (CUR || 'local');
function localBackups() { try { return JSON.parse(localStorage.getItem(localBkKey()) || '[]'); } catch (e) { return []; } }
function localBackup() {
  if (VIEW_YEAR || RO || DEMO) return;
  try {
    const day = todayIso(), list = localBackups();
    if (list.some((b) => b.day === day)) return;
    const prev = localStorage.getItem(STORE + '_json'); if (!prev) return;
    const ps = JSON.parse(prev); if ((ps._school || null) !== (CUR || null) || !(ps.depts || []).length && !(ps.info || {}).school) return;
    list.unshift({ day, at: ps.savedAt || Date.now(), deptCount: (ps.depts || []).length, json: prev });
    while (list.length > LOCAL_BK_KEEP) list.pop();
    try { localStorage.setItem(localBkKey(), JSON.stringify(list)); }
    catch (e) { while (list.length > 1) { list.pop(); try { localStorage.setItem(localBkKey(), JSON.stringify(list)); return; } catch (e2) {} } }
  } catch (e) {}
}
async function flushRemote(opts = {}) {
  if (!CUR || !(DB || BE === 'http') || OFFLINE || RO) return;
  if (CONFLICT && !opts.force) return;
  if (remoteWriting) { remotePending = true; return; }
  clearTimeout(remoteTimer);
  remoteWriting = true; remoteDirty = false;
  const snap = snapshot();
  try {
    const payload = {
      json: JSON.stringify(snap), name: S.info.school || '', year: S.info.year || '',
      groupCount: S.groups.length, deptCount: S.depts.length, teacherCount: new Set(S.depts.map((d) => d.teacher).filter(Boolean)).size,
    };
    const sig = JSON.stringify(payload);
    if (sig === LAST_SENT && !opts.force && !opts.backupNow) { remoteWriting = false; updateSaveUI('서버에 저장됨'); return; }   // 바뀐 것이 없으면 보내지 않음
    if (BE === 'http') {
      const r = await api('PUT', '/school', { ...payload, baseUpdatedAt: REMOTE_AT || undefined, force: !!opts.force, backupNow: opts.backupNow || undefined }, schoolToken());
      if (r.updatedAt) REMOTE_AT = r.updatedAt;
      if (r.dupName) toast(`같은 이름(${S.info.school})의 학교가 이미 있어, 학교명으로는 로그인할 수 없습니다. 학교코드(${CUR})로 로그인하세요.`);
    } else {
      if (!opts.force && REMOTE_AT) {
        const cur = await withTimeout(schoolRef(CUR).get());
        const at = cur.exists ? cur.data().updatedAt || 0 : 0;
        if (at && at !== REMOTE_AT) throw { code: 'http', status: 409, message: '다른 기기에서 먼저 수정한 내용이 있습니다.', data: { conflict: true, updatedAt: at } };
      }
      const now = Date.now();
      await schoolRef(CUR).update({ ...payload, updatedAt: now, updatedBy: USER_ID || '' }); REMOTE_AT = now; await syncSharesClaude();
    }
    LAST_SENT = sig; CONFLICT = false; remoteDenied = false; remoteDirtySince = 0;
    updateSaveUI('서버에 저장됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
  } catch (e) {
    remoteDirty = true;
    if (e && e.status === 409 && e.data && e.data.conflict) { CONFLICT = true; updateSaveUI('다른 기기와 충돌 · 저장 멈춤'); conflictModal(e.data.updatedAt); }
    else if (e && e.code === 'invalid_argument') { remoteDenied = true; updateSaveUI('서버 저장 권한 없음 (이 기기에만 저장)'); }
    else if (e && e.status === 401) { remoteDenied = true; updateSaveUI('로그인 만료 · 다시 로그인하세요'); toast('로그인이 만료되었습니다. 입력 내용은 이 기기에 남아 있으니 다시 로그인하세요.'); }
    else updateSaveUI('서버 저장 실패 · 다시 시도 중');
    if (!remoteDenied && !CONFLICT) setTimeout(flushRemote, 15000);
  }
  remoteWriting = false;
  if (remotePending) { remotePending = false; flushRemote(); }
}
// 다른 기기(사람)가 먼저 저장한 경우: 서버 내용 불러오기 / 내 내용으로 덮어쓰기 / 내 내용 JSON 저장
function conflictModal(at) {
  const when = at ? new Date(at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '방금';
  modal('다른 곳에서 먼저 수정했습니다', `<p><b>${esc(when)}</b>에 다른 기기(또는 다른 담당자)가 이 학교 자료를 저장했습니다. 지금 화면의 내용을 그대로 저장하면 그 수정 내용이 사라집니다.</p>
    <p>자동 저장을 멈췄습니다. 어떻게 할지 고르세요.</p>
    <div class="choice-list">
      <button class="btn pri" data-cf="load">서버 내용 불러오기 <span class="muted" style="font-weight:400">— 이 화면에서 고친 내용은 버림 (추천)</span></button>
      <button class="btn" data-cf="json">내 내용을 JSON 파일로 먼저 저장</button>
      <button class="btn danger" data-cf="force">내 내용으로 덮어쓰기 <span class="muted" style="font-weight:400">— 다른 곳의 수정 내용이 사라짐</span></button>
    </div>`, '나중에 결정', null, '');
  $$('#modal [data-cf]').forEach((b) => (b.onclick = async () => {
    const k = b.dataset.cf;
    if (k === 'json') { saveJson(); return; }
    $('#modal').classList.remove('open');
    if (k === 'force') { CONFLICT = false; await flushRemote({ force: true, backupNow: 'manual' }); toast('내 내용으로 저장했습니다. 덮어쓰기 전 서버 내용은 백업에 남겨 두었습니다.'); }
    else await reloadFromServer();
  }));
}
async function reloadFromServer() {
  try {
    let doc;
    if (BE === 'http') doc = (await api('GET', '/school', null, schoolToken())).school;
    else { const sn = await withTimeout(schoolRef(CUR).get()); doc = sn.data(); }
    remoteDirty = false; CONFLICT = false;
    try { localStorage.removeItem(STORE + '_json'); } catch (e) {}
    const st = doc.json ? JSON.parse(doc.json) : {};
    st.savedAt = 0; normalize(st); S._school = CUR;
    REMOTE_AT = doc.updatedAt || 0; LAST_SENT = null;
    saveDevice(); render(); updateSaveUI('서버 내용을 불러왔습니다');
    toast('서버에 저장된 최신 내용을 불러왔습니다.');
  } catch (e) { toast(dbErrText(e)); }
}
// claude.ai 저장소: shares/<코드> → 학교코드 색인 유지
let SYNCED_SHARES = null;
async function syncSharesClaude() {
  const now = new Set(S.depts.map((d) => d.share).filter(Boolean));
  const prev = SYNCED_SHARES || new Set();
  for (const c of now) if (!SYNCED_SHARES || !prev.has(c)) { try { await DB.doc('shares/' + c).set({ school: CUR }); } catch (e) {} }
  for (const c of prev) if (!now.has(c)) { try { await DB.doc('shares/' + c).delete(); } catch (e) {} }
  SYNCED_SHARES = now;
}
function updateSaveUI(text) {
  const chip = $('#saveChip');
  if (chip && text) chip.innerHTML = '<i></i>' + esc(text);
  const u = $('#unsaved');
  if (u) {
    const show = MODE === 'app' && isDirty() && (OFFLINE || !CUR || remoteDenied);
    u.style.display = show ? 'flex' : 'none';
  }
}
// 페이지를 떠날 때 아직 쿠키에 쓰지 못한 변경을 즉시(비압축) 기록
function flushCookieSync() {
  if (!cookiePending || VIEW_YEAR) return; cookiePending = false; clearTimeout(saveTimer);
  const packed = 'u' + encodeURIComponent(JSON.stringify(snapshot())), size = 3500, n = Math.ceil(packed.length / size);
  const old = Number(readCookies()[STORE + '_n']) || 0;
  for (let i = 0; i < n; i++) writeCookie(STORE + '_' + i, packed.slice(i * size, (i + 1) * size));
  for (let i = n; i < old; i++) writeCookie(STORE + '_' + i, '', true);
  writeCookie(STORE + '_n', String(n));
}
window.addEventListener('pagehide', () => { flushCookieSync(); if (remoteDirty) flushRemote(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flushCookieSync(); if (remoteDirty) flushRemote(); } });
window.addEventListener('beforeunload', (e) => {
  flushCookieSync();
  if (isDirty()) { e.preventDefault(); e.returnValue = '저장되지 않은 변경 사항이 있습니다.'; return e.returnValue; }
});
let USER_ID = null;
function applyHolidaySettings(o) {
  SETTINGS.holidays = Array.isArray(o && o.holidays) ? o.holidays : [];
  SETTINGS.holidayOff = Array.isArray(o && o.holidayOff) ? o.holidayOff : [];
  setHolidayOverrides(SETTINGS.holidays, SETTINGS.holidayOff);
}
async function initCapabilities() {
  if (!window.claude || !window.claude.use) {
    // claude.ai 밖(예: Cloudflare Pages)에서는 같은 주소의 /api 서버를 사용
    try { const h = await api('GET', '/health'); BE = 'http'; CONN = 'ok'; ADMIN_AVAILABLE = !!h.admin; IS_OWNER = !!adminTokenGet(); SERVER_VERSION = h.version || '1.6 이하'; SETTINGS.allowCreate = h.allowCreate !== false; applyHolidaySettings(h); }
    catch (e) { CONN = 'none'; }
    return;
  }
  BE = 'claude';
  const [dl, db, user] = await Promise.all(['downloads', 'db', 'user'].map((n) => window.claude.use(n).catch(() => null)));
  downloads = dl;
  if (db) {
    DB = db; USER = user;
    try { IS_OWNER = user ? !!(await user.isOwner()) : false; } catch (e) { IS_OWNER = false; }
    try { USER_ID = user ? await user.id() : null; } catch (e) { USER_ID = null; }
    CONN = 'ok';
    try { const sn = await withTimeout(db.doc('settings/app').get(), 8000); if (sn.exists) { SETTINGS.allowCreate = sn.data().allowCreate !== false; applyHolidaySettings(sn.data()); } } catch (e) {}
  } else CONN = 'none';
}

/* ---------- 로그인 / 학교 생성 ---------- */
async function enterSchool(code, doc, opts = {}) {
  let st = null;
  try { st = doc.json ? JSON.parse(doc.json) : null; } catch (e) { st = null; }
  const local = await loadDevice();
  CUR = code; OFFLINE = false; ADMIN_VIEW = !!opts.readonly; RO = ADMIN_VIEW; MODE = 'app'; SYNCED_SHARES = null;
  REMOTE_AT = doc.updatedAt || 0; LAST_SENT = null; CONFLICT = false; remoteDirty = false; remoteDirtySince = 0;
  VIEW_YEAR = null; S_CURRENT = null;
  CLAUDE_ARCHIVE = (BE === 'claude' && doc.archive) || {};
  YEARS = BE === 'http' ? (doc.years || []) : Object.keys(CLAUDE_ARCHIVE).sort();
  if (!RO && local && local._school === code && (local.savedAt || 0) > ((st && st.savedAt) || 0)) { st = local; remoteDirty = true; }
  const needShares = !!(st && (st.depts || []).some((d) => !/^[A-Za-z0-9]{6}$/.test(d.share || '')));
  normalize(st || {});
  if (!st) { S.info.school = doc.name || ''; S.step = 1; }
  S._school = code;
  if (needShares && !RO) setTimeout(save, 0);   // 예전 자료에 강사용 코드가 없으면 만들어 저장
  render(); window.scrollTo(0, 0);
  if (RO) updateSaveUI('최고관리자 보기 (읽기 전용)');
  else { updateSaveUI('서버에 연결됨'); if (remoteDirty) flushRemote(); else if (BE === 'claude') syncSharesClaude(); }
}
const normName = (x) => String(x || '').replace(/\s+/g, '').toLowerCase();
async function claudeSchoolList() {
  const snap = await withTimeout(DB.collection('schools').limit(1000).get());
  return snap.docs.filter((d) => d.exists).map((d) => ({ code: d.id, name: d.data().name || '' }));
}
async function doLogin(code, pw, btn) {
  code = code.trim();
  if (!code || !pw) return gateMsg('login', '학교코드(또는 학교명)와 비밀번호를 입력하세요.');
  btn && (btn.disabled = true);
  try {
    if (BE === 'http') {
      const r = await api('POST', '/login', { id: code, password: pw });
      code = r.school.code;
      setSession({ code, token: r.token }); await enterSchool(code, r.school);
      if (r.school.mustChange) setTimeout(() => changePassword(true), 300);
      return;
    }
    let snap = CODE_RE.test(code) ? await withTimeout(schoolRef(code).get()) : { exists: false };
    if (!snap.exists) {   // 학교명으로 찾기
      const hits = (await claudeSchoolList()).filter((x) => normName(x.name) === normName(code));
      if (hits.length > 1) return gateMsg('login', `같은 이름의 학교가 ${hits.length}곳 있습니다. 학교코드로 로그인하세요.`);
      if (hits.length === 1) { code = hits[0].code; snap = await withTimeout(schoolRef(code).get()); }
    }
    if (!snap.exists) return gateMsg('login', '등록되지 않은 학교입니다. 학교코드나 학교명을 확인하거나 ‘학교 찾기’로 검색해 보세요.');
    const d = snap.data();
    if ((await hashPw(pw, d.salt)) !== d.pwHash) return gateMsg('login', '비밀번호가 맞지 않습니다.');
    setSession({ code, token: d.pwHash });
    await enterSchool(code, d);
    if (d.mustChange) setTimeout(() => changePassword(true), 300);
  } catch (e) { gateMsg('login', dbErrText(e)); }
  finally { btn && (btn.disabled = false); }
}
async function doCreate(name, code, pw, pw2, btn) {
  if (!SETTINGS.allowCreate) return gateMsg('create', '현재 새 학교 생성이 중지되어 있습니다. 최고관리자에게 문의하세요.');
  name = name.trim(); code = code.trim();
  if (!name) return gateMsg('create', '학교명을 입력하세요.');
  if (!CODE_RE.test(code)) return gateMsg('create', '학교코드는 영문·숫자·-·_ 3~20자로 입력하세요. (예: NEIS 학교코드 7자리)');
  if (pw.length < 4) return gateMsg('create', '비밀번호는 4자 이상으로 정하세요.');
  if (pw !== pw2) return gateMsg('create', '비밀번호 확인이 일치하지 않습니다.');
  btn && (btn.disabled = true);
  try {
    if (BE === 'http') {
      const st = blankState(); st.info.school = name; st._school = code; st.savedAt = Date.now();
      const r = await api('POST', '/schools', { code, name, password: pw, json: JSON.stringify(st), year: st.info.year, groupCount: st.groups.length, deptCount: 0, teacherCount: 0 });
      setSession({ code, token: r.token }); await enterSchool(code, r.school);
      toast(r.dupName ? `‘${name}’ 학교를 만들었습니다. 같은 이름의 학교가 이미 있어 로그인은 학교코드(${code})로 해야 합니다.` : `‘${name}’ 학교를 만들었습니다. 1단계부터 입력하세요.`);
      return;
    }
    const ref = schoolRef(code);
    // 같은 코드를 동시에 만드는 경우를 막기 위한 짧은 잠금
    let lease = { acquired: true };
    try { lease = await withTimeout(ref.acquire({ holder: USER_ID || uid(), ttlMs: 5000 })); } catch (e) { if (e && e.code === 'invalid_argument') throw e; }
    if (!lease.acquired) return gateMsg('create', '같은 학교코드로 생성 중인 사람이 있습니다. 잠시 후 다시 시도하세요.');
    const snap = await withTimeout(ref.get());
    if (snap.exists && snap.data() && snap.data().pwHash) return gateMsg('create', '이미 등록된 학교코드입니다. 로그인하거나 최고관리자에게 비밀번호 초기화를 요청하세요.');
    const salt = newSalt(), pwHash = await hashPw(pw, salt);
    const st = blankState(); st.info.school = name; st._school = code; st.savedAt = Date.now();
    const doc = { code, name, salt, pwHash, json: JSON.stringify(st), year: st.info.year, groupCount: st.groups.length, deptCount: 0, teacherCount: 0, createdAt: Date.now(), updatedAt: Date.now(), createdBy: USER_ID || '', mustChange: false };
    await withTimeout(ref.set(doc));
    setSession({ code, token: pwHash });
    await enterSchool(code, doc);
    toast(`‘${name}’ 학교를 만들었습니다. 1단계부터 입력하세요.`);
  } catch (e) { gateMsg('create', dbErrText(e)); }
  finally { btn && (btn.disabled = false); }
}
async function searchSchools(q) {
  const box = $('#findResult'); if (!box) return;
  q = q.trim();
  if (!q) { box.innerHTML = '<div class="help">학교명이나 학교코드의 일부를 입력하세요.</div>'; return; }
  box.innerHTML = '<div class="help">찾는 중…</div>';
  try {
    let list;
    if (BE === 'http') list = (await api('GET', '/schools?q=' + encodeURIComponent(q))).schools;
    else list = (await claudeSchoolList()).filter((x) => normName(x.name).includes(normName(q)) || x.code.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
    box.innerHTML = list.length ? `<div class="find-list">${list.map((x) => `<div class="find-row"><div><b>${esc(x.name || '(이름 없음)')}</b> <span class="muted num">${esc(x.code)}</span></div><button class="btn sm" type="button" data-pick="${esc(x.code)}">이 학교로 로그인</button></div>`).join('')}</div>
      <div class="help">${list.length >= 30 ? '30곳까지만 표시합니다. 더 자세히 입력하세요. ' : ''}목록에 없으면 ‘새 학교 만들기’로 등록하세요.</div>`
      : `<div class="alert info" style="margin:0">‘${esc(q)}’(으)로 등록된 학교가 없습니다. ‘새 학교 만들기’로 등록하세요.</div>`;
  } catch (e) { box.innerHTML = `<div class="alert warn" style="margin:0">${esc(dbErrText(e))}</div>`; }
}
function gateMsg(which, text) { const el = $('#msg-' + which); if (el) { el.textContent = text; el.style.display = text ? 'flex' : 'none'; } }
async function logout() {
  if (remoteDirty && !RO) await flushRemote();
  if (VIEW_YEAR && S_CURRENT) { S = S_CURRENT; }
  if (remoteDirty) await flushRemote();
  setSession(null); CUR = null; RO = false; ADMIN_VIEW = false; VIEW_YEAR = null; S_CURRENT = null; YEARS = []; OFFLINE = false; MODE = 'gate'; S = blankState();
  render(); window.scrollTo(0, 0);
}
function changePassword(forced) {
  modal(forced ? '새 비밀번호 설정' : '비밀번호 변경', `${forced ? '<p>최고관리자가 초기화한 임시 비밀번호로 로그인했습니다. 새 비밀번호를 정하세요.</p>' : ''}
    <div class="field"><label>새 비밀번호 (4자 이상)</label><input class="in" type="password" id="npw1" autocomplete="new-password"></div>
    <div class="field" style="margin-top:10px"><label>새 비밀번호 확인</label><input class="in" type="password" id="npw2" autocomplete="new-password"></div>
    <div class="alert warn" id="npwMsg" style="display:none"></div>`, '변경', (m) => {
    const a = m.querySelector('#npw1').value, b = m.querySelector('#npw2').value, msg = m.querySelector('#npwMsg');
    if (a.length < 4) { msg.textContent = '4자 이상 입력하세요.'; msg.style.display = 'flex'; return false; }
    if (a !== b) { msg.textContent = '확인이 일치하지 않습니다.'; msg.style.display = 'flex'; return false; }
    (async () => {
      try {
        if (BE === 'http') { const r = await api('POST', '/school/password', { password: a }, schoolToken()); setSession({ code: CUR, token: r.token }); }
        else { const salt = newSalt(), pwHash = await hashPw(a, salt); await schoolRef(CUR).update({ salt, pwHash, mustChange: false }); setSession({ code: CUR, token: pwHash }); }
        remoteDenied = false; toast('비밀번호를 변경했습니다.');
      }
      catch (e) { toast(dbErrText(e)); }
    })();
  }, forced ? '' : '취소');
}

/* ---------- 학년도 전환 · 지난 학년도 조회 ---------- */
const curYear = () => (VIEW_YEAR && S_CURRENT ? S_CURRENT.info.year : S.info.year);
function archiveMapLocal() { const base = VIEW_YEAR && S_CURRENT ? S_CURRENT : S; return base._archive || {}; }
function allYears() {
  const list = (CUR && !OFFLINE && !DEMO) ? YEARS : Object.keys(archiveMapLocal());
  return [...new Set([...list.map(String), String(curYear() || '')])].filter(Boolean).sort();
}
async function loadArchiveState(year) {
  if (!CUR || OFFLINE || DEMO) { const a = archiveMapLocal()[year]; return typeof a === 'string' ? JSON.parse(a) : a; }
  if (BE === 'http') { const r = await api('GET', ADMIN_VIEW ? `/admin/schools/${CUR}/archive/${year}` : `/school/archive/${year}`, null, ADMIN_VIEW ? adminTokenGet() : schoolToken()); return JSON.parse(r.json); }
  const a = CLAUDE_ARCHIVE[year]; return a ? JSON.parse(a) : null;
}
async function switchYear(year) {
  year = String(year);
  const cy = String(curYear());
  if (year === cy) {
    if (!VIEW_YEAR) return;
    S = S_CURRENT; S_CURRENT = null; VIEW_YEAR = null; RO = ADMIN_VIEW;
    render(); window.scrollTo(0, 0); updateSaveUI(ADMIN_VIEW ? '최고관리자 보기 (읽기 전용)' : CUR ? '서버에 연결됨' : ''); return;
  }
  if (!VIEW_YEAR && remoteDirty && !ADMIN_VIEW) await flushRemote();
  try {
    const st = await loadArchiveState(year);
    if (!st) { toast('보관된 자료를 찾을 수 없습니다.'); render(); return; }
    if (!VIEW_YEAR) S_CURRENT = S;
    const keepUi = { ...S.ui };
    normalize(st); S.ui = Object.assign(S.ui, { tab: keepUi.tab, unit: keepUi.unit }); S.step = LAST_STEP;
    VIEW_YEAR = year; RO = true;
    render(); window.scrollTo(0, 0); updateSaveUI(year + '학년도 · 조회 전용');
  } catch (e) { toast(dbErrText(e)); render(); }
}
// 1학기 종료일·2학기 시작일 → 여름방학 자동 입력
function autoSummer() {
  const c = S.cal, e1 = d2n(c.sem1End), s2 = d2n(c.sem2Start);
  if (isNaN(e1) && isNaN(s2)) return;
  let v = c.vacations.find((x) => /여름/.test(x.name)) || c.vacations.find((x) => semOfItem(x) === 1 && !x.start);
  if (!v) { v = { id: uid(), sem: 1, name: '여름방학', start: '', end: '', run: true }; c.vacations.unshift(v); }
  if (v.auto === false && v.start && v.end) { toast('여름방학 날짜는 직접 고친 값이라 그대로 두었습니다.'); return; }
  const ns = isNaN(e1) ? v.start : n2d(e1 + 1), ne = isNaN(s2) ? v.end : n2d(s2 - 1);
  if (ns && ne && d2n(ne) < d2n(ns)) return toast('1학기 종료일이 2학기 시작일보다 늦습니다. 날짜를 확인하세요.');
  v.start = ns || ''; v.end = ne || ''; v.sem = 1; v.auto = true;
  S.ui.semOpen[1] = true;
  if (v.start && v.end) toast(`${v.name}을 ${fmtDate(v.start)} ~ ${fmtDate(v.end)}로 맞췄습니다.`);
  else if (!v.start) toast('여름방학 종료일을 맞췄습니다. 1학기 종료일(여름방학식)을 넣으면 시작일도 채워집니다.');
  else toast('여름방학 시작일을 맞췄습니다. 2학기 시작일을 넣으면 종료일도 채워집니다.');
}
// 학사일정 기간의 평일 공휴일 중 휴업일로 들어 있지 않은 날 (새로 지정된 임시공휴일 등 안내용)
function missingHolidays() {
  const c = S.cal; if (isNaN(d2n(c.start)) || isNaN(d2n(c.end))) return [];
  const covered = new Set(), ign = new Set(c.holIgnore || []);
  c.closures.forEach((h) => { const a = d2n(h.start), b = isNaN(d2n(h.end)) ? a : d2n(h.end); if (!isNaN(a)) for (let k = a; k <= b; k++) covered.add(k); });
  // 방학 중 미운영 기간은 안내하지 않음
  c.vacations.forEach((v) => { const a = d2n(v.start), b = d2n(v.end); if (!v.run && !isNaN(a) && !isNaN(b)) for (let k = a; k <= b; k++) covered.add(k); });
  return holidaysInRange(c.start, c.end).filter((h) => { const n = d2n(h.date), w = dowOf(n); return w > 0 && w < 6 && !covered.has(n) && !ign.has(h.date); });
}
// 다음 평일: 주말과 학사일정의 공휴일을 건너뜀
function nextWeekday(iso) {
  let n = d2n(iso); if (isNaN(n)) return '';
  const hol = new Set();
  S.cal.closures.filter((c) => c.type === '공휴일').forEach((c) => { const a = d2n(c.start), b = isNaN(d2n(c.end)) ? a : d2n(c.end); if (!isNaN(a)) for (let k = a; k <= b; k++) hol.add(k); });
  for (let i = 0; i < 31; i++) { n++; const w = dowOf(n); if (w !== 0 && w !== 6 && !hol.has(n)) break; }
  return n2d(n);
}
function shiftYear(iso, add = 1) {
  if (!iso || isNaN(d2n(iso))) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const lastOld = new Date(Date.UTC(y, m, 0)).getUTCDate(), lastNew = new Date(Date.UTC(y + add, m, 0)).getUTCDate();
  const nd = d === lastOld ? lastNew : Math.min(d, lastNew);
  return (y + add) + '-' + String(m).padStart(2, '0') + '-' + String(nd).padStart(2, '0');
}
function rolloverModal() {
  const y = Number(S.info.year), ny = y + 1;
  if (!y) return toast('1단계에서 학년도를 먼저 입력하세요.');
  if (allYears().includes(String(ny))) return toast(ny + '학년도 자료가 이미 있습니다.');
  const nonHol = S.cal.closures.filter((c) => c.type !== '공휴일').length;
  modal(`${ny}학년도로 전환`, `<p><b>${esc(S.info.school)}</b>의 ${y}학년도 자료를 보관하고 ${ny}학년도를 시작합니다. 전환 뒤 ${y}학년도는 상단의 학년도 선택에서 <b>조회만</b> 할 수 있습니다.</p>
    <div class="ro-opts">
      <label class="chk"><input type="checkbox" checked disabled> 분류·프로그램·강사·요일·차시·수업료 그대로 복사 <span class="muted">(휴강·보강일은 비움)</span></label>
      <label class="chk"><input type="checkbox" id="roShare" checked> 강사용 링크 유지 <span class="muted">(같은 링크로 ${ny}학년도 수업을 보게 됨)</span></label>
      <label class="chk"><input type="checkbox" id="roQuarter" checked> 분기 날짜를 1년 뒤로 옮겨 복사 <span class="muted">(끄면 기본 4분기로 새로 만듦)</span></label>
      <label class="chk"><input type="checkbox" id="roHol" checked> ${ny}학년도 공휴일 자동 추가</label>
      <label class="chk"><input type="checkbox" id="roClosure"> 공휴일 외 휴업일 ${nonHol}건(개교기념일·재량휴업일·방과후 미운영 등)도 날짜를 1년 뒤로 옮겨 복사</label>
    </div>
    <div class="alert info" style="margin-top:10px"><div>방학은 이름과 운영 여부만 남기고 날짜를 비웁니다. 프로그램별 운영기간·결강일·보강일도 지난 학년도 날짜라 비웁니다. 전환 뒤 <b>2단계 학사일정</b>을 확인·수정하세요.</div></div>`, `${ny}학년도로 전환`, (m) => {
    const opt = { share: m.querySelector('#roShare').checked, quarter: m.querySelector('#roQuarter').checked, hol: m.querySelector('#roHol').checked, closure: m.querySelector('#roClosure').checked };
    doRollover(opt); return true;
  });
}
function buildNextYear(prev, opt) {
  const y = Number(prev.info.year), ny = y + 1;
  const nx = JSON.parse(JSON.stringify(prev));
  delete nx._archive;
  nx.info.year = ny;
  nx.cal.start = ny + '-03-01'; nx.cal.end = n2d(d2n((ny + 1) + '-03-01') - 1); nx.cal.sem2Start = '';
  nx.cal.vacations = prev.cal.vacations.map((v) => ({ ...v, id: uid(), start: '', end: '' }));
  nx.cal.closures = opt.closure ? prev.cal.closures.filter((c) => c.type !== '공휴일').map((c) => ({ ...c, id: uid(), start: shiftYear(c.start), end: c.end ? shiftYear(c.end) : '' })) : [];
  if (opt.hol) holidaysInRange(nx.cal.start, nx.cal.end).forEach((h) => { const w = dowOf(d2n(h.date)); if (w > 0 && w < 6 && !nx.cal.closures.some((c) => c.start === h.date)) nx.cal.closures.push({ id: uid(), sem: 0, start: h.date, end: '', name: h.name, type: '공휴일' }); });
  nx.cal.closures.sort((a, b) => (a.start < b.start ? -1 : 1));
  nx.quarters = opt.quarter ? prev.quarters.map((q) => ({ ...q, id: uid(), start: shiftYear(q.start), end: shiftYear(q.end) })) : [];
  if (!opt.quarter) {
    [['1분기', '-03-01', '-05-31'], ['2분기', '-06-01', '-08-31'], ['3분기', '-09-01', '-11-30']].forEach(([n, a, b]) => nx.quarters.push({ id: uid(), name: n, start: ny + a, end: ny + b }));
    nx.quarters.push({ id: uid(), name: '4분기', start: ny + '-12-01', end: nx.cal.end });
  }
  nx.depts = prev.depts.map((d) => ({ ...d, start: '', end: '', except: '', extra: '', cancels: [], makeups: [], open: false, share: opt.share ? d.share : newShare() }));
  nx.cal.sem1End = ''; nx.cal.holIgnore = [];
  nx.step = 2; nx.savedAt = Date.now(); nx.exportedAt = 0;
  nx.ui = Object.assign({}, prev.ui, { tab: 'progress', asOf: '', scope: '', sort: {}, statFold: {} });
  return nx;
}
async function doRollover(opt) {
  const prev = snapshot(); const y = String(prev.info.year);
  const archived = JSON.parse(JSON.stringify(prev)); delete archived._archive;
  const nx = buildNextYear(prev, opt);
  try {
    if (CUR && !OFFLINE && !DEMO) {
      if (remoteDirty) await flushRemote();
      const meta = { name: nx.info.school || '', year: nx.info.year, groupCount: nx.groups.length, deptCount: nx.depts.length, teacherCount: new Set(nx.depts.map((d) => d.teacher).filter(Boolean)).size };
      if (BE === 'http') {
        const r = await api('POST', '/school/rollover', { ...meta, archiveYear: y, archiveJson: JSON.stringify(archived), json: JSON.stringify(nx) }, schoolToken());
        YEARS = r.years; if (r.updatedAt) REMOTE_AT = r.updatedAt; LAST_SENT = null;
      } else {
        const sn = await withTimeout(schoolRef(CUR).get());
        if (sn.exists && sn.data().archive && sn.data().archive[y]) throw { code: 'http', message: y + '학년도는 이미 보관되어 있습니다.' };
        const at = Date.now(); await schoolRef(CUR).update({ archive: { [y]: JSON.stringify(archived) }, json: JSON.stringify(nx), ...meta, updatedAt: at }); REMOTE_AT = at; LAST_SENT = null;
        CLAUDE_ARCHIVE[y] = JSON.stringify(archived); YEARS = Object.keys(CLAUDE_ARCHIVE).sort();
      }
      normalize(nx); S._school = CUR; remoteDirty = false;
      if (BE === 'claude') { SYNCED_SHARES = null; syncSharesClaude(); }
      saveDevice();
    } else {
      nx._archive = Object.assign({}, prev._archive || {}, { [y]: archived });
      normalize(nx);
      if (!DEMO) { S.savedAt = Date.now(); saveDevice(); }
    }
    S.step = 2; render(); window.scrollTo(0, 0);
    toast(`${nx.info.year}학년도로 전환했습니다. 학사일정(방학·휴업일)과 분기를 확인·수정하세요.`);
  } catch (e) { toast(dbErrText(e)); }
}

/* ---------- 첫 화면 ---------- */
function renderGate() {
  const ok = CONN === 'ok';
  return `<div class="gate">
    <div class="gate-hero"><h2>방과후학교 수업시수 계산기</h2><div class="brand-hero">ClassCount</div><p>학사일정을 바탕으로 강사별·분기별 수업시수와 수업료를 계산합니다. 학교를 만들거나 학교코드·학교명으로 로그인하세요.</p>
      <button class="btn demo-btn" data-act="demo">▶ 예시 학교로 체험하기 <span class="muted" style="font-weight:400">— 가입 없이, 저장되지 않음</span></button></div>
    ${CONN === 'pending' ? '<div class="alert info">서버에 연결하는 중입니다…</div>' : ''}
    ${CONN === 'none' ? `<div class="alert warn"><div><b>서버 저장소에 연결할 수 없습니다.</b> ${window.claude ? 'claude.ai에 로그인한 상태에서 열어야 학교 계정을 쓸 수 있습니다.' : '이 주소에는 학교 계정용 서버(/api)가 없습니다(예: GitHub Pages 배포). Cloudflare Pages에 배포했다면 KV 연결(변수 이름 SCHOOL)과 재배포 여부를 확인하세요.'} 아래 ‘서버 없이 이 기기에서만 사용’이나 ‘예시 학교로 체험하기’로 바로 쓸 수 있습니다.</div></div>` : ''}
    <div class="grid g2 gate-cards">
      <form class="card" data-form="login" autocomplete="on">
        <h3>학교 로그인</h3>
        <div class="field"><label>학교코드 또는 학교명</label><input class="in" name="code" autocomplete="username" placeholder="예: 7031234 또는 ○○초등학교" ${ok ? '' : 'disabled'}></div>
        <div class="field"><label>비밀번호</label><input class="in" name="pw" type="password" autocomplete="current-password" ${ok ? '' : 'disabled'}></div>
        <div class="alert warn" id="msg-login" style="display:none"></div>
        <button class="btn pri" type="submit" ${ok ? '' : 'disabled'} style="width:100%;justify-content:center;margin-top:6px">로그인</button>
      </form>
      <form class="card ${SETTINGS.allowCreate ? '' : 'create-off'}" data-form="create" autocomplete="off">
        <h3>새 학교 만들기</h3>
        ${SETTINGS.allowCreate ? '' : `<div class="alert warn" style="margin:0"><div><b>새 학교 생성이 중지되어 있습니다.</b> 이미 등록된 학교는 왼쪽에서 로그인하세요. 새로 등록하려면 최고관리자에게 문의하세요.${IS_OWNER ? ' (최고관리자는 ‘전체 학교 관리’에서 다시 켤 수 있습니다.)' : ''}</div></div>`}
        <div class="field"><label>학교명</label><input class="in" name="name" placeholder="예: ○○초등학교" ${ok ? '' : 'disabled'}></div>
        <div class="field"><label>학교코드 <span class="opt">(로그인 아이디, 예: NEIS 학교코드)</span></label><input class="in" name="code" placeholder="영문·숫자 3~20자" ${ok ? '' : 'disabled'}></div>
        <div class="grid g2"><div class="field"><label>비밀번호</label><input class="in" name="pw" type="password" autocomplete="new-password" ${ok ? '' : 'disabled'}></div>
        <div class="field"><label>비밀번호 확인</label><input class="in" name="pw2" type="password" autocomplete="new-password" ${ok ? '' : 'disabled'}></div></div>
        <div class="alert warn" id="msg-create" style="display:none"></div>
        <button class="btn pri" type="submit" ${ok ? '' : 'disabled'} style="width:100%;justify-content:center;margin-top:6px">학교 생성</button>
      </form>
    </div>
    <form class="card find-card" data-form="find"><div class="sec-h" style="margin:0"><h3 style="margin:0">등록된 학교 찾기</h3><span class="hint">이미 만들어진 학교인지 확인하세요.</span><span class="sp"></span>
      <input class="in" name="q" placeholder="학교명 또는 학교코드 일부" style="width:220px" ${ok ? '' : 'disabled'}><button class="btn" type="submit" ${ok ? '' : 'disabled'}>찾기</button></div><div id="findResult" style="margin-top:10px"></div></form>
    <form class="card teacher-card" data-form="teacher"><div class="sec-h" style="margin:0"><h3 style="margin:0">강사용 조회</h3><span class="hint">학교에서 받은 6자리 조회 코드를 입력하세요.</span><span class="sp"></span>
      <input class="in" name="tcode" maxlength="6" placeholder="예: Ab3xK9" style="width:140px;letter-spacing:1px" ${ok ? '' : 'disabled'}><button class="btn" type="submit" ${ok ? '' : 'disabled'}>조회</button></div></form>
    ${IS_OWNER ? `<div class="card admin-card"><div class="sec-h"><h3>최고관리자</h3><span class="tag acc">${BE === 'http' ? '로그인됨' : '소유자 계정으로 인식됨'}</span>${BE === 'http' ? '<button class="btn sm ghost" data-act="adminLogout">관리자 로그아웃</button>' : ''}<span class="sp"></span><button class="btn pri" data-act="openAdmin">전체 학교 관리</button></div><p class="lead" style="margin:0">등록된 모든 학교의 목록과 입력 내용을 보고, 비밀번호를 초기화할 수 있습니다.</p></div>` : ''}
    <div class="gate-foot">${BE === 'http' && !IS_OWNER ? '<button class="btn sm ghost" data-act="adminLogin">최고관리자 로그인</button>' : ''}<button class="btn sm ghost" data-act="offline">서버 없이 이 기기에서만 사용</button><button class="btn sm ghost" data-act="restoreOffline">JSON 파일로 열기</button></div>
    <p class="help" style="text-align:center">학교 비밀번호는 화면 잠금 수준의 보호입니다. 개인정보(학생 이름 등)는 입력하지 마세요.</p>
  </div>`;
}

/* ---------- 최고관리자 ---------- */
let ADMIN = { list: null, err: '', sort: { col: 'updatedAt', dir: 'desc' }, q: '' };
async function loadAdminList() {
  ADMIN.err = ''; ADMIN.list = null; if (MODE === 'admin') render();
  try {
    if (BE === 'http') ADMIN.list = (await api('GET', '/admin/schools', null, adminTokenGet())).schools;
    else {
      const snap = await withTimeout(DB.collection('schools').limit(1000).get());
      ADMIN.list = snap.docs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    if (e && e.status === 401) { adminTokenSet(null); IS_OWNER = false; MODE = 'gate'; render(); toast('최고관리자 로그인이 만료되었습니다.'); return; }
    ADMIN.err = dbErrText(e); ADMIN.list = [];
  }
  if (MODE === 'admin') render();
}
function renderAdmin() {
  if (!IS_OWNER) return '<div class="card"><div class="alert warn">최고관리자(웹앱 소유자)만 볼 수 있습니다.</div></div>';
  const L = ADMIN.list;
  const fd = (t) => (t ? new Date(t).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');
  let rows = (L || []).filter((s) => !ADMIN.q || (s.name + ' ' + s.id).toLowerCase().includes(ADMIN.q.toLowerCase()));
  const { col, dir } = ADMIN.sort;
  rows = rows.slice().sort((a, b) => { const x = a[col] == null ? '' : a[col], y = b[col] == null ? '' : b[col]; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko'); return dir === 'desc' ? -c : c; });
  const th = (k, label, cls = '') => `<th class="sortable ${cls}" data-asort="${k}">${label}${col === k ? `<span class="ar">${dir === 'desc' ? '▼' : '▲'}</span>` : ''}</th>`;
  return `<div class="card">
    <div class="toolbar"><div><h2 style="margin:0">전체 학교 관리</h2><div class="help" style="margin:0">최고관리자 전용 · 등록 학교 ${L ? L.length : '…'}곳</div></div><span class="sp"></span>
      <label class="admin-toggle" title="첫 화면의 ‘새 학교 만들기’를 켜거나 끕니다"><span class="toggle"><input type="checkbox" id="allowCreate" ${SETTINGS.allowCreate ? 'checked' : ''}><span></span></span>새 학교 생성 <b class="${SETTINGS.allowCreate ? 'on' : 'off'}">${SETTINGS.allowCreate ? '허용' : '중지'}</b></label>
      <input class="in sm" style="width:200px" placeholder="학교명·코드 검색" data-admin-q value="${esc(ADMIN.q)}">
      <button class="btn sm" data-act="holidayAdmin">공휴일 관리</button><button class="btn sm" data-act="adminExport">전체 백업 받기</button>
      <button class="btn sm" data-act="adminRefresh">새로고침</button><button class="btn sm" data-act="toGate">← 첫 화면</button></div>
    ${ADMIN.err ? `<div class="alert warn">${esc(ADMIN.err)}</div>` : ''}
    ${L === null ? '<div class="empty">불러오는 중…</div>' : `<div class="tbl-wrap"><table class="t"><thead><tr>${th('name', '학교명')}${th('id', '학교코드')}${th('year', '학년도', 'r')}${th('groupCount', '분류', 'r')}${th('deptCount', '프로그램', 'r')}${th('teacherCount', '강사', 'r')}${th('createdAt', '생성일')}${th('updatedAt', '마지막 수정')}<th></th></tr></thead><tbody>
      ${rows.map((s) => `<tr><td><b>${esc(s.name || '(이름 없음)')}</b>${s.mustChange ? ' <span class="tag warn">임시 비밀번호</span>' : ''}</td><td class="num">${esc(s.id)}</td><td class="r num">${esc(s.year || '')}</td><td class="r num">${fmt(s.groupCount)}</td><td class="r num">${fmt(s.deptCount)}</td><td class="r num">${fmt(s.teacherCount)}</td><td class="num muted">${fd(s.createdAt)}</td><td class="num">${fd(s.updatedAt)}</td>
        <td class="r" style="white-space:nowrap"><button class="btn sm" data-aview="${esc(s.id)}">입력사항 보기</button> <button class="btn sm" data-areset="${esc(s.id)}">비밀번호 초기화</button> <button class="btn sm icon ghost danger" data-adel="${esc(s.id)}" title="학교 삭제">✕</button></td></tr>`).join('') || `<tr><td colspan="9" class="empty">${ADMIN.q ? '검색 결과가 없습니다.' : '등록된 학교가 없습니다.'}</td></tr>`}
    </tbody></table></div>`}
    <div class="help">‘공휴일 관리’에서 임시공휴일·선거일을 추가하면 모든 학교에 안내됩니다. ‘전체 백업 받기’는 모든 학교의 입력 자료(지난 학년도 포함, 비밀번호 제외)를 JSON 파일 하나로 저장합니다. ‘입력사항 보기’는 읽기 전용으로 열립니다. 학교 담당자가 비밀번호를 잊으면 ‘비밀번호 초기화’로 임시 비밀번호를 만들어 알려 주세요. 다음 로그인 때 새 비밀번호를 정하게 됩니다.</div>
  </div>`;
}
async function setAllowCreate(on) {
  try {
    if (BE === 'http') SETTINGS = { ...SETTINGS, ...(await api('PUT', '/admin/settings', { allowCreate: on }, adminTokenGet())) };
    else { await withTimeout(DB.doc('settings/app').set({ allowCreate: on, updatedAt: Date.now() })); SETTINGS.allowCreate = on; }
    toast(on ? '새 학교 생성을 허용했습니다.' : '새 학교 생성을 중지했습니다. 첫 화면에서 학교를 새로 만들 수 없습니다.');
  } catch (e) { toast(dbErrText(e)); }
  render();
}
function adminReset(code) {
  const s = (ADMIN.list || []).find((x) => x.id === code); if (!s) return;
  const temp = String(Math.floor(100000 + Math.random() * 900000));
  modal('비밀번호 초기화', `<p><b>${esc(s.name)}</b> (${esc(code)})의 비밀번호를 아래 임시 비밀번호로 바꿉니다. 학교 담당자는 다음 로그인 때 새 비밀번호를 정해야 합니다.</p>
    <div class="field"><label>임시 비밀번호</label><input class="in num" id="tmpPw" value="${temp}" style="font-size:18px;letter-spacing:2px"></div>`, '초기화', (m) => {
    const pw = m.querySelector('#tmpPw').value.trim(); if (pw.length < 4) { toast('4자 이상 입력하세요.'); return false; }
    (async () => {
      try {
        if (BE === 'http') await api('POST', '/admin/schools/' + code + '/reset', { password: pw }, adminTokenGet());
        else { const salt = newSalt(); await schoolRef(code).update({ salt, pwHash: await hashPw(pw, salt), mustChange: true, resetAt: Date.now() }); }
        toast(`초기화했습니다. 임시 비밀번호: ${pw}`); loadAdminList();
      }
      catch (e) { toast(dbErrText(e)); }
    })();
  });
}
function adminDelete(code) {
  const s = (ADMIN.list || []).find((x) => x.id === code); if (!s) return;
  modal('학교 삭제', `<p><b>${esc(s.name)}</b> (${esc(code)})의 모든 입력 자료를 삭제합니다. 되돌릴 수 없습니다. 확인을 위해 학교코드를 입력하세요.</p><input class="in" id="delCode" placeholder="${esc(code)}">`, '삭제', (m) => {
    if (m.querySelector('#delCode').value.trim() !== code) { toast('학교코드가 일치하지 않습니다.'); return false; }
    (async () => { try { if (BE === 'http') await api('DELETE', '/admin/schools/' + code, null, adminTokenGet()); else { try { const sn = await schoolRef(code).get(); const st = sn.exists ? JSON.parse(sn.data().json || '{}') : {}; for (const d of st.depts || []) if (d.share) await DB.doc('shares/' + d.share).delete(); } catch (er) {} await schoolRef(code).delete(); } toast('삭제했습니다.'); loadAdminList(); } catch (e) { toast(dbErrText(e)); } })();
  });
}
async function adminView(code) {
  try {
    if (BE === 'http') { const r = await api('GET', '/admin/schools/' + code, null, adminTokenGet()); await enterSchool(code, r.school, { readonly: true }); return; }
    const snap = await withTimeout(schoolRef(code).get()); if (!snap.exists) { toast('학교를 찾을 수 없습니다.'); return; } await enterSchool(code, snap.data(), { readonly: true });
  }
  catch (e) { toast(dbErrText(e)); }
}

/* ================= 공통 ================= */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2800); }
function modal(title, body, okText, onOk, cancelText = '취소') {
  const m = $('#modal');
  m.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${body}<div class="acts">${cancelText ? `<button class="btn" data-x>${esc(cancelText)}</button>` : ''}<button class="btn pri" data-ok>${esc(okText)}</button></div></div>`;
  m.classList.add('open');
  const x = m.querySelector('[data-x]'); if (x) x.onclick = () => m.classList.remove('open');
  m.querySelector('[data-ok]').onclick = () => { if (!onOk || onOk(m) !== false) m.classList.remove('open'); };
}
const confirmBox = (title, text, okText, onOk) => modal(title, `<p>${text}</p>`, okText, onOk);
function fmtDate(iso, withDow = true) {
  if (!iso) return ''; const n = d2n(iso); if (isNaN(n)) return iso;
  const [, m, d] = iso.split('-'); return Number(m) + '.' + Number(d) + '.' + (withDow ? '(' + DOW[dowOf(n)] + ')' : '');
}
const scopeName = () => S.ui.scope || S.info.semester || '연간';
const yearLabel = () => (S.info.year ? S.info.year + '학년도' : '');
const groupOf = (id) => S.groups.find((g) => g.id === id);
function reorderDepts() {
  const order = new Map(S.groups.map((g, i) => [g.id, i]));
  S.depts = S.depts.map((d, i) => [d, i]).sort((a, b) => (order.get(a[0].group) - order.get(b[0].group)) || (a[1] - b[1])).map((x) => x[0]);
}
// 날짜 → 학기 (2학기 시작일 기준, 없으면 3~8월=1학기)
function semOfDate(iso) {
  const n = d2n(iso); if (isNaN(n)) return 0;
  const s2 = d2n(S.cal.sem2Start);
  if (!isNaN(s2)) return n < s2 ? 1 : 2;
  const m = Number(iso.slice(5, 7)); return m >= 3 && m <= 8 ? 1 : 2;
}
const semOfItem = (it) => semOfDate(it.start) || it.sem || 1;

/* ================= 단계 완료 판정 ================= */
function stepDone(i) {
  switch (i) {
    case 1: return !!(S.info.school && S.info.year);
    case 2: return !isNaN(d2n(S.cal.start)) && !isNaN(d2n(S.cal.end)) && d2n(S.cal.end) > d2n(S.cal.start);
    case 3: return S.quarters.length > 0 && S.quarters.every((q) => !isNaN(d2n(q.start)) && !isNaN(d2n(q.end)));
    case 4: return S.depts.some((d) => d.name && d.days.length);
    case 5: return stepDone(4) && S.depts.some((d) => (d.cancels || []).length || (d.makeups || []).length);
    case 6: return stepDone(2) && stepDone(3) && stepDone(4);
  }
  return false;
}

/* ================= 렌더 ================= */
function renderHeader() {
  const who = $('#who'), inApp = MODE === 'app';
  who.innerHTML = inApp && DEMO ? '<span class="tag gold">체험 모드 · 예시 학교</span>' : inApp && CUR ? `<span class="tag ${ADMIN_VIEW ? 'warn' : 'acc'}">${ADMIN_VIEW ? '관리자 보기' : '학교'} · ${esc(CUR)}</span>` : inApp && OFFLINE ? '<span class="tag">이 기기 전용</span>' : MODE === 'admin' ? '<span class="tag warn">최고관리자</span>' : MODE === 'teacher' ? '<span class="tag vac">강사용 조회 · 읽기 전용</span>' : '';
  $$('.app-only,.srv-only,.ro-hide,.owner-only').forEach((el) => {
    const c = el.classList;
    const hide = (c.contains('app-only') && !inApp) || (c.contains('ro-hide') && RO) || (c.contains('srv-only') && !(inApp && CUR && !RO)) || (c.contains('owner-only') && !(IS_OWNER && MODE !== 'admin'));
    el.style.display = hide ? 'none' : '';
  });
  $('#saveChip').style.display = inApp ? '' : 'none';
  const ys = $('#yearSel');
  const years = allYears();
  if (inApp && years.length > 1) {
    const cy = String(curYear());
    ys.innerHTML = years.map((y) => `<option value="${y}" ${String(VIEW_YEAR || cy) === String(y) ? 'selected' : ''}>${y}학년도${String(y) === cy ? ' (현재)' : ' (조회 전용)'}</option>`).join('');
    ys.style.display = '';
  } else ys.style.display = 'none';
  document.body.classList.toggle('ro', RO);
}
function renderFooter() {
  const f = $('#appFooter'); if (!f) return;
  const env = BE === 'http' ? 'Cloudflare' : BE === 'claude' ? 'claude.ai' : OFFLINE || DEMO ? '이 기기' : '';
  const mismatch = BE === 'http' && SERVER_VERSION && SERVER_VERSION !== APP_VERSION;
  f.innerHTML = `<span><b>ClassCount</b> 방과후학교 수업시수 계산기</span><span class="dot">·</span><span class="num">v${APP_VERSION}</span><span class="dot">·</span><span class="num">${APP_DATE}</span>${env ? `<span class="dot">·</span><span>${env}</span>` : ''}${BE === 'http' && SERVER_VERSION ? `<span class="dot">·</span><span class="num ${mismatch ? 'ver-warn' : ''}" title="${mismatch ? '화면과 서버 버전이 다릅니다. cloudflare-upload.zip을 다시 배포하세요.' : ''}">서버 v${esc(SERVER_VERSION)}${mismatch ? ' ⚠' : ''}</span>` : ''}<span class="dot">·</span><button class="linkbtn" data-act="changelog">변경 내역</button><span class="dot">·</span><a class="linkbtn" href="${GITHUB_URL}" target="_blank" rel="noopener">GitHub</a>`;
}
function changelogModal() {
  modal('변경 내역', `<p>현재 버전 <b>v${APP_VERSION}</b> (${APP_DATE})${BE === 'http' && SERVER_VERSION ? ` · 서버 v${esc(SERVER_VERSION)}` : ''}</p>
    <div class="tbl-wrap" style="max-height:380px"><table class="t"><thead><tr><th>버전</th><th>날짜</th><th>내용</th></tr></thead><tbody>
    ${CHANGELOG.map(([v, d, t]) => `<tr><td class="num"><b>v${v}</b></td><td class="num muted">${d}</td><td style="white-space:normal">${esc(t)}</td></tr>`).join('')}
    </tbody></table></div>`, '닫기', null, '');
}
function render() {
  renderHeader();
  renderFooter();
  setTimeout(() => $$('input[type=date]').forEach((i) => { i.min = YEAR_MIN + '-01-01'; i.max = YEAR_MAX + '-12-31'; }), 0);
  if (MODE !== 'app') {
    $('#subTitle').textContent = MODE === 'admin' ? '최고관리자 · 전체 학교 관리' : MODE === 'teacher' ? '강사용 수업 조회' : '학사일정 기반 강사별·분기별 수업시수 계산';
    $('#steps').innerHTML = ''; $('#steps').style.display = 'none';
    $('#main').innerHTML = MODE === 'admin' ? renderAdmin() : MODE === 'teacher' ? renderTeacher() : renderGate();
    updateSaveUI(); return;
  }
  $('#steps').style.display = '';
  $('#subTitle').textContent = [S.info.school, yearLabel(), S.info.semester !== '연간' ? S.info.semester : ''].filter(Boolean).join(' · ') || '학사일정 기반 강사별·분기별 수업시수 계산';
  $('#steps').innerHTML = STEP_META.map((m, i) => {
    const n = i + 1, done = stepDone(n) && S.step !== n;
    return `<button class="step ${S.step === n ? 'on' : ''} ${done ? 'done' : ''}" data-step="${n}"><span class="n">${done ? '✓' : n}</span><span class="t">${m[0]}<small>${m[1]}</small></span></button>`;
  }).join('');
  $('#main').innerHTML = (DEMO ? `<div class="alert info ro-banner"><div><b>체험 모드</b> · 예시 학교 자료입니다. 마음대로 바꿔 봐도 되며, 바꾼 내용은 어디에도 저장되지 않습니다.</div><span class="sp"></span><button class="btn sm" data-act="toGate">체험 끝내기</button></div>` : '') + (VIEW_YEAR ? `<div class="alert warn ro-banner"><div><b>${esc(VIEW_YEAR)}학년도 (지난 학년도) · 조회 전용</b> · 보관된 자료라 고칠 수 없습니다. 통계 확인과 엑셀 저장은 할 수 있습니다.</div><span class="sp"></span><button class="btn sm" data-act="backCurrentYear">현재 학년도(${esc(curYear())})로 돌아가기</button></div>` : '') + (ADMIN_VIEW ? `<div class="alert warn ro-banner"><div><b>최고관리자 보기 모드</b> · ${esc(S.info.school || CUR)} (${esc(CUR)})의 입력 내용을 읽기 전용으로 보고 있습니다.</div><span class="sp"></span><button class="btn sm" data-act="backAdmin">← 학교 목록</button></div>` : '') + [null, renderStep1, renderStep2, renderStep3, renderStep4, renderChanges, renderStep5][S.step]();
  updateSaveUI();
}
const navBar = (nextLabel = '다음 단계') => `<div class="nav no-print">${S.step > 1 ? `<button class="btn" data-go="${S.step - 1}">← 이전</button>` : '<span></span>'}${S.step < LAST_STEP ? `<button class="btn pri" data-go="${S.step + 1}">${nextLabel} →</button>` : ''}</div>`;

/* ---------- STEP 1 ---------- */
function renderStep1() {
  const i = S.info;
  return `<div class="card">
    <h2>1. 기본 정보</h2>
    <p class="lead">학교명과 학년도, 집계할 학기를 입력하세요. 학기는 통계 화면의 기본 집계 범위가 됩니다.</p>
    <div class="grid g3">
      <div class="field"><label>학교명</label><input class="in" data-b="info.school" value="${esc(i.school)}" placeholder="예: ○○초등학교">${CUR && !OFFLINE && !DEMO ? '<div class="help">이름을 고치면 저장할 때 ‘학교 찾기’와 학교명 로그인에도 함께 바뀝니다. 학교코드는 바뀌지 않습니다.</div>' : ''}</div>
      <div class="field"><label>학년도</label><input class="in num" type="number" inputmode="numeric" min="${YEAR_MIN}" max="${YEAR_MAX}" step="1" data-b="info.year" value="${esc(i.year)}" placeholder="예: 2026"><div class="help" id="yearHelp">${validYear(i.year) ? `학사일정 기본 기간: ${i.year}.3.1. ~ ${Number(i.year) + 1}.2.${Number(yearEnd(i.year).slice(8))}.` : `${YEAR_MIN}~${YEAR_MAX}년 사이로 입력하세요.`}</div></div>
      <div class="field"><label>담당자 <span class="opt">(선택)</span></label><input class="in" data-b="info.manager" value="${esc(i.manager)}" placeholder="예: 늘봄지원실"></div>
    </div>
    ${!RO ? `<div class="sec rollover-box"><div class="sec-h" style="margin:0"><div><h3 style="margin:0">학년도 전환</h3><div class="help" style="margin:2px 0 0">학년말에 누르세요. 분류·프로그램·강사는 그대로 복사되고, 학사일정은 새 학년도에 맞게 다시 준비합니다. ${esc(i.year)}학년도 자료는 조회 전용으로 보관됩니다.${YEARS.length ? ` 보관된 학년도: ${YEARS.map(esc).join(', ')}` : ''}</div></div><span class="sp"></span><button class="btn pri" data-act="rollover" ${i.year ? '' : 'disabled'}>${i.year ? Number(i.year) + 1 + '학년도로 전환' : '학년도 입력 필요'}</button></div></div>` : ''}
    <div class="sec"><div class="field"><label>학기</label>
      <div class="seg" data-seg="info.semester">${['1학기', '2학기', '연간'].map((x) => `<button class="${i.semester === x ? 'on' : ''}" data-v="${x}">${x}</button>`).join('')}</div>
      <div class="help">학기별 집계는 2단계의 ‘2학기 시작일’을 기준으로 나뉩니다.</div></div></div>
    ${navBar()}
  </div>
  ${!hasContent() ? `<div class="card"><div class="sec-h"><h3>처음이신가요?</h3></div><p class="lead" style="margin:0 0 12px">기존 엑셀 계산기(2026학년도, 24개 부서)를 바탕으로 만든 예시 자료로 기능을 먼저 살펴볼 수 있습니다. 저장해 둔 JSON 파일이 있다면 불러오세요.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="sample">예시 자료 불러오기</button><button class="btn" data-act="restore">JSON 파일 불러오기</button></div></div>` : ''}`;
}

/* ---------- STEP 2 : 학기별 접기 ---------- */
function renderStep2() {
  const c = S.cal, days = buildCalendar(S);
  const bad = (k) => (c[k] && isNaN(d2n(c[k])) ? 'bad' : '');
  const rangeBad = !isNaN(d2n(c.start)) && !isNaN(d2n(c.end)) && d2n(c.end) <= d2n(c.start);
  const s2 = d2n(c.sem2Start);
  const semRange = (s) => {
    if (isNaN(d2n(c.start)) || isNaN(d2n(c.end))) return '';
    if (isNaN(s2)) return s === 1 ? '3~8월' : '9~2월';
    if (s === 1) return c.sem1End && !isNaN(d2n(c.sem1End)) ? `${fmtDate(c.start)} ~ ${fmtDate(c.sem1End)} · 여름방학 포함 ~ ${fmtDate(n2d(s2 - 1))}` : `${fmtDate(c.start)} ~ ${fmtDate(n2d(s2 - 1))}`;
    return `${fmtDate(c.sem2Start)} ~ ${fmtDate(c.end)}`;
  };
  const semBlock = (s) => {
    const vacs = c.vacations.map((v, idx) => ({ v, idx })).filter((x) => semOfItem(x.v) === s);
    const cls = c.closures.map((h, idx) => ({ h, idx })).filter((x) => semOfItem(x.h) === s).sort((a, b) => ((a.h.start || '9') < (b.h.start || '9') ? -1 : 1));
    const openDays = days.filter((d) => d.sem === s && d.dow > 0 && d.dow < 6 && !d.closure && !(d.vac && !d.vac.run)).length;
    const open = S.ui.semOpen[s] !== false;
    return `<div class="fold ${open ? '' : 'closed'}">
      <div class="fold-h" data-fold-sem="${s}"><span class="car">▼</span><h3>${s}학기</h3><span class="meta">${esc(semRange(s))}</span>
        <span class="tag vac">방학 ${vacs.length}</span><span class="tag hol">휴업일 ${cls.length}건</span>${days.length ? `<span class="tag acc">평일 운영 가능 ${openDays}일</span>` : ''}<span class="sp"></span></div>
      <div class="fold-b">
        <div class="sub-h"><h4>방학</h4><span class="help" style="margin:0">방학 중 방과후를 운영하면 ‘운영’을 켜 두세요.</span><span class="sp"></span><button class="btn sm" data-act="addVac" data-sem="${s}">+ 방학 추가</button></div>
        <div class="tbl-wrap"><table class="t edit"><thead><tr><th style="width:26%">이름</th><th>시작일</th><th>종료일</th><th class="c">방과후 운영</th><th class="r">평일</th><th></th></tr></thead><tbody>
        ${vacs.map(({ v, idx }) => {
          const a = d2n(v.start), b = d2n(v.end);
          const wd = !isNaN(a) && !isNaN(b) ? days.filter((d) => d.n >= a && d.n <= b && d.dow > 0 && d.dow < 6).length : '';
          return `<tr><td><input class="in sm" data-b="cal.vacations.${idx}.name" value="${esc(v.name)}"></td>
            <td><input class="in sm" type="date" data-b="cal.vacations.${idx}.start" value="${esc(v.start)}"></td>
            <td><input class="in sm" type="date" data-b="cal.vacations.${idx}.end" value="${esc(v.end)}"></td>
            <td class="c"><label class="toggle"><input type="checkbox" data-b="cal.vacations.${idx}.run" ${v.run ? 'checked' : ''}><span></span></label></td>
            <td class="r num muted">${wd === '' ? '' : wd + '일'}</td>
            <td class="r"><button class="btn sm icon ghost danger" data-del="cal.vacations.${idx}" title="삭제">✕</button></td></tr>`;
        }).join('') || '<tr><td colspan="6" class="empty">방학이 없습니다.</td></tr>'}
        </tbody></table></div>
        <div class="sub-h"><h4>휴업일 · 방과후 미운영일</h4><span class="sp"></span><button class="btn sm" data-act="pasteClosures" data-sem="${s}">여러 줄 붙여넣기</button><button class="btn sm" data-act="addClosure" data-sem="${s}">+ 추가</button></div>
        <div class="tbl-wrap" style="max-height:440px"><table class="t edit"><thead><tr><th>시작일</th><th>종료일 <span class="muted">(기간일 때)</span></th><th style="width:30%">명칭</th><th>구분</th><th></th></tr></thead><tbody>
        ${cls.map(({ h, idx }) => `<tr class="${h.type === '공휴일' ? 'row-hol' : 'row-sch'}">
            <td><input class="in sm" type="date" data-b="cal.closures.${idx}.start" value="${esc(h.start)}"></td>
            <td><input class="in sm" type="date" data-b="cal.closures.${idx}.end" value="${esc(h.end)}"></td>
            <td><input class="in sm" data-b="cal.closures.${idx}.name" value="${esc(h.name)}" placeholder="예: 개교기념일"></td>
            <td><select class="in sm" data-b="cal.closures.${idx}.type">${CLOSURE_TYPES.map((t) => `<option ${h.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
            <td class="r"><button class="btn sm icon ghost danger" data-del="cal.closures.${idx}" title="삭제">✕</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">휴업일이 없습니다.</td></tr>'}
        </tbody></table></div>
      </div></div>`;
  };
  return `<div class="card">
    <h2>2. 학사일정</h2>
    <p class="lead">학년도 기간과 2학기 시작일을 먼저 넣고, 학기별로 방학과 휴업일을 입력하세요. 휴업일과 ‘방과후 미운영’ 방학에는 수업시수가 계산되지 않습니다. 날짜를 입력하면 해당 학기로 자동 분류됩니다.</p>
    <div class="grid g4">
      <div class="field"><label>학년도 시작일</label><input class="in ${bad('start')}" type="date" data-b="cal.start" value="${esc(c.start)}"></div>
      <div class="field"><label>학년도 종료일</label><input class="in ${bad('end')}" type="date" data-b="cal.end" value="${esc(c.end)}"></div>
      <div class="field"><label>1학기 종료일 <span class="opt">(여름방학식)</span></label><input class="in" type="date" data-b="cal.sem1End" value="${esc(c.sem1End)}"></div>
      <div class="field"><label>2학기 시작일 <span class="opt">(개학일)</span></label><input class="in" type="date" data-b="cal.sem2Start" value="${esc(c.sem2Start)}"></div>
    </div>
    <div class="help">1학기 종료일과 2학기 시작일을 넣으면 1학기 기간과 여름방학(종료일 다음 날 ~ 개학 전날)이 자동으로 채워집니다.${!isNaN(d2n(c.start)) && !isNaN(d2n(c.sem2Start)) ? ` 현재 1학기: <b>${fmtDate(c.start)} ~ ${fmtDate(c.sem1End || n2d(d2n(c.sem2Start) - 1))}</b>` : ''}</div>
    ${rangeBad ? '<div class="alert warn">종료일이 시작일보다 앞서 있습니다.</div>' : ''}
    ${(() => { const miss = missingHolidays(); return miss.length && !RO ? `<div class="alert info"><div><b>학사일정에 없는 평일 공휴일 ${miss.length}일</b> · ${miss.slice(0, 6).map((h) => `${fmtDate(h.date)} ${esc(h.name)}`).join(', ')}${miss.length > 6 ? ' 외' : ''}<br><span class="muted">임시공휴일·선거일처럼 새로 정해진 날일 수 있습니다. 이날 방과후를 운영한다면 ‘무시’를 누르세요.</span></div><span class="sp"></span><button class="btn sm pri" data-act="autoHol">추가</button><button class="btn sm" data-act="holIgnore">무시</button></div>` : ''; })()}
    <div class="toolbar" style="margin:12px 0 0">
      ${!c.start && S.info.year ? `<button class="btn sm" data-act="defaultYear">${S.info.year}.3.1. ~ ${Number(S.info.year) + 1}.2.말.로 채우기</button>` : ''}
      <button class="btn sm" data-act="autoHol" ${stepDone(2) ? '' : 'disabled'}>공휴일 자동 추가</button>
      <span class="sp"></span>
      <button class="btn sm ghost" data-act="semAll" data-v="1">모두 펼치기</button><button class="btn sm ghost" data-act="semAll" data-v="0">모두 접기</button>
    </div>
    ${semBlock(1)}${semBlock(2)}
    <div class="help" style="margin-top:10px">공휴일 자동 추가는 우주항공청 월력요항(2026~2028년, 노동절·제헌절 포함)과 음력 환산 예정일(2029~2030년), 최고관리자가 추가한 공휴일(임시공휴일·선거일 등) 기준이며 주말과 겹친 날은 생략합니다. 재량휴업일·개교기념일 등은 학교 학사일정에 맞게 추가하세요.</div>
    ${navBar()}
  </div>`;
}

/* ---------- STEP 3 ---------- */
function renderStep3() {
  const days = buildCalendar(S);
  const ya = d2n(S.cal.start), yb = d2n(S.cal.end), warns = [];
  const qs = S.quarters.map((q) => ({ a: d2n(q.start), b: d2n(q.end), q }));
  qs.forEach((x, i) => {
    const nm = x.q.name || i + 1 + '번째 분기';
    if (!isNaN(x.a) && !isNaN(x.b) && x.b < x.a) warns.push(`${nm}: 종료일이 시작일보다 앞섭니다.`);
    if (!isNaN(x.a) && !isNaN(ya) && (x.a < ya || x.b > yb)) warns.push(`${nm}: 학년도 기간을 벗어난 날짜는 계산되지 않습니다.`);
    qs.forEach((y, j) => { if (j > i && !isNaN(x.a) && !isNaN(y.a) && x.a <= y.b && y.a <= x.b) warns.push(`${nm}과 ${y.q.name}의 기간이 겹칩니다. 겹친 날은 앞 분기로 계산됩니다.`); });
  });
  return `<div class="card">
    <h2>3. 방과후학교 분기</h2>
    <p class="lead">분기별 운영 시작일과 종료일을 입력하세요. 분기 기간 밖의 날(신청 기간, 학년말 정비 기간 등)은 계산에서 빠집니다.</p>
    ${week5Box(days)}
    <div class="sec-h"><span class="sp"></span><button class="btn sm" data-act="autoQuarters" ${stepDone(2) ? '' : 'disabled'}>기본 4분기 자동 생성</button><button class="btn sm" data-act="addQuarter">+ 분기 추가</button></div>
    <div class="tbl-wrap"><table class="t edit"><thead><tr><th style="width:18%">분기명</th><th>시작일</th><th>종료일</th><th class="r">월</th><th class="r">화</th><th class="r">수</th><th class="r">목</th><th class="r">금</th><th class="r">운영 가능일</th><th></th></tr></thead><tbody>
    ${S.quarters.map((q, idx) => {
      const cnt = [0, 0, 0, 0, 0, 0, 0];
      days.forEach((d) => { if (d.q === idx && commonOpen(S, d)) cnt[d.dow]++; });
      return `<tr><td><input class="in sm" data-b="quarters.${idx}.name" value="${esc(q.name)}"></td>
        <td><input class="in sm" type="date" data-b="quarters.${idx}.start" value="${esc(q.start)}"></td>
        <td><input class="in sm" type="date" data-b="quarters.${idx}.end" value="${esc(q.end)}"></td>
        ${[1, 2, 3, 4, 5].map((w) => `<td class="r num">${cnt[w]}</td>`).join('')}
        <td class="r num"><b>${cnt[1] + cnt[2] + cnt[3] + cnt[4] + cnt[5]}</b>일</td>
        <td class="r"><button class="btn sm icon ghost danger" data-del="quarters.${idx}" title="삭제">✕</button></td></tr>`;
    }).join('') || '<tr><td colspan="10" class="empty">분기가 없습니다. ‘기본 4분기 자동 생성’을 누르면 3~5월, 6~8월, 9~11월, 12~2월로 나눕니다.</td></tr>'}
    </tbody></table></div>
    <div class="help">분기 종료일을 넣으면 다음 분기 시작일이 다음 평일(주말·공휴일 제외)로 자동 입력됩니다. 요일별 숫자는 휴업일과 미운영 방학을 뺀 ‘운영 가능일’입니다.</div>
    ${warns.map((w) => `<div class="alert warn">${esc(w)}</div>`).join('')}
    ${navBar()}
  </div>`;
}

function week5Box(days) {
  const on = S.cal.week5 !== false;
  const w5 = days.filter((d) => d.q >= 0 && d.wk >= 5 && d.dow > 0 && d.dow < 6 && baseOpen(d, 'inherit'));
  const ex = w5.slice(0, 6).map((d) => fmtDate(d.iso)).join(', ');
  return `<div class="w5box">
    <div class="w5row">
      <label class="w5tog"><span class="toggle"><input type="checkbox" data-b="cal.week5" ${on ? 'checked' : ''}><span></span></span><b>5주차 수업</b> <span class="tag ${on ? 'acc' : 'warn'}">${on ? '운영' : '미운영 (자동 제외)'}</span></label>
      <span class="sp"></span>
      <label class="w5mode">주차 기준 <select class="in sm" data-b="cal.weekMode"><option value="nth" ${S.cal.weekMode !== 'cal' ? 'selected' : ''}>그 달의 n번째 요일 (29~31일 = 5주차)</option><option value="cal" ${S.cal.weekMode === 'cal' ? 'selected' : ''}>달력 주 (월요일 시작, 1일이 든 주 = 1주차)</option></select></label>
    </div>
    <div class="help" style="margin:6px 0 0">${on ? '5주차에도 수업합니다.' : '5주차 이후 수업일은 모든 프로그램에서 자동으로 빠집니다.'} 분기 기간 안의 평일 5주차는 <b>${w5.length}일</b>입니다${ex ? ` (${ex}${w5.length > 6 ? ' …' : ''})` : ''}. 프로그램마다 다르게 하려면 4단계 ▸ 상세에서 바꾸세요.</div>
  </div>`;
}

/* ---------- STEP 4 : 분류 > 프로그램, 접기 + 드래그 ---------- */
function dayButtons(d) {
  return `<div class="days">${[1, 2, 3, 4, 5, 6].map((w) => `<button class="${d.days.includes(w) ? 'on' : ''} ${w === 6 ? 'sat' : ''}" data-day="${d.id}:${w}">${DOW[w]}</button>`).join('')}</div>`;
}
function deptRow(d, r) {
  const idx = S.depts.indexOf(d);
  const flags = [];
  if (d.start || d.end) flags.push(['기간', 'acc']);
  if ((d.cancels || []).length) flags.push(['휴강 ' + d.cancels.length, 'warn']);
  if ((d.makeups || []).length) flags.push(['보강 ' + d.makeups.length, 'acc']);
  if (d.vacRun !== 'inherit') flags.push([d.vacRun === 'yes' ? '방학운영' : '방학미운영', 'vac']);
  if (d.week5 !== 'inherit') flags.push([d.week5 === 'yes' ? '5주차 운영' : '5주차 제외', d.week5 === 'yes' ? 'acc' : 'warn']);
  return `<tr data-did="${d.id}">
    <td style="width:56px;white-space:nowrap"><span class="handle" data-drag="d:${d.id}" title="끌어서 순서 변경">⋮⋮</span><button class="btn sm icon ghost" data-open="${d.id}" title="상세 설정">${d.open ? '▾' : '▸'}</button></td>
    <td><input class="in sm" data-b="depts.${idx}.name" value="${esc(d.name)}" placeholder="프로그램명"></td>
    <td><input class="in sm" data-b="depts.${idx}.teacher" value="${esc(d.teacher)}" placeholder="강사명" list="teacherList"></td>
    <td>${dayButtons(d)}</td>
    <td class="r"><input class="in sm num" style="width:58px;text-align:right" type="number" min="1" max="10" data-b="depts.${idx}.periods" value="${esc(d.periods)}"></td>
    <td class="r"><input class="in sm num" style="width:104px;text-align:right" inputmode="numeric" data-b="depts.${idx}.rate" value="${esc(d.rate ? fmt(String(d.rate).replace(/[^\d]/g, '')) : '')}" placeholder="0"></td>
    <td class="r num">${r ? `<b>${r.count}</b>회` : '<span class="muted">–</span>'} ${flags.map(([f, c]) => `<span class="tag ${c}">${f}</span>`).join(' ')}</td>
    <td class="r" style="white-space:nowrap"><button class="btn sm icon ghost share-btn" data-share="${d.id}" title="강사용 링크">🔗</button><button class="btn sm icon ghost" data-dup="${d.id}" title="복제">⧉</button><button class="btn sm icon ghost danger" data-del="depts.${idx}" title="삭제">✕</button></td>
  </tr>${d.open ? `<tr class="dept-detail"><td></td><td colspan="7"><div class="grid g4">
    <div class="field"><label>운영 시작일 <span class="opt">(분기보다 늦게 시작)</span></label><input class="in sm" type="date" data-b="depts.${idx}.start" value="${esc(d.start)}"></div>
    <div class="field"><label>운영 종료일 <span class="opt">(조기 종료)</span></label><input class="in sm" type="date" data-b="depts.${idx}.end" value="${esc(d.end)}"></div>
    <div class="field"><label>방학 중 운영</label><select class="in sm" data-b="depts.${idx}.vacRun"><option value="inherit" ${d.vacRun === 'inherit' ? 'selected' : ''}>학사일정 설정 따름</option><option value="yes" ${d.vacRun === 'yes' ? 'selected' : ''}>방학에도 운영</option><option value="no" ${d.vacRun === 'no' ? 'selected' : ''}>방학 중 미운영</option></select></div>
    <div class="field"><label>5주차 수업</label><select class="in sm" data-b="depts.${idx}.week5"><option value="inherit" ${d.week5 === 'inherit' ? 'selected' : ''}>전체 설정 따름 (${S.cal.week5 !== false ? '운영' : '미운영'})</option><option value="yes" ${d.week5 === 'yes' ? 'selected' : ''}>5주차에도 운영</option><option value="no" ${d.week5 === 'no' ? 'selected' : ''}>5주차 미운영</option></select></div>
    </div><div class="grid g3" style="margin-top:10px">
    <div class="field"><label>메모 <span class="opt">(선택)</span></label><input class="in sm" data-b="depts.${idx}.memo" value="${esc(d.memo)}" placeholder="예: 1~2학년"></div>
    <div class="field" style="grid-column:span 2"><label>휴강·보강</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="tag warn">휴강 ${(d.cancels || []).length}일</span><span class="tag acc">보강 ${(d.makeups || []).length}일</span><button class="btn sm" data-gochg="${d.id}">휴강·보강 관리 →</button></div></div>
    </div></td></tr>` : ''}`;
}
function renderStep4() {
  const st = stepDone(2) && stepDone(3) ? computeStats(S, '연간') : null;
  const rmap = new Map(st ? st.depts.map((r) => [r.dept.id, r]) : []);
  const groupsHtml = S.groups.map((g, gi) => {
    const ds = S.depts.filter((d) => d.group === g.id);
    const total = ds.reduce((a, d) => a + (rmap.get(d.id) ? rmap.get(d.id).count : 0), 0);
    return `<div class="grp ${g.collapsed ? 'closed' : ''}" data-gid="${g.id}">
      <div class="grp-h" data-gdrop="${g.id}">
        <span class="handle" data-drag="g:${g.id}" title="끌어서 분류 순서 변경">⋮⋮</span>
        <button class="btn sm icon ghost" data-gfold="${g.id}" title="${g.collapsed ? '펼치기' : '접기'}">${g.collapsed ? '▸' : '▾'}</button>
        <input class="in sm" data-b="groups.${gi}.name" value="${esc(g.name)}" placeholder="분류명 (예: 방과후학교)">
        <span class="meta">프로그램 ${ds.length}개${st ? ` · 연간 ${fmt(total)}회` : ''}</span>
        <span class="sp"></span>
        <button class="btn sm" data-act="addDept" data-g="${g.id}">+ 프로그램</button>
        <button class="btn sm icon ghost danger" data-delgroup="${g.id}" title="분류 삭제">✕</button>
      </div>
      <div class="grp-b"><div class="tbl-wrap"><table class="t edit"><thead><tr><th></th><th style="min-width:130px">프로그램명</th><th style="min-width:110px">강사명</th><th>수업 요일</th><th class="r" title="1회 수업의 차시 수">회당 차시</th><th class="r">차시당 수업료 <span class="muted">(선택)</span></th><th class="r">연간 횟수</th><th></th></tr></thead>
      <tbody>${ds.map((d) => deptRow(d, rmap.get(d.id))).join('') || `<tr class="empty-row" data-gempty="${g.id}"><td colspan="8" class="empty">프로그램이 없습니다. ‘+ 프로그램’을 누르거나 다른 분류에서 끌어다 놓으세요.</td></tr>`}</tbody></table></div></div>
    </div>`;
  }).join('');
  return `<div class="card">
    <h2>4. 부서 · 강사</h2>
    <p class="lead">분류(예: 초1·2 맞춤형 프로그램, 방과후학교) 아래에 프로그램을 입력합니다. <b>⋮⋮</b>를 끌어 분류와 프로그램의 순서를 바꿀 수 있고, 프로그램을 다른 분류로 옮길 수도 있습니다.</p>
    <div class="toolbar">
      <button class="btn sm pri" data-act="addGroup">+ 분류 추가</button>
      <button class="btn sm" data-act="pasteDepts">엑셀에서 붙여넣기</button>
      <button class="btn sm" data-act="shareList">🔗 강사용 링크 목록</button>
      <span class="sp"></span>
      <button class="btn sm ghost" data-act="groupAll" data-v="0">모두 펼치기</button><button class="btn sm ghost" data-act="groupAll" data-v="1">모두 접기</button>
    </div>
    <div id="groupList">${groupsHtml || '<div class="empty">분류가 없습니다.</div>'}</div>
    <datalist id="teacherList">${[...new Set(S.depts.map((d) => d.teacher).filter(Boolean))].map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <div class="help" style="margin-top:10px">▸를 누르면 프로그램별 운영기간·결강일·보강일·방학 중 운영 여부를 정할 수 있습니다. 수업료 = 횟수 × 회당 차시 × 차시당 수업료</div>
    ${!st ? '<div class="alert info">2·3단계(학사일정, 분기)를 마치면 프로그램별 연간 횟수가 바로 표시됩니다.</div>' : ''}
    ${navBar('휴강·보강 입력')}
  </div>`;
}

/* ---------- STEP 5 : 휴강·보강 ---------- */
// 휴강·보강을 빼고 계산한 ‘원래 수업일’
function baseSessions(days, dept) { return deptSessions(S, days, { ...dept, cancels: [], makeups: [] }); }
function chgDeptSel() { return S.depts.find((d) => d.id === S.ui.chgDept) || S.depts[0] || null; }
function renderChanges() {
  if (!stepDone(2) || !stepDone(3)) return `<div class="card"><h2>5. 휴강·보강</h2><div class="alert warn">${!stepDone(2) ? '2단계 학사일정' : '3단계 분기'}을 먼저 입력해 주세요.</div>${navBar()}</div>`;
  if (!S.depts.length) return `<div class="card"><h2>5. 휴강·보강</h2><div class="alert warn">4단계에서 프로그램을 먼저 입력해 주세요. 입력한 프로그램이 여기에 자동으로 나타납니다.</div>${navBar()}</div>`;
  const d = chgDeptSel(), idx = S.depts.indexOf(d);
  const days = buildCalendar(S);
  const base = new Set(baseSessions(days, d).map((x) => x.iso));
  const fin = new Set(deptSessions(S, days, d).map((x) => x.iso));
  const cset = new Map((d.cancels || []).map((c) => [c.d, c])), mset = new Map((d.makeups || []).map((c) => [c.d, c]));
  const effCancel = [...cset.keys()].filter((x) => base.has(x)).length;
  const effMake = [...mset.keys()].filter((x) => fin.has(x) && !base.has(x)).length;
  // 달력
  const byMonth = {}; days.filter((x) => x.q >= 0).forEach((x) => (byMonth[x.ym] = byMonth[x.ym] || []).push(x));
  const months = Object.keys(byMonth).sort().map((ym) => {
    const map = new Map(byMonth[ym].map((x) => [x.n, x]));
    const first = d2n(ym + '-01'), last = first + new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5), 0)).getUTCDate() - 1;
    const html = []; let cnt = 0;
    for (let i = 0; i < dowOf(first); i++) html.push('<div></div>');
    for (let n = first; n <= last; n++) {
      const x = map.get(n), iso = n2d(n), dd = Number(iso.slice(8));
      if (!x) { html.push(`<div class="c-out">${dd}</div>`); continue; }
      let cls = '', tip = fmtDate(iso) + ' ' + x.wk + '주차', clickable = !RO;
      if (cset.has(iso) && base.has(iso)) { cls = 'k-cancel'; tip += ' · 휴강' + (cset.get(iso).note ? ' (' + cset.get(iso).note + ')' : '') + ' — 누르면 휴강 취소'; }
      else if (mset.has(iso) && fin.has(iso)) { cls = 'k-makeup'; tip += ' · 보강' + (mset.get(iso).note ? ' (' + mset.get(iso).note + ')' : '') + ' — 누르면 보강 취소'; cnt++; }
      else if (fin.has(iso)) { cls = 'k-class'; tip += ' · 수업 — 누르면 휴강'; cnt++; }
      else if (x.closure) { cls = x.closure.type === '공휴일' ? 'c-hol' : 'c-sch'; tip += ' · ' + (x.closure.name || x.closure.type); clickable = false; }
      else { cls = (x.dow === 0 || x.dow === 6) ? 'c-wkend k-free' : 'k-free'; tip += (x.vac ? ' · ' + x.vac.name : '') + ' — 누르면 보강'; }
      html.push(`<div class="${cls}${clickable ? ' k-click' : ''}" ${clickable ? `data-cd="${iso}"` : ''} title="${esc(tip)}">${dd}</div>`);
    }
    return `<div class="mon"><h4>${+ym.slice(0, 4)}년 ${+ym.slice(5)}월 <small>${cnt}회</small></h4><div class="wk">${DOW.map((w) => `<div class="wh">${w}</div>`).join('')}${html.join('')}</div></div>`;
  }).join('');
  const listTbl = (kind) => {
    const arr = d[kind] || [], isC = kind === 'cancels';
    return `<div class="tbl-wrap"><table class="t edit"><thead><tr><th>날짜</th><th style="width:55%">사유 <span class="muted">(선택)</span></th><th></th></tr></thead><tbody>
      ${arr.map((c, j) => { const bad = isC ? !base.has(c.d) : base.has(c.d) || !fin.has(c.d); return `<tr><td class="num">${fmtDate(c.d)} <span class="muted">${(days.find((x) => x.iso === c.d) || {}).wk || '?'}주</span>${bad ? ` <span class="tag warn" title="${isC ? '원래 수업일이 아니라 계산에 영향이 없습니다' : '이미 수업일이거나 분기 밖이라 계산에 영향이 없습니다'}">확인 필요</span>` : ''}</td>
        <td><input class="in sm" data-b="depts.${idx}.${kind}.${j}.note" value="${esc(c.note)}" placeholder="${isC ? '예: 강사 개인 사정, 학교 행사' : '예: 10.2. 휴강분'}"></td>
        <td class="r"><button class="btn sm icon ghost danger" data-delchg="${kind}:${j}" title="삭제">✕</button></td></tr>`; }).join('') || `<tr><td colspan="3" class="empty">${isC ? '휴강일이 없습니다.' : '보강일이 없습니다.'}</td></tr>`}
      </tbody></table></div>
      ${RO ? '' : `<div class="chg-add"><input class="in sm" type="date" id="add-${kind}" min="${S.cal.start}" max="${S.cal.end}"><input class="in sm" id="addnote-${kind}" placeholder="사유 (선택)"><button class="btn sm ${isC ? '' : 'pri'}" data-addchg="${kind}">+ ${isC ? '휴강' : '보강'} 추가</button></div>`}`;
  };
  // 전체 현황
  const allRows = S.groups.flatMap((g) => S.depts.filter((x) => x.group === g.id).map((x) => ({ g, x }))).map(({ g, x }) => {
    const b = new Set(baseSessions(days, x).map((y) => y.iso)), f = deptSessions(S, days, x).length;
    const c = (x.cancels || []).filter((y) => b.has(y.d)).length, m = (x.makeups || []).length;
    return `<tr class="${x.id === d.id ? 'row-on' : ''}"><td><span class="muted">${esc(g.name)} ·</span> <b>${esc(x.name || '(이름 없음)')}</b></td><td>${esc(x.teacher)}</td><td class="r num">${b.size}회</td><td class="r num">${c ? `<span class="tag warn">−${c}</span>` : '<span class="muted">0</span>'}</td><td class="r num">${m ? `<span class="tag acc">+${m}</span>` : '<span class="muted">0</span>'}</td><td class="r num"><b>${f}</b>회</td><td class="r"><button class="btn sm" data-pickchg="${x.id}">${x.id === d.id ? '선택됨' : '선택'}</button></td></tr>`;
  }).join('');
  const pos = S.depts.indexOf(d);
  return `<div class="card">
    <h2>5. 휴강 · 보강</h2>
    <p class="lead">4단계에서 입력한 프로그램이 자동으로 나타납니다. 프로그램을 고른 뒤 달력에서 <b>수업일을 누르면 휴강</b>, <b>빈 날을 누르면 보강</b>으로 지정되고, 다시 누르면 취소됩니다. 사유는 아래 목록에 적을 수 있습니다. 바뀐 내용은 통계와 강사용 화면에 바로 반영됩니다.</p>
    <div class="toolbar"><button class="btn sm icon" data-chgnav="-1" ${pos <= 0 ? 'disabled' : ''} title="이전 프로그램">‹</button>
      <select class="in sm" style="width:320px" data-b="ui.chgDept">${deptOptions(d.id, false)}</select>
      <button class="btn sm icon" data-chgnav="1" ${pos >= S.depts.length - 1 ? 'disabled' : ''} title="다음 프로그램">›</button>
      <span class="help" style="margin:0">매주 ${dayStr(d) || '–'} · 회당 ${Math.max(1, Number(d.periods) || 1)}차시</span></div>
    <div class="kpis">
      <div class="kpi"><div class="l">원래 수업 (연간)</div><div class="v num">${base.size}<small>회</small></div></div>
      <div class="kpi"><div class="l">휴강</div><div class="v num" style="color:var(--warn)">−${effCancel}<small>회</small></div></div>
      <div class="kpi"><div class="l">보강</div><div class="v num" style="color:var(--acc)">+${effMake}<small>회</small></div></div>
      <div class="kpi"><div class="l">최종 수업</div><div class="v num">${fin.size}<small>회 · ${fin.size * Math.max(1, Number(d.periods) || 1)}차시</small></div></div>
    </div>
    <div class="legend"><span><i class="k-class"></i>수업일 (누르면 휴강)</span><span><i class="k-cancel"></i>휴강</span><span><i class="k-makeup"></i>보강</span><span><i class="k-free" style="background:#fff"></i>빈 날 (누르면 보강)</span><span><i class="c-hol"></i>공휴일</span><span><i class="c-sch"></i>학교 휴업일</span></div>
    <div class="cal-grid">${months}</div>
    <div class="grid g2 sec">
      <div><div class="sub-h"><h4>휴강일 <span class="tag warn">${(d.cancels || []).length}</span></h4></div>${listTbl('cancels')}</div>
      <div><div class="sub-h"><h4>보강일 <span class="tag acc">${(d.makeups || []).length}</span></h4></div>${listTbl('makeups')}</div>
    </div>
    <div class="sec"><div class="sub-h"><h4>전체 프로그램 휴강·보강 현황</h4></div>
      <div class="tbl-wrap" style="max-height:360px"><table class="t"><thead><tr><th>프로그램</th><th>강사</th><th class="r">원래</th><th class="r">휴강</th><th class="r">보강</th><th class="r">최종</th><th></th></tr></thead><tbody>${allRows}</tbody></table></div></div>
    ${navBar('통계 보기')}
  </div>`;
}
function chgToggle(iso) {
  const d = chgDeptSel(); if (!d) return;
  const days = buildCalendar(S);
  const base = new Set(baseSessions(days, d).map((x) => x.iso));
  d.cancels = d.cancels || []; d.makeups = d.makeups || [];
  const ci = d.cancels.findIndex((c) => c.d === iso), mi = d.makeups.findIndex((c) => c.d === iso);
  if (ci >= 0) { d.cancels.splice(ci, 1); toast(fmtDate(iso) + ' 휴강을 취소했습니다.'); }
  else if (mi >= 0) { d.makeups.splice(mi, 1); toast(fmtDate(iso) + ' 보강을 취소했습니다.'); }
  else if (base.has(iso)) { d.cancels.push({ d: iso, note: '' }); toast(fmtDate(iso) + '을(를) 휴강으로 지정했습니다. 사유는 아래 목록에 적을 수 있습니다.'); }
  else { d.makeups.push({ d: iso, note: '' }); toast(fmtDate(iso) + '을(를) 보강일로 지정했습니다.'); }
  d.cancels.sort((a, b) => (a.d < b.d ? -1 : 1)); d.makeups.sort((a, b) => (a.d < b.d ? -1 : 1));
  save(); rerenderSoft();
}
function chgAdd(kind) {
  const d = chgDeptSel(); if (!d) return;
  const iso = ($('#add-' + kind) || {}).value, note = (($('#addnote-' + kind) || {}).value || '').trim();
  if (!iso || !validYear(iso.slice(0, 4))) return toast('날짜를 고르세요.');
  const days = buildCalendar(S), day = days.find((x) => x.iso === iso);
  const base = new Set(baseSessions(days, d).map((x) => x.iso));
  d.cancels = d.cancels || []; d.makeups = d.makeups || [];
  if (kind === 'cancels') {
    if (!base.has(iso)) return toast(fmtDate(iso) + '은(는) 이 프로그램의 원래 수업일이 아닙니다.');
    if (d.cancels.some((c) => c.d === iso)) return toast('이미 휴강으로 지정된 날입니다.');
    d.cancels.push({ d: iso, note });
  } else {
    if (!day || day.q < 0) return toast('분기 기간 안의 날짜만 보강일로 지정할 수 있습니다.');
    if (day.closure) return toast(fmtDate(iso) + '은(는) ' + (day.closure.name || day.closure.type) + '이라 보강할 수 없습니다.');
    if (base.has(iso) && !d.cancels.some((c) => c.d === iso)) return toast('이미 수업이 있는 날입니다.');
    if (d.makeups.some((c) => c.d === iso)) return toast('이미 보강으로 지정된 날입니다.');
    d.makeups.push({ d: iso, note });
  }
  d[kind].sort((a, b) => (a.d < b.d ? -1 : 1));
  save(); rerenderSoft(); toast(fmtDate(iso) + (kind === 'cancels' ? ' 휴강' : ' 보강') + '을 추가했습니다.');
}

/* ---------- STEP 6 : 통계 (정렬·분류 접기) ---------- */
// 정렬 가능한 표 생성. groups: [{gid,name,rows:[[{h,v}]],sub:[h]}] (gid가 없으면 분류 행 생략)
function sTable(id, cols, groups, foot) {
  const sort = S.ui.sort[id];
  const head = cols.map((c, i) => {
    const on = sort && sort.col === i;
    return `<th class="${c.cls || ''} ${c.stick ? 'stick' : ''} ${c.nosort ? '' : 'sortable'}" ${c.nosort ? '' : `data-sort="${id}:${i}"`} title="${c.nosort ? '' : '눌러서 정렬 (내림차순 → 오름차순 → 원래 순서)'}">${c.label}${on ? `<span class="ar">${sort.dir === 'desc' ? '▼' : '▲'}</span>` : ''}</th>`;
  }).join('');
  const sortRows = (rows) => {
    if (!sort) return rows;
    const k = sort.col, dir = sort.dir === 'desc' ? -1 : 1;
    return rows.map((r, i) => [r, i]).sort((a, b) => {
      const x = a[0][k] ? a[0][k].v : '', y = b[0][k] ? b[0][k].v : '';
      let c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko');
      return c ? c * dir : a[1] - b[1];
    }).map((x) => x[0]);
  };
  const body = groups.map((g) => {
    const folded = g.gid && S.ui.statFold[g.gid];
    const gRow = g.gid ? `<tr class="g-row" data-sfold="${g.gid}"><td class="stick"><span class="car">${folded ? '▸' : '▾'}</span>${esc(g.name || '(분류 없음)')} <span class="muted" style="font-weight:400">${g.rows.length}</span></td>${(g.sub || []).map((h, i) => `<td class="${cols[i + 1] ? cols[i + 1].cls || '' : ''}">${h}</td>`).join('')}</tr>` : '';
    const rows = folded ? '' : sortRows(g.rows).map((r) => `<tr>${r.map((c, i) => `<td class="${cols[i].cls || ''} ${cols[i].stick ? 'stick' : ''} ${i === 0 && g.gid ? 'ind' : ''}">${c.h}</td>`).join('')}</tr>`).join('');
    return gRow + rows;
  }).join('');
  return `<div class="tbl-wrap"><table class="t stat" id="${id}"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${cols.length}" class="empty">자료가 없습니다.</td></tr>`}</tbody>${foot ? `<tfoot><tr>${foot.map((h, i) => `<td class="${cols[i].cls || ''} ${cols[i].stick ? 'stick' : ''}">${h}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
const N = (v, zeroDash) => ({ h: v ? fmt(v) : `<span class="muted">${zeroDash ? '–' : 0}</span>`, v: Number(v) || 0 });
const T = (s, html) => ({ h: html != null ? html : esc(s), v: s || '' });
const dayStr = (d) => d.days.slice().sort().map((w) => DOW[w]).join('');
const sumCols = (rows, from) => (rows[0] ? rows[0].slice(from).map((_, j) => rows.reduce((a, r) => a + (Number(r[from + j].v) || 0), 0)) : []);
function grouped(st, rowFn, subFrom) {
  return S.groups.map((g) => {
    const rows = st.depts.filter((r) => r.dept.group === g.id).map(rowFn);
    return { gid: g.id, name: g.name, rows, sub: rows.length ? Array(subFrom - 1).fill('').concat(sumCols(rows, subFrom).map((v) => fmt(v))) : [] };
  }).filter((g) => g.rows.length);
}

function renderStep5() {
  if (!stepDone(2) || !stepDone(3)) return `<div class="card"><h2>6. 통계</h2><div class="alert warn">${!stepDone(2) ? '2단계 학사일정(학년도 시작·종료일)' : '3단계 분기'}를 먼저 입력해 주세요.</div>${navBar()}</div>`;
  const scope = scopeName(), st = computeStats(S, scope), u = S.ui;
  const anyFee = st.depts.some((r) => r.rate > 0), showFee = anyFee && u.showFee, usePeriods = u.unit === 'periods';
  const totalP = st.depts.reduce((a, r) => a + (usePeriods ? r.periods : r.count), 0);
  const totalFee = st.depts.reduce((a, r) => a + r.fee, 0);
  const teachers = st.teachers.filter((t) => t.teacher !== '(강사 미입력)').length;
  const tabs = [['progress', '진행 현황'], ['quarter', '분기별'], ['weekday', '요일별'], ['month', '월별'], ['week', '주차별'], ['teacher', '강사별'], ['calendar', '달력'], ['dates', '수업일 확인']];
  const body = { progress: () => viewProgress(st, usePeriods), quarter: () => tblQuarter(st, usePeriods, showFee), weekday: () => tblWeekday(st, usePeriods), month: () => tblMonth(st, usePeriods), week: () => tblWeek(st, usePeriods), teacher: () => tblTeacher(st, showFee), calendar: () => viewCalendar(st), dates: () => viewDates(st) }[u.tab]();
  return `<div class="card">
    <div class="toolbar">
      <div><h2 style="margin:0">6. 통계</h2><div class="help" style="margin:0">${esc([S.info.school, yearLabel(), scope].filter(Boolean).join(' · '))}</div></div>
      <span class="sp"></span>
      <div class="seg" data-seg="ui.scope">${['1학기', '2학기', '연간'].map((x) => `<button class="${scope === x ? 'on' : ''}" data-v="${x}">${x}</button>`).join('')}</div>
      <div class="seg" data-seg="ui.unit"><button class="${usePeriods ? 'on' : ''}" data-v="periods">시수(차시)</button><button class="${!usePeriods ? 'on' : ''}" data-v="count">횟수</button></div>
    </div>
    ${scope !== '연간' && !S.cal.sem2Start ? '<div class="alert warn">2학기 시작일이 없어 학기 구분이 정확하지 않습니다. 2단계에서 입력해 주세요.</div>' : ''}
    <div class="kpis" ${u.tab === 'progress' ? 'style="display:none"' : ''}>
      <div class="kpi"><div class="l">프로그램 (분류 ${S.groups.filter((g) => S.depts.some((d) => d.group === g.id)).length}개)</div><div class="v num">${st.depts.length}<small>개</small></div></div>
      <div class="kpi"><div class="l">강사</div><div class="v num">${teachers}<small>명</small></div></div>
      <div class="kpi"><div class="l">총 ${usePeriods ? '수업시수' : '수업횟수'} (${esc(scope)})</div><div class="v num">${fmt(totalP)}<small>${usePeriods ? '차시' : '회'}</small></div></div>
      <div class="kpi"><div class="l">총 수업료</div><div class="v num">${anyFee ? fmt(totalFee) + '<small>원</small>' : '<span style="font-size:14px;color:var(--mute);font-weight:400">미입력</span>'}</div></div>
    </div>
    <div class="tabs no-print">${tabs.map(([k, l]) => `<button class="${u.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="toolbar no-print">
      ${anyFee && ['quarter', 'teacher'].includes(u.tab) ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px"><span class="toggle"><input type="checkbox" data-b="ui.showFee" ${u.showFee ? 'checked' : ''}><span></span></span>수업료 표시</label>` : ''}
      ${['quarter', 'weekday', 'month', 'week', 'teacher'].includes(u.tab) ? '<span class="help" style="margin:0">제목을 누르면 정렬됩니다 (내림차순 → 오름차순 → 원래 순서). 분류 행을 누르면 접히고 펼쳐집니다.</span>' : ''}
      <span class="sp"></span>
      ${['quarter', 'weekday', 'month', 'week', 'teacher'].includes(u.tab) ? '<button class="btn sm" data-act="copyTable">표 복사</button>' : ''}
      <button class="btn sm" data-act="printSheet">수업 확인서 인쇄</button>
      <button class="btn sm pri" data-act="exportXlsx">엑셀 파일로 저장</button>
    </div>
    ${body}
    ${navBar()}
  </div>`;
}

/* ---------- 진행 현황 (가로 막대) ---------- */
function todayIso() { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
function viewProgress(st, usePeriods) {
  const asOf = validYear((S.ui.asOf || '').slice(0, 4)) ? S.ui.asOf : todayIso();
  const unit = usePeriods ? '차시' : '회';
  const qs = S.quarters, dayMap = new Map(st.days.map((d) => [d.iso, d]));
  // 프로그램별: 분기별 전체·완료
  const rows = st.depts.map((r) => {
    const mul = usePeriods ? r.per : 1;
    const tq = qs.map(() => 0), dq = qs.map(() => 0);
    r.dates.forEach((iso) => { const d = dayMap.get(iso); if (!d || d.q < 0) return; tq[d.q] += mul; if (iso <= asOf) dq[d.q] += mul; });
    const total = tq.reduce((a, b) => a + b, 0), done = dq.reduce((a, b) => a + b, 0);
    const next = r.dates.find((iso) => iso > asOf);
    return { r, tq, dq, total, done, left: total - done, pct: total ? done / total : 0, next };
  });
  const T = rows.reduce((a, x) => a + x.total, 0), D = rows.reduce((a, x) => a + x.done, 0);
  const max = Math.max(1, ...rows.map((x) => x.total));
  const volScale = S.ui.progScale === 'vol';   // 기본: 막대 = 프로그램별 100%
  // 분기 상태
  const qStat = qs.map((q, i) => {
    const t = rows.reduce((a, x) => a + x.tq[i], 0), d = rows.reduce((a, x) => a + x.dq[i], 0);
    const st0 = !t ? '없음' : d >= t ? '완료' : asOf < q.start ? '예정' : '진행 중';
    return { q, t, d, st: st0 };
  });
  const curQ = qStat.find((x) => x.st === '진행 중');
  const pctTxt = (p) => Math.round(p * 100) + '%';
  const bar = (x) => {
    const segs = qs.map((q, i) => {
      if (!x.tq[i]) return '';
      const w = (x.tq[i] / (volScale ? max : x.total)) * 100, f = x.tq[i] ? (x.dq[i] / x.tq[i]) * 100 : 0;
      return `<span class="pseg" style="width:${w}%" data-tip="${esc(`${x.r.dept.name} · ${q.name}\n${x.dq[i]}/${x.tq[i]}${unit} 진행 (${pctTxt(x.dq[i] / x.tq[i])})`)}"><i style="width:${f}%"></i></span>`;
    }).join('');
    return `<div class="ptrack" role="img" aria-label="${esc(`${x.r.dept.name}: ${x.done}/${x.total}${unit}`)}">${segs}</div>`;
  };
  const sortKey = S.ui.progSort || 'base';
  const sorter = { base: () => 0, pct: (a, b) => b.pct - a.pct, left: (a, b) => b.left - a.left, total: (a, b) => b.total - a.total }[sortKey] || (() => 0);
  const groupsHtml = S.groups.map((g) => {
    const gr = rows.filter((x) => x.r.dept.group === g.id);
    if (!gr.length) return '';
    const gt = gr.reduce((a, x) => a + x.total, 0), gd = gr.reduce((a, x) => a + x.done, 0);
    const list = gr.map((x, i) => [x, i]).sort((a, b) => sorter(a[0], b[0]) || a[1] - b[1]).map(([x]) => x);
    return `<div class="pgroup"><div class="pg-h"><b>${esc(g.name || '(분류 없음)')}</b><span class="muted">${gr.length}개 프로그램</span><span class="sp"></span><span class="num">${fmt(gd)} / ${fmt(gt)}${unit}</span><span class="ppill">${gt ? pctTxt(gd / gt) : '–'}</span></div>
      ${list.map((x) => `<div class="prow">
        <div class="pname"><b>${esc(x.r.dept.name || '(이름 없음)')}</b><span class="muted">${esc(x.r.dept.teacher || '')}${x.r.dept.teacher ? ' · ' : ''}${dayStr(x.r.dept) || '–'}</span></div>
        ${bar(x)}
        <div class="pval num"><b>${fmt(x.done)}</b><span class="muted">/${fmt(x.total)}${unit}</span><span class="ppct">${x.total ? pctTxt(x.pct) : '–'}</span></div>
        <div class="pnext muted">${x.left ? (x.next ? '다음 ' + fmtDate(x.next) : '') + ` · 남은 ${fmt(x.left)}${unit}` : (x.total ? '<span class="done-tag">완료</span>' : '수업 없음')}</div>
      </div>`).join('')}</div>`;
  }).join('');
  const isToday = asOf === todayIso();
  return `<div class="toolbar">
      <label class="asof">기준일 <input class="in sm" type="date" data-b="ui.asOf" value="${esc(asOf)}" min="${YEAR_MIN}-01-01" max="${YEAR_MAX}-12-31"></label>
      ${isToday ? '<span class="tag acc">오늘</span>' : '<button class="btn sm" data-act="asOfToday">오늘로</button>'}
      <span class="sp"></span>
      <span class="help" style="margin:0">막대 길이</span>
      <div class="seg" data-seg="ui.progScale"><button class="${!volScale ? 'on' : ''}" data-v="pct">진행률</button><button class="${volScale ? 'on' : ''}" data-v="vol">수업량 비교</button></div>
      <span class="help" style="margin:0">정렬</span>
      <div class="seg" data-seg="ui.progSort">${[['base', '입력 순서'], ['pct', '진행률'], ['left', '남은 수업'], ['total', '전체 수업']].map(([k, l]) => `<button class="${sortKey === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="l">전체 진행률 (${esc(scopeName())})</div><div class="v num">${T ? pctTxt(D / T) : '–'}</div><div class="kbar"><i style="width:${T ? (D / T) * 100 : 0}%"></i></div></div>
      <div class="kpi"><div class="l">진행된 수업</div><div class="v num">${fmt(D)}<small>${unit}</small></div></div>
      <div class="kpi"><div class="l">남은 수업</div><div class="v num">${fmt(T - D)}<small>${unit}</small></div></div>
      <div class="kpi"><div class="l">${curQ ? '진행 중인 분기 · ' + esc(curQ.q.name) : '현재 분기'}</div><div class="v num">${curQ ? pctTxt(curQ.d / curQ.t) + `<small>${fmt(curQ.d)}/${fmt(curQ.t)}${unit}</small>` : '<span style="font-size:14px;color:var(--mute);font-weight:400">분기 기간 아님</span>'}</div></div>
    </div>
    <div class="qstrip">${qStat.map((x) => `<div class="qcell q-${x.st === '완료' ? 'done' : x.st === '진행 중' ? 'now' : 'todo'}" data-tip="${esc(`${x.q.name} (${fmtDate(x.q.start, false)} ~ ${fmtDate(x.q.end, false)})\n${x.d}/${x.t}${unit} · ${x.st}`)}">
      <div class="qh"><b>${esc(x.q.name)}</b><span>${x.st}</span></div><div class="kbar"><i style="width:${x.t ? (x.d / x.t) * 100 : 0}%"></i></div><div class="qd muted num">${fmtDate(x.q.start, false)}~${fmtDate(x.q.end, false)} · ${fmt(x.d)}/${fmt(x.t)}${unit}</div></div>`).join('')}</div>
    <div class="plegend"><span><i class="lg-done"></i>진행됨 (기준일까지)</span><span><i class="lg-left"></i>남음</span><span class="muted">${volScale ? `막대 길이 = 프로그램의 ${esc(scopeName())} 전체 ${unit === '차시' ? '시수' : '횟수'}(가장 많은 프로그램 기준)` : '막대 전체 = 각 프로그램의 100%'}, 칸 = 분기. 막대에 마우스를 올리면 분기별 숫자가 보입니다.</span></div>
    <div class="pchart">${groupsHtml || '<div class="empty">4단계에서 프로그램을 입력하세요.</div>'}</div>
    <div class="help">휴강은 빼고 보강은 더한 실제 수업일 기준입니다. ${isToday ? '' : `기준일 ${fmtDate(asOf)}까지를 ‘진행됨’으로 셉니다.`}</div>`;
}

function tblQuarter(st, usePeriods, showFee) {
  if (!st.depts.length) return '<div class="empty">4단계에서 프로그램을 입력하세요.</div>';
  const qs = S.quarters;
  const cols = [{ label: '프로그램', stick: true }, { label: '강사' }, { label: '요일' }, { label: '주당', cls: 'c' },
    ...qs.map((q) => ({ label: esc(q.name), cls: 'r' })), { label: '합계', cls: 'r' }];
  if (showFee) cols.push(...qs.map((q) => ({ label: esc(q.name) + ' 수업료', cls: 'r' })), { label: '수업료 합계', cls: 'r' });
  const any5 = st.depts.some((r) => r.skipped5 > 0);
  const anyChg = st.depts.some((r) => (r.dept.cancels || []).length || (r.dept.makeups || []).length);
  if (anyChg) cols.push({ label: '휴강·보강', cls: 'r' });
  if (any5) cols.push({ label: '5주차 제외', cls: 'r' });
  const rowFn = (r) => {
    const vals = usePeriods ? r.byQP : r.byQ;
    const row = [T(r.dept.name, `<b>${esc(r.dept.name)}</b>`), T(r.dept.teacher), T(dayStr(r.dept)), { h: r.dept.days.length + '회', v: r.dept.days.length }, ...vals.map((v) => N(v)), { h: `<b>${fmt(usePeriods ? r.periods : r.count)}</b>`, v: usePeriods ? r.periods : r.count }];
    if (showFee) row.push(...r.byQFee.map((v) => N(v, true)), { h: `<b>${r.fee ? fmt(r.fee) : '–'}</b>`, v: r.fee });
    if (any5) row.push({ h: r.skipped5 ? `<span class="tag warn">${r.skipped5}회</span>` : '<span class="muted">–</span>', v: r.skipped5 });
    if (anyChg) { const c = (r.dept.cancels || []).length, m = (r.dept.makeups || []).length; row.push({ h: c || m ? `${c ? `<span class="tag warn">−${c}</span>` : ''} ${m ? `<span class="tag acc">+${m}</span>` : ''}` : '<span class="muted">–</span>', v: m - c }); }
    return row;
  };
  const groups = grouped(st, rowFn, 4);
  const all = st.depts.map(rowFn);
  const foot = ['합계', '', '', '', ...sumCols(all, 4).map((v) => fmt(v))];
  return sTable('tq', cols, groups, foot) + `<div class="help">단위: ${usePeriods ? '차시 (횟수 × 회당 차시)' : '회'} · 수업료 = 시수 × 차시당 수업료${any5 ? ' · ‘5주차 제외’는 5주차 미운영 설정으로 빠진 횟수입니다.' : ''}</div>`;
}
function tblWeekday(st, usePeriods) {
  const ws = S.depts.some((d) => d.days.includes(6)) ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const qCols = [{ label: '분기', stick: true }, { label: '기간' }, ...ws.map((w) => ({ label: DOW[w], cls: 'r' })), { label: '계', cls: 'r' }, { label: '제외일', cls: 'r' }];
  const qRows = S.quarters.map((q, i) => {
    const v = ws.map((w) => st.weekday[i][w]);
    return [T(q.name, `<b>${esc(q.name)}</b>`), T(q.start, `<span class="muted">${fmtDate(q.start, false)} ~ ${fmtDate(q.end, false)}</span>`), ...v.map((x) => N(x)), { h: `<b>${v.reduce((a, b) => a + b, 0)}</b>`, v: v.reduce((a, b) => a + b, 0) }, N(ws.reduce((a, w) => a + st.wdClosed[i][w], 0))];
  });
  const qFoot = ['연간', '', ...sumCols(qRows, 2).map((v) => fmt(v))];
  const dCols = [{ label: '프로그램', stick: true }, { label: '강사' }, ...ws.map((w) => ({ label: DOW[w], cls: 'r' })), { label: '계', cls: 'r' }];
  const rowFn = (r) => { const v = ws.map((w) => r.byDow[w] * (usePeriods ? r.per : 1)); return [T(r.dept.name, `<b>${esc(r.dept.name)}</b>`), T(r.dept.teacher), ...v.map((x) => N(x)), { h: `<b>${fmt(v.reduce((a, b) => a + b, 0))}</b>`, v: v.reduce((a, b) => a + b, 0) }]; };
  return `<div class="sec-h"><h3>분기별 요일별 운영 가능일</h3><span class="hint">휴업일·미운영 방학을 뺀 날 수 (공통 기준)</span></div>${sTable('tw1', qCols, [{ rows: qRows }], qFoot)}
    <div class="sec"><div class="sec-h"><h3>프로그램별 요일별 ${usePeriods ? '시수' : '횟수'}</h3><span class="hint">프로그램별 운영기간·결강·보강 반영</span></div>${sTable('tw2', dCols, grouped(st, rowFn, 2), ['합계', '', ...sumCols(st.depts.map(rowFn), 2).map((v) => fmt(v))])}</div>`;
}
function tblMonth(st, usePeriods) {
  const ms = st.months;
  const cols = [{ label: '프로그램', stick: true }, { label: '강사' }, ...ms.map((m) => ({ label: Number(m.slice(5)) + '월', cls: 'r' })), { label: '합계', cls: 'r' }];
  const rowFn = (r) => { const v = ms.map((m) => (r.byM[m] || 0) * (usePeriods ? r.per : 1)); return [T(r.dept.name, `<b>${esc(r.dept.name)}</b>`), T(r.dept.teacher), ...v.map((x) => N(x)), { h: `<b>${fmt(v.reduce((a, b) => a + b, 0))}</b>`, v: v.reduce((a, b) => a + b, 0) }]; };
  return sTable('tm', cols, grouped(st, rowFn, 2), ['합계', '', ...sumCols(st.depts.map(rowFn), 2).map((v) => fmt(v))]);
}
function tblWeek(st, usePeriods) {
  const maxW = Math.max(5, ...st.days.map((d) => d.wk));
  const ws = Array.from({ length: maxW }, (_, i) => i + 1);
  const cols = [{ label: '프로그램', stick: true }, { label: '강사' }, { label: '5주차', cls: 'c' }, ...ws.map((w) => ({ label: w + '주차', cls: 'r' })), { label: '계', cls: 'r' }];
  const rowFn = (r) => {
    const v = ws.map((w) => r.byWk[w] * (usePeriods ? r.per : 1));
    const on = week5On(S, r.dept);
    return [T(r.dept.name, `<b>${esc(r.dept.name)}</b>`), T(r.dept.teacher), T(on ? '운영' : '제외', `<span class="tag ${on ? 'acc' : 'warn'}">${on ? '운영' : '제외'}</span>`), ...v.map((x, i) => ({ h: !on && ws[i] >= 5 ? '<span class="muted">제외</span>' : x ? fmt(x) : '<span class="muted">0</span>', v: x })), { h: `<b>${fmt(v.reduce((a, b) => a + b, 0))}</b>`, v: v.reduce((a, b) => a + b, 0) }];
  };
  const rows = st.depts.map(rowFn);
  const foot = ['합계', '', '', ...sumCols(rows, 3).map((v) => fmt(v))];
  const g = grouped(st, rowFn, 3);
  // 분기별 주차별 운영 가능일
  const qCols = [{ label: '분기', stick: true }, ...ws.map((w) => ({ label: w + '주차', cls: 'r' })), { label: '계', cls: 'r' }];
  const qRows = S.quarters.map((q, i) => {
    const v = ws.map((w) => st.scopedDays.filter((d) => d.q === i && d.wk === w && d.dow > 0 && d.dow < 6 && commonOpen(S, d)).length);
    return [T(q.name, `<b>${esc(q.name)}</b>`), ...v.map((x) => N(x)), { h: `<b>${v.reduce((a, b) => a + b, 0)}</b>`, v: v.reduce((a, b) => a + b, 0) }];
  });
  const modeTxt = S.cal.weekMode === 'cal' ? '달력 주 기준(월요일 시작)' : '그 달의 n번째 요일 기준(1~7일=1주차 … 29~31일=5주차)';
  return `<div class="sec-h"><h3>프로그램별 주차별 ${usePeriods ? '시수' : '횟수'}</h3><span class="hint">${modeTxt} · 5주차 수업 ${S.cal.week5 !== false ? '운영' : '미운영'}</span></div>${sTable('tk', cols, g, foot)}
    <div class="sec"><div class="sec-h"><h3>분기별 주차별 평일 운영 가능일</h3><span class="hint">전체 설정 기준</span></div>${sTable('tk2', qCols, [{ rows: qRows }], ['계', ...sumCols(qRows, 1).map((v) => fmt(v))])}</div>`;
}
function tblTeacher(st, showFee) {
  const qs = S.quarters;
  const cols = [{ label: '강사', stick: true }, { label: '담당 프로그램' }, { label: '프로그램 수', cls: 'r' }, ...qs.map((q) => ({ label: esc(q.name), cls: 'r' })), { label: '시수 합계', cls: 'r' }];
  if (showFee) cols.push(...qs.map((q) => ({ label: esc(q.name) + ' 수업료', cls: 'r' })), { label: '수업료 합계', cls: 'r' });
  const rows = st.teachers.map((t) => {
    const row = [T(t.teacher, `<b>${esc(t.teacher)}</b>`), T(t.depts.join(', '), `<span style="white-space:normal">${t.depts.map(esc).join(', ')}</span>`), N(t.depts.length), ...t.byQP.map((v) => N(v)), { h: `<b>${fmt(t.periods)}</b>`, v: t.periods }];
    if (showFee) row.push(...t.byQFee.map((v) => N(v, true)), { h: `<b>${t.fee ? fmt(t.fee) : '–'}</b>`, v: t.fee });
    return row;
  });
  return sTable('tt', cols, [{ rows }], ['합계', '', ...sumCols(rows, 2).map((v) => fmt(v))]) + '<div class="help">강사명이 같으면 여러 프로그램을 합산합니다. 단위: 차시</div>';
}
function deptOptions(selId, withAll) {
  return (withAll ? `<option value="">전체 (운영 가능일)</option>` : '') + S.groups.map((g) => {
    const ds = S.depts.filter((d) => d.group === g.id);
    return ds.length ? `<optgroup label="${esc(g.name)}">${ds.map((d) => `<option value="${d.id}" ${selId === d.id ? 'selected' : ''}>${esc(d.name)}${d.teacher ? ' · ' + esc(d.teacher) : ''} (${dayStr(d)})</option>`).join('')}</optgroup>` : '';
  }).join('');
}
// 달력 그리드. opts.dept: 강조할 프로그램, opts.days: 표시할 날(기본 전체), opts.noSelect: 프로그램 선택 상자 숨김
function calGrid(st, dept, days) {
  const sessSet = dept ? new Set(deptSessions(S, st.days, dept).map((d) => d.iso)) : null;
  const byMonth = {}; days.forEach((d) => (byMonth[d.ym] = byMonth[d.ym] || []).push(d));
  const cells = Object.keys(byMonth).sort().map((ym) => {
    const map = new Map(byMonth[ym].map((d) => [d.n, d]));
    const first = d2n(ym + '-01'), last = first + new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5), 0)).getUTCDate() - 1;
    const html = []; let cnt = 0;
    for (let i = 0; i < dowOf(first); i++) html.push('<div></div>');
    for (let n = first; n <= last; n++) {
      const d = map.get(n); let cls = 'c-out', tip = '기간 밖';
      if (d) {
        const wk = d.dow === 0 || d.dow === 6;
        if (d.closure) { cls = d.closure.type === '공휴일' ? 'c-hol' : 'c-sch'; tip = (d.closure.name || d.closure.type) + (d.closure.type === '공휴일' ? '' : ' (학교 휴업일)'); }
        else if (d.q < 0) { tip = '분기 기간 밖'; }
        else if (wk && !(sessSet && sessSet.has(d.iso))) { cls = 'c-wkend'; tip = '주말'; }
        else if (d.vac && !d.vac.run) { cls = 'c-vacoff'; tip = d.vac.name + ' (방과후 미운영)'; }
        else if (d.vac) { cls = 'c-vacon'; tip = d.vac.name + ' (방과후 운영)'; }
        else { cls = 'c-open'; tip = S.quarters[d.q].name; }
        if ((cls === 'c-open' || cls === 'c-vacon') && d.wk >= 5 && !(dept ? week5On(S, dept) : week5On(S, null))) { cls = 'c-wk5'; tip += ' · 5주차 미운영'; }
        tip = d.wk + '주차 · ' + tip;
        if (sessSet) {
          if (sessSet.has(d.iso)) { cls += ' c-sel'; const mk = (dept.makeups || []).some((c) => c.d === d.iso); if (mk) cls += ' c-mk'; tip += ' · ' + dept.name + (mk ? ' 보강' : ' 수업'); cnt++; }
          else if ((dept.cancels || []).some((c) => c.d === d.iso)) { cls = 'c-cancel'; tip += ' · 휴강'; }
          else if (cls === 'c-open' || cls === 'c-vacon') cls = 'c-wkend';
        } else if (cls === 'c-open' || cls === 'c-vacon') cnt++;
      }
      html.push(`<div class="${cls}" title="${esc(fmtDate(n2d(n)) + ' ' + tip)}">${Number(n2d(n).slice(8))}</div>`);
    }
    return `<div class="mon"><h4>${+ym.slice(0, 4)}년 ${+ym.slice(5)}월 <small>${sessSet ? esc(dept.name) + ' ' + cnt + '회' : '운영 ' + cnt + '일'}</small></h4><div class="wk">${DOW.map((w) => `<div class="wh">${w}</div>`).join('')}${html.join('')}</div></div>`;
  }).join('');
  return `<div class="legend"><span><i class="c-open"></i>운영일</span><span><i class="c-vacon"></i>방학 중 운영</span><span><i class="c-vacoff"></i>방학 미운영</span><span><i class="c-hol"></i>공휴일</span><span><i class="c-sch"></i>학교 휴업일</span>${!week5On(S, dept || null) ? '<span><i class="c-wk5"></i>5주차 제외</span>' : ''}<span><i style="background:#fff"></i>주말·분기 밖</span>${dept ? '<span><i style="outline:2px solid var(--gold);outline-offset:-2px;background:var(--accbg)"></i>수업일</span><span><i class="c-cancel"></i>휴강</span>' : ''}</div>
    <div class="cal-grid">${cells}</div>`;
}
function viewCalendar(st) {
  const dept = S.depts.find((d) => d.id === S.ui.calDept);
  return `<div class="toolbar"><span style="font-size:13px;color:var(--ink2)">프로그램 강조</span><select class="in sm" style="width:260px" data-b="ui.calDept">${deptOptions(S.ui.calDept, true)}</select></div>${calGrid(st, dept, st.days)}`;
}
// 프로그램 한 개의 수업일 (목록/달력) — 통계 ‘수업일 확인’과 강사용 조회 화면이 함께 씀
function deptSchedule(st, r, view) {
  const days = new Map(st.days.map((d) => [d.iso, d]));
  const byQ = S.quarters.map((q) => ({ q, ds: [] }));
  r.dates.forEach((iso) => { const d = days.get(iso); if (d && d.q >= 0) byQ[d.q].ds.push(d); });
  if (view === 'calendar') {
    const shown = st.scopedDays.filter((d) => d.q >= 0 || r.dates.includes(d.iso));
    return calGrid(st, r.dept, shown.length ? st.scopedDays.filter((d) => d.n >= shown[0].n && d.n <= shown[shown.length - 1].n) : st.scopedDays);
  }
  return `<div class="date-list">${byQ.map(({ q, ds }) => `<div class="m"><b>${esc(q.name)}</b> <span class="tag acc">${ds.length}회 · ${ds.length * r.per}차시</span><div class="ds">${ds.map((d) => `<span class="dchip${d.wk >= 5 ? ' w5' : ''}${(r.dept.makeups || []).some((c) => c.d === d.iso) ? ' mk' : ''}">${fmtDate(d.iso)}<em>${d.wk}주</em>${d.vac ? '<sup>방</sup>' : ''}${(r.dept.makeups || []).some((c) => c.d === d.iso) ? '<sup class="mk">보</sup>' : ''}</span>`).join(' ') || '<span class="muted">없음</span>'}</div></div>`).join('')}</div>
    <div class="help" style="margin-top:8px">‘n주’는 그 달의 주차, <sup style="color:var(--vac)">방</sup>은 방학 중 수업, <sup style="color:var(--acc)">보</sup>는 보강입니다.${(r.dept.cancels || []).length ? ` 휴강 ${r.dept.cancels.length}일: ${r.dept.cancels.map((c) => fmtDate(c.d)).join(', ')}` : ''}</div>`;
}
const viewSeg = (path, cur) => `<div class="seg" data-seg="${path}"><button class="${cur !== 'calendar' ? 'on' : ''}" data-v="list">목록</button><button class="${cur === 'calendar' ? 'on' : ''}" data-v="calendar">달력</button></div>`;
function viewDates(st) {
  const sel = S.ui.listDept && S.depts.some((d) => d.id === S.ui.listDept) ? S.ui.listDept : (S.depts[0] && S.depts[0].id) || '';
  const r = st.depts.find((x) => x.dept.id === sel);
  const dept = r && r.dept;
  return `<div class="toolbar"><select class="in sm" style="width:300px" data-b="ui.listDept">${deptOptions(sel, false)}</select>${viewSeg('ui.dview', S.ui.dview)}<span class="sp"></span>
      ${dept && !RO ? `<button class="btn sm" data-share="${dept.id}">강사용 링크</button>` : ''}${r ? '<button class="btn sm" data-act="copyDates">날짜 목록 복사</button>' : ''}</div>
    ${r ? deptSchedule(st, r, S.ui.dview) : '<div class="empty">프로그램을 선택하세요.</div>'}`;
}

/* ================= 강사용 조회 (6자리 링크) ================= */
const SHARE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const newShare = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => SHARE_ABC[b % SHARE_ABC.length]).join('');
const SHARE_HASH_RE = /^#t-([A-Za-z0-9]{6})$/;
let TEACHER = null;   // { code, payload }
function shareLink(code) {
  if (BE === 'http') return location.origin + location.pathname + '#t-' + code;
  return null;   // claude.ai 웹앱 안에서는 웹앱 주소를 알 수 없으므로 코드로 안내
}
function shareModal(deptId) {
  const d = S.depts.find((x) => x.id === deptId); if (!d) return;
  if (!d.share) { d.share = newShare(); save(); }
  const link = shareLink(d.share);
  modal('강사용 링크', `<p><b>${esc(d.name || '(이름 없음)')}</b>${d.teacher ? ' · ' + esc(d.teacher) + ' 선생님' : ''}에게 보낼 링크입니다. 이 링크로 들어오면 로그인 없이 <b>이 프로그램의 수업일·시수, 학사일정, 분기 일정</b>만 볼 수 있습니다(수업료는 보이지 않음).</p>
    ${link ? `<div class="field"><label>링크</label><div style="display:flex;gap:6px"><input class="in" id="shareUrl" value="${esc(link)}" readonly><button class="btn" data-copy="${esc(link)}">복사</button></div></div>` : ''}
    <div class="field" style="margin-top:10px"><label>조회 코드</label><div style="display:flex;gap:6px;align-items:center"><span class="share-code">${esc(d.share)}</span><button class="btn sm" data-copy="${esc(d.share)}">코드 복사</button></div>
    <div class="help">${link ? '링크 대신 첫 화면의 ‘강사용 조회’에 코드를 입력해도 됩니다.' : '이 화면에서는 웹앱 주소 뒤에 <b>#t-' + esc(d.share) + '</b> 를 붙이거나, 첫 화면 ‘강사용 조회’에 코드를 입력하면 됩니다.'}</div></div>
    <div class="alert info" style="margin-top:12px">링크가 다른 사람에게 퍼졌다면 ‘새 링크 만들기’를 누르세요. 이전 링크는 저장 후 바로 쓸 수 없게 됩니다.</div>`, '닫기', null, '');
  const acts = $('#modal .acts');
  const regen = document.createElement('button'); regen.className = 'btn'; regen.textContent = '새 링크 만들기';
  regen.onclick = () => { d.share = newShare(); save(); if (CUR && !OFFLINE) flushRemote(); shareModal(deptId); toast('새 링크를 만들었습니다. 이전 링크는 더 이상 쓸 수 없습니다.'); };
  acts.prepend(regen);
}
function shareListModal() {
  S.depts.forEach((d) => { if (!d.share) d.share = newShare(); }); save();
  const rows = S.groups.flatMap((g) => S.depts.filter((d) => d.group === g.id).map((d) => ({ g, d })));
  const line = ({ g, d }) => [g.name, d.name, d.teacher, shareLink(d.share) || d.share].join('\t');
  const tsv = ['분류\t프로그램\t강사\t' + (BE === 'http' ? '링크' : '조회 코드'), ...rows.map(line)].join('\n');
  modal('강사용 링크 목록', `<p>프로그램마다 강사용 링크가 따로 있습니다. ‘전체 복사’ 후 엑셀이나 메신저에 붙여넣어 강사에게 나눠 주세요.</p>
    <div class="tbl-wrap" style="max-height:360px"><table class="t"><thead><tr><th>프로그램</th><th>강사</th><th>${BE === 'http' ? '링크' : '조회 코드'}</th><th></th></tr></thead><tbody>
    ${rows.map(({ g, d }) => { const v = shareLink(d.share) || d.share; return `<tr><td><span class="muted">${esc(g.name)} ·</span> <b>${esc(d.name)}</b></td><td>${esc(d.teacher)}</td><td class="num" style="max-width:280px;overflow:hidden;text-overflow:ellipsis">${esc(v)}</td><td><button class="btn sm" data-copy="${esc(v)}">복사</button></td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">프로그램이 없습니다.</td></tr>'}
    </tbody></table></div>`, '닫기', null, '');
  const acts = $('#modal .acts');
  const all = document.createElement('button'); all.className = 'btn'; all.textContent = '전체 복사';
  all.onclick = () => copyText(tsv, '강사용 링크 목록을 복사했습니다.');
  acts.prepend(all);
}
async function openTeacher(code) {
  MODE = 'teacher'; TEACHER = { code, payload: null, err: '' }; render();
  if (CONN === 'pending') return;   // 연결 후 다시 호출됨
  try {
    let p;
    if (BE === 'http') p = await api('GET', '/t/' + code);
    else if (BE === 'claude' && DB) {
      const sh = await withTimeout(DB.doc('shares/' + code).get());
      const sc = sh.exists && sh.data().school;
      const snap = sc && (await withTimeout(schoolRef(sc).get()));
      const st = snap && snap.exists ? JSON.parse(snap.data().json || '{}') : null;
      const d = st && (st.depts || []).find((x) => x.share === code);
      if (!d) throw { code: 'http', message: '유효하지 않거나 만료된 링크입니다. 담당 선생님께 새 링크를 요청하세요.' };
      const g = (st.groups || []).find((x) => x.id === d.group) || {};
      const { rate, memo, ...dept } = d;
      p = { school: snap.data().name, info: st.info || {}, cal: st.cal || {}, quarters: st.quarters || [], group: { id: g.id, name: g.name || '' }, dept };
    } else throw { code: 'http', message: '서버에 연결할 수 없어 조회할 수 없습니다.' };
    TEACHER.payload = p;
    const ui = S.ui || {};
    normalize({ info: p.info, cal: p.cal, quarters: p.quarters, groups: [{ id: p.group.id || 'g', name: p.group.name }], depts: [{ ...p.dept, group: p.group.id || 'g' }], ui: { tview: ui.tview || 'list', scope: '', unit: 'periods', semOpen: { 1: false, 2: false } } });
  } catch (e) { TEACHER.err = dbErrText(e); }
  render(); window.scrollTo(0, 0);
}
// 강사 화면: 이번 달 수업 (지난 수업·남은 수업·휴강·보강 한눈에)
function teacherMonth(r, d) {
  const t = todayIso(), ym = t.slice(0, 7), today = d2n(t);
  const mk = new Set((d.makeups || []).map((x) => x.d));
  const items = r.dates.filter((iso) => iso.startsWith(ym)).map((iso) => ({ iso, kind: mk.has(iso) ? 'mk' : 'cls' }))
    .concat((d.cancels || []).filter((x) => x.d.startsWith(ym)).map((x) => ({ iso: x.d, kind: 'cx', note: x.note })))
    .sort((a, b) => (a.iso < b.iso ? -1 : 1));
  if (!items.length) return '';
  const left = items.filter((x) => x.kind !== 'cx' && d2n(x.iso) >= today).length;
  return `<div class="sec"><div class="sec-h"><h3>이번 달 수업 (${Number(ym.slice(5))}월)</h3><span class="hint">남은 수업 ${left}회</span></div>
    <div class="month-chips">${items.map((x) => { const past = d2n(x.iso) < today, isT = x.iso === t; return `<span class="mchip ${x.kind} ${past ? 'past' : ''} ${isT ? 'today' : ''}" title="${x.kind === 'cx' ? '휴강' + (x.note ? ': ' + esc(x.note) : '') : x.kind === 'mk' ? '보강' : '수업'}">${fmtDate(x.iso)}${x.kind === 'cx' ? ' 휴강' : x.kind === 'mk' ? ' 보강' : ''}${isT ? ' · 오늘' : ''}</span>`; }).join('')}</div></div>`;
}
function renderTeacher() {
  const T0 = TEACHER || {};
  if (T0.err) return `<div class="card" style="max-width:640px;margin:20px auto"><h2>강사용 조회</h2><div class="alert warn">${esc(T0.err)}</div><button class="btn" data-act="toGate">첫 화면으로</button></div>`;
  if (!T0.payload) return '<div class="card" style="max-width:640px;margin:20px auto"><div class="empty">수업 정보를 불러오는 중…</div></div>';
  const scope = scopeName(), st = computeStats(S, scope), r = st.depts[0], d = r.dept, c = S.cal;
  const qRows = S.quarters.map((q, i) => `<tr><td><b>${esc(q.name)}</b></td><td class="num">${fmtDate(q.start)} ~ ${fmtDate(q.end)}</td><td class="r num">${r.byQ[i]}회</td><td class="r num"><b>${r.byQP[i]}</b>차시</td></tr>`).join('');
  const semList = (sem) => {
    const vacs = c.vacations.filter((v) => semOfItem(v) === sem && v.start);
    const cls = c.closures.filter((h) => semOfItem(h) === sem && h.start).sort((a, b) => (a.start < b.start ? -1 : 1));
    return `<div class="fold ${S.ui.semOpen[sem] === false ? 'closed' : ''}"><div class="fold-h" data-fold-sem="${sem}"><span class="car">▼</span><h3>${sem}학기</h3><span class="tag vac">방학 ${vacs.length}</span><span class="tag hol">휴업일 ${cls.length}건</span></div>
      <div class="fold-b">${vacs.map((v) => `<div class="kv"><span class="tag vac">방학</span> <b>${esc(v.name)}</b> ${fmtDate(v.start)} ~ ${fmtDate(v.end)} · 방과후 ${v.run ? '운영' : '미운영'}</div>`).join('')}
      <div class="tbl-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>날짜</th><th>명칭</th><th>구분</th></tr></thead><tbody>${cls.map((h) => `<tr><td class="num">${fmtDate(h.start)}${h.end ? ' ~ ' + fmtDate(h.end) : ''}</td><td>${esc(h.name)}</td><td><span class="tag ${h.type === '공휴일' ? 'hol' : 'sch'}">${esc(h.type)}</span></td></tr>`).join('') || '<tr><td colspan="3" class="empty">휴업일 없음</td></tr>'}</tbody></table></div></div></div>`;
  };
  return `<div class="card">
    <div class="toolbar"><div><div class="help" style="margin:0">${esc([T0.payload.school, yearLabel(), T0.payload.group.name].filter(Boolean).join(' · '))}</div>
      <h2 style="margin:2px 0 0">${esc(d.name)} ${d.teacher ? `<span style="font-weight:500;color:var(--ink2);font-size:15px">${esc(d.teacher)} 선생님</span>` : ''}</h2>
      <div class="help" style="margin:2px 0 0">매주 ${dayStr(d) || '–'} · 회당 ${r.per}차시 · 5주차 ${week5On(S, d) ? '운영' : '미운영'}${d.start ? ' · ' + fmtDate(d.start) + '부터' : ''}${d.end ? ' · ' + fmtDate(d.end) + '까지' : ''}</div></div>
      <span class="sp"></span><div class="seg" data-seg="ui.scope">${['1학기', '2학기', '연간'].map((x) => `<button class="${scope === x ? 'on' : ''}" data-v="${x}">${x}</button>`).join('')}</div></div>
    <div class="kpis">
      <div class="kpi"><div class="l">${esc(scope)} 수업 횟수</div><div class="v num">${r.count}<small>회</small></div></div>
      <div class="kpi"><div class="l">${esc(scope)} 수업시수</div><div class="v num">${r.periods}<small>차시</small></div></div>
      ${(() => {
        const t = new Date(), today = d2n(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
        const qi = S.quarters.findIndex((q) => today >= d2n(q.start) && today <= d2n(q.end));
        const left = r.dates.filter((iso) => d2n(iso) >= today).length, next = r.dates.find((iso) => d2n(iso) >= today);
        return `<div class="kpi"><div class="l">${qi >= 0 ? '이번 분기 (' + esc(S.quarters[qi].name) + ')' : '이번 분기'}</div><div class="v num">${qi >= 0 ? r.byQP[qi] + '<small>차시</small>' : '<span style="font-size:14px;color:var(--mute);font-weight:400">분기 기간 아님</span>'}</div></div>
          <div class="kpi"><div class="l">다음 수업 · 남은 수업</div><div class="v num">${next ? fmtDate(next) : '<span style="font-size:14px;color:var(--mute);font-weight:400">없음</span>'}<small> · ${left}회</small></div></div>`;
      })()}
    </div>
    ${teacherMonth(r, d)}
    <div class="sec-h"><h3>내 수업일</h3><span class="sp"></span>${viewSeg('ui.tview', S.ui.tview)}<button class="btn sm" data-act="copyDates">날짜 목록 복사</button><button class="btn sm" data-act="printSheetT">수업 확인서 인쇄</button></div>
    ${deptSchedule(st, r, S.ui.tview)}
    ${(d.cancels || []).length || (d.makeups || []).length ? `<div class="sec"><div class="sec-h"><h3>휴강·보강 안내</h3></div><div class="grid g2">
      <div class="tbl-wrap"><table class="t"><thead><tr><th>휴강일</th><th>사유</th></tr></thead><tbody>${(d.cancels || []).map((c) => `<tr><td class="num">${fmtDate(c.d)}</td><td>${esc(c.note || '')}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">없음</td></tr>'}</tbody></table></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>보강일</th><th>사유</th></tr></thead><tbody>${(d.makeups || []).map((c) => `<tr><td class="num">${fmtDate(c.d)}</td><td>${esc(c.note || '')}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">없음</td></tr>'}</tbody></table></div></div></div>` : ''}
    <div class="sec"><div class="sec-h"><h3>분기 일정</h3></div><div class="tbl-wrap"><table class="t"><thead><tr><th>분기</th><th>기간</th><th class="r">수업 횟수</th><th class="r">시수</th></tr></thead><tbody>${qRows}</tbody>
      <tfoot><tr><td>합계</td><td></td><td class="r num">${r.count}회</td><td class="r num">${r.periods}차시</td></tr></tfoot></table></div></div>
    <div class="sec"><div class="sec-h"><h3>학사일정</h3><span class="hint">학년도 ${fmtDate(c.start)} ~ ${fmtDate(c.end)}${c.sem2Start ? ' · 2학기 시작 ' + fmtDate(c.sem2Start) : ''}</span><span class="sp"></span><button class="btn sm ghost" data-act="semAll" data-v="1">모두 펼치기</button><button class="btn sm ghost" data-act="semAll" data-v="0">모두 접기</button></div>
      ${semList(1)}${semList(2)}</div>
    <p class="help" style="margin-top:16px">이 화면은 읽기 전용입니다. 일정이 바뀌면 학교 담당자가 수정한 내용이 바로 반영됩니다. 문의는 학교 방과후 담당자에게 해 주세요.</p>
  </div>`;
}


/* ================= 백업 · 복원 ================= */
async function backupModal() {
  const fd = (t) => (t ? new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
  const srv = CUR && BE === 'http' && !OFFLINE && !DEMO && !ADMIN_VIEW;
  const lbl = { auto: '그날 처음 고치기 전', manual: '덮어쓰기 전', restore: '복원하기 전' };
  const local = localBackups();
  const localRows = local.map((b, i) => `<tr><td class="num">${fd(b.at)}</td><td>이 기기</td><td class="r num">${fmt(b.deptCount)}개</td><td class="r"><button class="btn sm" data-bk-local="${i}">복원</button></td></tr>`).join('');
  modal('백업 · 복원', `<p>입력 내용은 <b>날마다 처음 고치기 전 상태</b>로 자동 백업됩니다. 실수로 지우거나 잘못 고쳤을 때 이전 상태로 되돌릴 수 있습니다.</p>
    <div class="tbl-wrap" style="max-height:340px"><table class="t"><thead><tr><th>백업 시점 (그 시점까지의 내용)</th><th>위치</th><th class="r">프로그램</th><th></th></tr></thead><tbody id="bkBody">
      ${srv ? '<tr><td colspan="4" class="empty">서버 백업을 불러오는 중…</td></tr>' : ''}${localRows}
      ${!srv && !local.length ? '<tr><td colspan="4" class="empty">아직 백업이 없습니다. 내일부터 하루 한 번씩 쌓입니다.</td></tr>' : ''}
    </tbody></table></div>
    <div class="help">${srv ? '서버에는 최근 10개, ' : ''}이 기기(브라우저)에는 최근 7일치를 보관합니다. 복원해도 복원 직전 내용이 다시 백업되므로 되돌릴 수 있습니다. 오래 보관하려면 ‘JSON 파일로 저장’을 쓰세요.</div>`, '닫기', null, '');
  const bind = () => {
    $$('#modal [data-bk-local]').forEach((b) => (b.onclick = () => restoreFrom(JSON.parse(local[+b.dataset.bkLocal].json), fd(local[+b.dataset.bkLocal].at))));
    $$('#modal [data-bk-srv]').forEach((b) => (b.onclick = async () => {
      try { const r = await api('GET', '/school/backups/' + b.dataset.bkSrv, null, schoolToken()); restoreFrom(JSON.parse(r.json), b.dataset.when); }
      catch (e) { toast(dbErrText(e)); }
    }));
  };
  bind();
  if (srv) {
    try {
      const list = (await api('GET', '/school/backups', null, schoolToken())).backups || [];
      const body = $('#bkBody'); if (!body) return;
      body.innerHTML = list.map((b) => `<tr><td class="num">${fd(b.at)} <span class="muted">· ${lbl[b.label] || ''}</span></td><td>서버</td><td class="r num">${fmt(b.deptCount)}개</td><td class="r"><button class="btn sm" data-bk-srv="${esc(b.id)}" data-when="${esc(fd(b.at))}">복원</button></td></tr>`).join('') + localRows
        || '<tr><td colspan="4" class="empty">아직 백업이 없습니다. 오늘 이후 처음 고칠 때부터 쌓입니다.</td></tr>';
      bind();
    } catch (e) { const body = $('#bkBody'); if (body) body.insertAdjacentHTML('afterbegin', `<tr><td colspan="4" class="empty">${esc(dbErrText(e))}</td></tr>`); }
  }
}
function restoreFrom(st, when) {
  if (!st || !st.info || !st.cal) return toast('백업 자료를 읽을 수 없습니다.');
  confirmBox('백업으로 되돌리기', `<b>${esc(when)}</b> 시점의 내용으로 되돌립니다. 지금 내용은 ${CUR && !OFFLINE ? '서버 백업에' : '이 기기 백업에'} 남겨 두므로 다시 되돌릴 수 있습니다.`, '되돌리기', async () => {
    const keepUi = S.ui;
    if (!CUR || OFFLINE) { try { const day = todayIso() + ' 복원 전', list = localBackups(); list.unshift({ day, at: Date.now(), deptCount: S.depts.length, json: JSON.stringify(snapshot()) }); while (list.length > LOCAL_BK_KEEP + 1) list.pop(); localStorage.setItem(localBkKey(), JSON.stringify(list)); } catch (e) {} }
    normalize(st); S.ui = Object.assign(S.ui, { tab: keepUi.tab }); S._school = CUR || undefined;
    if (CUR && !OFFLINE) { S.savedAt = Date.now(); remoteDirty = true; await flushRemote({ backupNow: 'restore' }); saveDevice(); }
    else { S.savedAt = Date.now(); saveDevice(); }
    render(); toast('백업 시점의 내용으로 되돌렸습니다.');
  });
}

/* ================= 최고관리자: 공휴일 관리 · 전체 백업 ================= */
function holidayAdminModal() {
  const years = [2026, 2027, 2028, 2029, 2030];
  let y = Math.min(Math.max(new Date().getFullYear(), 2026), 2030);
  let add = (SETTINGS.holidays || []).slice(), off = new Set(SETTINGS.holidayOff || []);
  const draw = () => {
    const bi = builtinHolidays(y), cu = add.filter((h) => h.date.startsWith(y + '-'));
    $('#holBox').innerHTML = `<div class="seg" style="margin-bottom:8px">${years.map((v) => `<button type="button" class="${v === y ? 'on' : ''}" data-hy="${v}">${v}</button>`).join('')}</div>
      <div class="tbl-wrap" style="max-height:300px"><table class="t"><thead><tr><th>날짜</th><th>명칭</th><th>구분</th><th class="c">적용</th></tr></thead><tbody>
      ${[...bi.map((h) => ({ ...h, kind: 'b' })), ...cu.map((h) => ({ ...h, kind: 'c' }))].sort((a, b) => (a.date < b.date ? -1 : 1)).map((h) => `<tr><td class="num">${fmtDate(h.date)}</td><td>${esc(h.name)}</td><td>${h.kind === 'b' ? '<span class="muted">기본</span>' : '<span class="tag acc">추가</span>'}</td>
        <td class="c">${h.kind === 'b' ? `<label class="toggle"><input type="checkbox" data-hoff="${h.date}" ${off.has(h.date) ? '' : 'checked'}><span></span></label>` : `<button type="button" class="btn sm icon ghost danger" data-hdel="${h.date}" title="삭제">✕</button>`}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">공휴일 없음</td></tr>'}
      </tbody></table></div>
      <div class="toolbar" style="margin:10px 0 0"><input class="in sm" type="date" id="hDate" min="${y}-01-01" max="${y}-12-31"><input class="in sm" id="hName" placeholder="명칭 (예: 임시공휴일, 대통령선거)" style="flex:1"><button type="button" class="btn sm" id="hAdd">+ 추가</button></div>`;
    $$('#holBox [data-hy]').forEach((b) => (b.onclick = () => { y = +b.dataset.hy; draw(); }));
    $$('#holBox [data-hoff]').forEach((b) => (b.onchange = () => { b.checked ? off.delete(b.dataset.hoff) : off.add(b.dataset.hoff); }));
    $$('#holBox [data-hdel]').forEach((b) => (b.onclick = () => { add = add.filter((h) => h.date !== b.dataset.hdel); draw(); }));
    $('#hAdd').onclick = () => {
      const d = $('#hDate').value, n = $('#hName').value.trim();
      if (isNaN(d2n(d))) return toast('날짜를 고르세요.');
      add = add.filter((h) => h.date !== d).concat({ date: d, name: n || '공휴일' }); off.delete(d); y = +d.slice(0, 4); draw();
    };
  };
  modal('공휴일 관리', `<p>임시공휴일·선거일처럼 새로 정해진 공휴일을 추가하거나, 기본 공휴일을 빼면 <b>모든 학교</b>에 적용됩니다. 각 학교의 2단계 학사일정에 ‘학사일정에 없는 공휴일’ 안내가 뜨고, 버튼 한 번으로 넣을 수 있습니다.</p><div id="holBox"></div>`, '저장', () => {
    (async () => {
      const body = { holidays: add, holidayOff: [...off] };
      try {
        if (BE === 'http') applyHolidaySettings(await api('PUT', '/admin/settings', body, adminTokenGet()));
        else { await withTimeout(DB.doc('settings/app').set({ allowCreate: SETTINGS.allowCreate, ...body, updatedAt: Date.now() })); applyHolidaySettings(body); }
        toast('공휴일 설정을 저장했습니다. 모든 학교에 적용됩니다.');
      } catch (e) { toast(dbErrText(e)); }
    })();
  });
  draw();
}
async function adminExport() {
  toast('전체 학교 자료를 모으는 중…');
  try {
    let data;
    if (BE === 'http') data = await api('GET', '/admin/export', null, adminTokenGet());
    else {
      const snap = await withTimeout(DB.collection('schools').limit(1000).get());
      data = { app: 'ClassCount', version: APP_VERSION, exportedAt: new Date().toISOString(), settings: SETTINGS, schools: snap.docs.filter((d) => d.exists).map((d) => { const x = d.data(); return { code: d.id, name: x.name, json: x.json, archives: x.archive || {}, createdAt: x.createdAt, updatedAt: x.updatedAt }; }) };
    }
    const d = new Date();
    await saveFile(`ClassCount_전체학교백업_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`, JSON.stringify(data, null, 1));
    toast(`${data.schools.length}개 학교 자료를 저장했습니다. (비밀번호 정보는 들어 있지 않습니다)`);
  } catch (e) { toast(dbErrText(e)); }
}

/* ================= 수업 확인서 인쇄 ================= */
function confirmSheetModal(teacherMode) {
  const st = computeStats(S, '연간');
  const today = d2n(todayIso());
  const qi = Math.max(0, S.quarters.findIndex((q) => today >= d2n(q.start) && today <= d2n(q.end)));
  const depts = st.depts.filter((r) => r.dept.name);
  if (!depts.length || !S.quarters.length) return toast('프로그램과 분기를 먼저 입력하세요.');
  const anyFee = !teacherMode && depts.some((r) => r.rate > 0);
  modal('수업 확인서 인쇄', `<p>분기마다 강사별 수업 날짜와 시수를 한 장으로 정리합니다. 단순 확인용 참고 자료이며 법적 효력은 없습니다.</p>
    <div class="grid g2">
      <div class="field"><label>기간</label><select class="in sm" id="csQ">${S.quarters.map((q, i) => `<option value="${i}" ${i === qi ? 'selected' : ''}>${esc(q.name)} (${fmtDate(q.start, false)} ~ ${fmtDate(q.end, false)})</option>`).join('')}<option value="all">연간 (모든 분기)</option></select></div>
      ${teacherMode ? '' : `<div class="field"><label>프로그램</label><select class="in sm" id="csD"><option value="">전체 프로그램 (한 장씩)</option>${depts.map((r) => `<option value="${r.dept.id}">${esc((groupOf(r.dept.group) || {}).name ? groupOf(r.dept.group).name + ' > ' : '')}${esc(r.dept.name)}${r.dept.teacher ? ' · ' + esc(r.dept.teacher) : ''}</option>`).join('')}</select></div>`}
    </div>
    <div class="ro-opts" style="margin-top:8px">
      ${anyFee ? '<label class="chk"><input type="checkbox" id="csFee" checked> 수업료(차시당 단가 × 시수) 표시</label>' : ''}
      <label class="chk"><input type="checkbox" id="csZero"> 수업이 없는 프로그램도 인쇄</label>
    </div>`, '인쇄', (m) => {
    const qv = m.querySelector('#csQ').value, dv = teacherMode ? '' : m.querySelector('#csD').value;
    const fee = !!(m.querySelector('#csFee') && m.querySelector('#csFee').checked), zero = m.querySelector('#csZero').checked;
    printSheets(st, qv, dv, fee, zero);
  });
}
function printSheets(st, qv, deptId, fee, zero) {
  const days = new Map(st.days.map((d) => [d.iso, d]));
  const range = qv === 'all' ? { name: '연간', start: S.quarters[0].start, end: S.quarters[S.quarters.length - 1].end } : S.quarters[+qv];
  const a = d2n(range.start), b = d2n(range.end);
  const school = (TEACHER && TEACHER.payload && TEACHER.payload.school) || S.info.school || '';
  const rows = st.depts.filter((r) => r.dept.name && (!deptId || r.dept.id === deptId));
  const pages = rows.map((r) => {
    const d = r.dept, mk = new Set((d.makeups || []).map((x) => x.d)), mkNote = new Map((d.makeups || []).map((x) => [x.d, x.note]));
    const dates = r.dates.filter((iso) => { const n = d2n(iso); return n >= a && n <= b; });
    if (!dates.length && !zero) return '';
    const cancels = (d.cancels || []).filter((x) => { const n = d2n(x.d); return n >= a && n <= b; });
    const n = dates.length, periods = n * r.per, money = periods * r.rate, g = groupOf(d.group);
    const rowOf = (iso, i) => { const dd = days.get(iso); return `<tr><td class="c">${i + 1}</td><td>${fmtDate(iso)}</td><td class="c">${dd ? dd.wk + '주' : ''}</td><td class="c">${r.per}</td><td>${mk.has(iso) ? '보강' + (mkNote.get(iso) ? ' (' + esc(mkNote.get(iso)) + ')' : '') : ''}</td></tr>`; };
    const head = '<thead><tr><th style="width:9%">순</th><th>수업일</th><th style="width:13%">주차</th><th style="width:12%">차시</th><th style="width:30%">비고</th></tr></thead>';
    const two = dates.length > 22, half = Math.ceil(dates.length / 2);   // 수업이 많으면 두 단으로 나눠 한 장에
    const list = dates.map(rowOf).join('');
    return `<section class="page">
      <h1>${esc(S.info.year ? S.info.year + '학년도 ' : '')}방과후학교 강사 수업 확인서</h1>
      <div class="sub">${esc(range.name)} · ${fmtDate(range.start)} ~ ${fmtDate(range.end)}</div>
      <table class="info"><tr><th>학교</th><td>${esc(school)}</td><th>분류</th><td>${esc((g && g.name) || '')}</td></tr>
        <tr><th>프로그램</th><td>${esc(d.name)}</td><th>강사</th><td>${esc(d.teacher || '')}</td></tr>
        <tr><th>수업 요일</th><td>매주 ${esc(dayStr(d) || '–')}</td><th>회당 차시</th><td>${r.per}차시</td></tr></table>
      ${two ? `<div class="cols"><table class="list">${head}<tbody>${dates.slice(0, half).map((x, i) => rowOf(x, i)).join('')}</tbody></table><table class="list">${head}<tbody>${dates.slice(half).map((x, i) => rowOf(x, i + half)).join('')}</tbody></table></div>`
        : `<table class="list">${head}<tbody>${list || '<tr><td colspan="5" class="c">이 기간에 수업이 없습니다.</td></tr>'}</tbody></table>`}
      <table class="total"><tr><th>합계</th><td><b>${n}회 · ${periods}차시</b></td>${fee && r.rate ? `<th>수업료</th><td>${fmt(r.rate)}원 × ${periods}차시 = <b>${fmt(money)}원</b></td>` : ''}</tr></table>
      ${cancels.length ? `<div class="note"><b>휴강</b> ${cancels.map((x) => fmtDate(x.d) + (x.note ? ' (' + esc(x.note) + ')' : '')).join(', ')}</div>` : ''}
      <p class="disclaimer">※ 이 확인서는 학사일정에 따라 계산한 수업 일정과 시수를 단순히 확인하기 위한 참고 자료이며, 법적 효력이 없습니다.</p>
      <p class="date">출력일: ${new Date().toLocaleDateString('ko-KR')} · ClassCount</p>
    </section>`;
  }).filter(Boolean);
  if (!pages.length) return toast('이 기간에 인쇄할 수업이 없습니다.');
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>수업 확인서</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #111; font-size: 11pt; margin: 0; }
    .page { page-break-after: always; } .page:last-child { page-break-after: auto; }
    h1 { text-align: center; font-size: 18pt; margin: 0 0 4px; letter-spacing: 1px; } .sub { text-align: center; color: #444; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } th, td { border: 1px solid #555; padding: 5px 7px; font-size: 10pt; }
    th { background: #f0f0f0; font-weight: 600; } .info th { width: 14%; } .list td.c, .list th { text-align: center; } .c { text-align: center; }
    .cols { display: flex; gap: 8px; align-items: flex-start; } .cols table { flex: 1; } .cols th, .cols td { padding: 3px 5px; font-size: 9pt; }
    .total th { width: 12%; background: #e8e8e8; } .note { font-size: 10pt; margin: 4px 0 10px; } .disclaimer { margin: 18px 0 4px; padding: 8px 10px; border: 1px solid #999; background: #f7f7f7; font-size: 9.5pt; } .date { text-align: right; color: #666; font-size: 9pt; margin: 4px 0 0; }
  </style></head><body>${pages.join('')}</body></html>`;
  let fr = $('#printFrame'); if (fr) fr.remove();
  fr = document.createElement('iframe'); fr.id = 'printFrame'; fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(fr);
  const doc = fr.contentWindow.document; doc.open(); doc.write(html); doc.close();
  setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('인쇄 창을 열 수 없습니다. 브라우저 설정을 확인하세요.'); } }, 250);
}

/* ================= 이벤트 ================= */
const getPath = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
function setPath(p, val) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = val; }

function onInput(e) {
  if (e.target.id === 'allowCreate') { if (e.type === 'change') setAllowCreate(e.target.checked); return; }
  if (e.target.id === 'yearSel') { if (e.type === 'change') switchYear(e.target.value); return; }
  if (e.target.matches('[data-admin-q]')) { ADMIN.q = e.target.value; const pos = e.target.selectionStart; render(); const n = $('[data-admin-q]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  const el = e.target.closest('[data-b]'); if (!el) return;
  const path = el.dataset.b;
  if (MODE !== 'app' && !(MODE === 'teacher' && path.startsWith('ui.'))) return;
  if ((RO || MODE === 'teacher') && !path.startsWith('ui.')) return;
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (path.endsWith('.rate')) { val = String(val).replace(/[^\d]/g, ''); if (e.type === 'change') el.value = val ? fmt(val) : ''; }
  if (path === 'info.year') {
    const v = String(val).replace(/[^\d]/g, '');
    const help = $('#yearHelp');
    if (!validYear(v)) {   // 입력 중(예: '20')이거나 범위 밖이면 아직 반영하지 않음
      if (help) help.textContent = `${YEAR_MIN}~${YEAR_MAX}년 사이의 4자리 연도로 입력하세요.`;
      if (e.type === 'change') { el.value = S.info.year || ''; if (v) toast(`학년도는 ${YEAR_MIN}년부터 ${YEAR_MAX}년까지만 입력할 수 있습니다.`); if (help && validYear(S.info.year)) help.textContent = `학사일정 기본 기간: ${S.info.year}.3.1. ~ ${Number(S.info.year) + 1}.2.${Number(yearEnd(S.info.year).slice(8))}.`; }
      return;
    }
    val = Number(v);
    const old = S.info.year;
    if (old !== val) {
      // 학사일정 기간이 비어 있거나 이전 학년도의 기본값이면 새 학년도 기본값으로 맞춤
      const autoStart = !S.cal.start || (validYear(old) && S.cal.start === yearStart(old));
      const autoEnd = !S.cal.end || (validYear(old) && S.cal.end === yearEnd(old));
      if (autoStart) S.cal.start = yearStart(val);
      if (autoEnd) S.cal.end = yearEnd(val);
      if (help) help.textContent = `학사일정 기본 기간: ${val}.3.1. ~ ${val + 1}.2.${Number(yearEnd(val).slice(8))}.`;
      if (autoStart || autoEnd) toast(`학사일정 기간을 ${val}.3.1. ~ ${val + 1}.2.${Number(yearEnd(val).slice(8))}.로 맞췄습니다.`);
      if (!(autoStart && autoEnd)) toast('학사일정 기간은 직접 바꾼 날짜라 그대로 두었습니다. 2단계에서 확인하세요.');
    }
  }
  if (el.type === 'date') {
    // 날짜를 직접 입력하는 도중(연도 한 자리씩)에는 반영·다시 그리기를 하지 않음
    if (val && !validYear(val.slice(0, 4))) return;
    const same0 = getPath(path) === val;
    setPath(path, val);
    const m0 = path.match(/^cal\.(vacations|closures)\.(\d+)\.start$/);
    if (m0) { const it = S.cal[m0[1]][+m0[2]]; const s0 = semOfDate(it.start); if (s0) it.sem = s0; }
    if ((path === 'cal.sem1End' || path === 'cal.sem2Start') && !same0) autoSummer();
    const mv = path.match(/^cal\.vacations\.(\d+)\.(start|end)$/);
    if (mv && !same0) S.cal.vacations[+mv[1]].auto = false;   // 직접 고친 방학은 자동 입력하지 않음
    // 분기 종료일 → 다음 분기 시작일을 다음 평일로 자동 입력
    const mq = path.match(/^quarters\.(\d+)\.end$/);
    if (mq && val && !same0) {
      const nq = S.quarters[+mq[1] + 1];
      if (nq) {
        const ns = nextWeekday(val);
        if (ns && nq.start !== ns) {
          nq.start = ns;
          const nsEl = document.querySelector(`[data-b="quarters.${+mq[1] + 1}.start"]`); if (nsEl) nsEl.value = ns;
          toast(`${nq.name || '다음 분기'} 시작일을 ${fmtDate(ns)}로 맞췄습니다.`);
        }
      }
    }
    if (!same0) save();
    if (document.activeElement === el) pendingDateRender = true; else scheduleRender();
    return;
  }
  const same = getPath(path) === val;
  setPath(path, val);
  // 날짜가 생긴 항목은 학기 정보도 갱신
  const m = path.match(/^cal\.(vacations|closures)\.(\d+)\.start$/);
  if (m) { const it = S.cal[m[1]][+m[2]]; const s = semOfDate(it.start); if (s) it.sem = s; }
  if (!same) save();
  if (path.startsWith('info.')) $('#subTitle').textContent = [S.info.school, yearLabel()].filter(Boolean).join(' · ');
  const structural = el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date' || e.type === 'change';
  if (structural && !(path === 'info.school' || path === 'info.manager' || /\.(name|teacher|memo)$/.test(path))) scheduleRender();
}
// 버튼을 누르는 도중(포인터 다운) 다시 그리면 클릭이 사라지므로, 포인터를 뗀 뒤에 그림
let pointerIsDown = false, pendingRender = false;
document.addEventListener('pointerdown', () => (pointerIsDown = true), true);
document.addEventListener('pointerup', () => { pointerIsDown = false; if (pendingRender) setTimeout(() => { pendingRender = false; rerenderKeepFocus(); }, 0); }, true);
let pendingDateRender = false;
document.addEventListener('focusout', (e) => {
  if (pendingDateRender && e.target && e.target.type === 'date') { pendingDateRender = false; setTimeout(scheduleRender, 0); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.type === 'date') { e.preventDefault(); e.target.blur(); } });
function scheduleRender() { if (pointerIsDown) pendingRender = true; else rerenderKeepFocus(); }
function rerenderKeepFocus() {
  const a = document.activeElement, key = a && a.dataset ? a.dataset.b : null, sy = window.scrollY;
  const wraps = $$('.tbl-wrap').map((w) => w.scrollTop);
  render();
  $$('.tbl-wrap').forEach((w, i) => { if (wraps[i]) w.scrollTop = wraps[i]; });
  window.scrollTo(0, sy);
  if (key && a.type !== 'date' && a.tagName !== 'SELECT' && a.type !== 'checkbox') { const n = document.querySelector(`[data-b="${CSS.escape(key)}"]`); if (n) n.focus(); }
}
function rerenderSoft() { const sy = window.scrollY; render(); window.scrollTo(0, sy); }

const RO_ACTS = new Set(['printSheet', 'printSheetT', 'saveNow', 'asOfToday', 'changelog', 'backCurrentYear', 'shareList', 'adminLogin', 'adminLogout', 'copyTable', 'copyDates', 'exportXlsx', 'backup', 'semAll', 'groupAll', 'backAdmin', 'logout', 'toGate', 'openAdmin']);
function onClick(e) {
  if (dragJustEnded) return;
  if (e.target.closest('#saveChip') && MODE === 'app' && CUR && !RO) { ACTIONS.saveNow(); return; }
  const at = e.target.closest('[data-asort],[data-aview],[data-areset],[data-adel]');
  if (at) {
    const d = at.dataset;
    if (d.asort) { ADMIN.sort = ADMIN.sort.col === d.asort ? { col: d.asort, dir: ADMIN.sort.dir === 'desc' ? 'asc' : 'desc' } : { col: d.asort, dir: 'desc' }; render(); }
    else if (d.aview) adminView(d.aview); else if (d.areset) adminReset(d.areset); else if (d.adel) adminDelete(d.adel);
    return;
  }
  const cd = e.target.closest('[data-cd]');
  if (cd) { if (RO) return toast('읽기 전용 보기입니다.'); chgToggle(cd.dataset.cd); return; }
  const chgBtn = e.target.closest('[data-addchg],[data-delchg],[data-chgnav],[data-pickchg],[data-gochg]');
  if (chgBtn) {
    const b = chgBtn.dataset;
    if (b.pickchg) { S.ui.chgDept = b.pickchg; save(); rerenderSoft(); return; }
    if (b.gochg) { S.ui.chgDept = b.gochg; S.step = 5; save(); render(); window.scrollTo(0, 0); return; }
    if (b.chgnav) { const i = S.depts.indexOf(chgDeptSel()) + Number(b.chgnav); if (S.depts[i]) { S.ui.chgDept = S.depts[i].id; save(); rerenderSoft(); } return; }
    if (RO) return toast('읽기 전용 보기입니다.');
    if (b.addchg) { chgAdd(b.addchg); return; }
    if (b.delchg) { const [k, j] = b.delchg.split(':'); const d = chgDeptSel(); d[k].splice(+j, 1); save(); rerenderSoft(); return; }
  }
  const pick = e.target.closest('[data-pick]');
  if (pick) { const i = $('[data-form=login] [name=code]'); i.value = pick.dataset.pick; const pw = $('[data-form=login] [name=pw]'); pw.focus(); pw.scrollIntoView({ block: 'center', behavior: 'smooth' }); gateMsg('login', ''); return; }
  const cp = e.target.closest('[data-copy]');
  if (cp) { copyText(cp.dataset.copy, '복사했습니다.'); return; }
  const sh = e.target.closest('[data-share]');
  if (sh && !RO && MODE === 'app') { if (DEMO) { toast('체험 모드에서는 강사용 링크가 작동하지 않습니다. 학교를 만들면 사용할 수 있습니다.'); return; } shareModal(sh.dataset.share); return; }
  if (RO) {
    const b = e.target.closest('button');
    if (b && (b.dataset.day || b.dataset.dup || b.dataset.del || b.dataset.delgroup || (b.dataset.act && !RO_ACTS.has(b.dataset.act)) || (b.closest('[data-seg="info.semester"]')))) { toast('읽기 전용 보기입니다.'); return; }
  }
  const foldSem = e.target.closest('[data-fold-sem]');
  if (foldSem && !e.target.closest('button,input')) { const s = foldSem.dataset.foldSem; S.ui.semOpen[s] = S.ui.semOpen[s] === false; save(); rerenderSoft(); return; }
  const sfold = e.target.closest('[data-sfold]');
  if (sfold) { const g = sfold.dataset.sfold; S.ui.statFold[g] = !S.ui.statFold[g]; save(); rerenderSoft(); return; }
  const th = e.target.closest('th[data-sort]');
  if (th) {
    const [id, col] = th.dataset.sort.split(':'); const cur = S.ui.sort[id];
    if (!cur || cur.col !== +col) S.ui.sort[id] = { col: +col, dir: 'desc' };
    else if (cur.dir === 'desc') S.ui.sort[id] = { col: +col, dir: 'asc' };
    else delete S.ui.sort[id];
    save(); rerenderSoft(); return;
  }
  const t = e.target.closest('button,[data-step]');
  if (!t) { if (!e.target.closest('.menu')) $('#menuPop').classList.remove('open'); return; }
  const ds = t.dataset;
  if (ds.step || ds.go) { S.step = Number(ds.step || ds.go); save(); render(); window.scrollTo(0, 0); return; }
  if (t.closest('[data-seg]')) { setPath(t.closest('[data-seg]').dataset.seg, ds.v); save(); rerenderSoft(); return; }
  if (ds.tab) { S.ui.tab = ds.tab; save(); rerenderSoft(); return; }
  if (ds.day) {
    const [id, w] = ds.day.split(':'); const d = S.depts.find((x) => x.id === id); const wn = +w;
    d.days = d.days.includes(wn) ? d.days.filter((x) => x !== wn) : [...d.days, wn].sort(); save(); rerenderSoft(); return;
  }
  if (ds.open) { const d = S.depts.find((x) => x.id === ds.open); d.open = !d.open; rerenderSoft(); return; }
  if (ds.gfold) { const g = groupOf(ds.gfold); g.collapsed = !g.collapsed; save(); rerenderSoft(); return; }
  if (ds.dup) {
    const i = S.depts.findIndex((x) => x.id === ds.dup); const c = JSON.parse(JSON.stringify(S.depts[i]));
    c.id = uid(); c.share = newShare(); c.name += ' (복사)'; c.open = false; S.depts.splice(i + 1, 0, c); save(); rerenderSoft(); return;
  }
  if (ds.delgroup) {
    const g = groupOf(ds.delgroup), n = S.depts.filter((d) => d.group === g.id).length;
    const go = () => { S.depts = S.depts.filter((d) => d.group !== g.id); S.groups = S.groups.filter((x) => x.id !== g.id); if (!S.groups.length) S.groups.push({ id: uid(), name: '방과후학교', collapsed: false }); save(); rerenderSoft(); };
    if (n) confirmBox('분류 삭제', `‘${esc(g.name || '이름 없음')}’ 분류와 안에 있는 프로그램 ${n}개를 삭제할까요?`, '삭제', go); else go();
    return;
  }
  if (ds.del) {
    const ks = ds.del.split('.'); const idx = +ks.pop(); const arr = getPath(ks.join('.')); const item = arr[idx];
    const go = () => { arr.splice(idx, 1); save(); rerenderSoft(); };
    if (ks[0] === 'depts' && item && (item.name || item.teacher)) confirmBox('프로그램 삭제', `‘${esc(item.name || '이름 없음')}’ 프로그램을 삭제할까요?`, '삭제', go); else go();
    return;
  }
  if (t.id === 'menuBtn') { $('#menuPop').classList.toggle('open'); return; }
  if (ds.act) { $('#menuPop').classList.remove('open'); ACTIONS[ds.act] && ACTIONS[ds.act](t); }
}

/* ---------- 드래그 앤 드롭 (마우스·터치 공통, 포인터 이벤트) ---------- */
let drag = null, dragJustEnded = false;
function clearDropMarks() { $$('.drop-before,.drop-after,.drop-into').forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-into')); }
function onPointerDown(e) {
  const h = e.target.closest('[data-drag]'); if (!h || e.button > 0 || RO) return;
  e.preventDefault();
  const [kind, id] = h.dataset.drag.split(':');
  const src = kind === 'g' ? h.closest('.grp') : h.closest('tr');
  drag = { kind, id, src, target: null, pos: null, startY: e.clientY, moved: false };
  try { h.setPointerCapture(e.pointerId); } catch (er) {}
  h.addEventListener('pointermove', onPointerMove);
  h.addEventListener('pointerup', onPointerUp, { once: true });
  h.addEventListener('pointercancel', onPointerUp, { once: true });
}
function onPointerMove(e) {
  if (!drag) return;
  if (!drag.moved && Math.abs(e.clientY - drag.startY) < 4) return;
  if (!drag.moved) { drag.moved = true; drag.src.classList.add('dragging'); document.body.classList.add('is-dragging'); if (drag.kind === 'd') { const det = drag.src.nextElementSibling; if (det && det.classList.contains('dept-detail')) det.classList.add('dragging'); } }
  // 화면 가장자리 자동 스크롤
  if (e.clientY < 70) window.scrollBy(0, -14); else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
  clearDropMarks(); drag.target = null;
  const el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return;
  if (drag.kind === 'g') {
    const g = el.closest('.grp'); if (!g || g === drag.src) return;
    const r = g.getBoundingClientRect(); const pos = e.clientY < r.top + Math.min(r.height / 2, 40) ? 'before' : 'after';
    g.classList.add('drop-' + pos); drag.target = g.dataset.gid; drag.pos = pos;
  } else {
    const row = el.closest('tr[data-did]');
    if (row && row !== drag.src) {
      const r = row.getBoundingClientRect(); const pos = e.clientY < r.top + r.height / 2 ? 'before' : 'after';
      row.classList.add('drop-' + pos); drag.target = 'd:' + row.dataset.did; drag.pos = pos; return;
    }
    const gh = el.closest('.grp-h,[data-gempty]');
    if (gh) { const gid = gh.dataset.gdrop || gh.dataset.gempty; (gh.closest('.grp') || gh).querySelector('.grp-h').classList.add('drop-into'); drag.target = 'g:' + gid; drag.pos = 'into'; }
  }
}
function onPointerUp(e) {
  const h = e.currentTarget; h.removeEventListener('pointermove', onPointerMove);
  if (!drag) return;
  const d = drag; drag = null;
  document.body.classList.remove('is-dragging'); clearDropMarks();
  $$('.dragging').forEach((x) => x.classList.remove('dragging'));
  if (!d.moved || !d.target) return;
  dragJustEnded = true; setTimeout(() => (dragJustEnded = false), 50);
  if (d.kind === 'g') {
    const from = S.groups.findIndex((g) => g.id === d.id); const [g] = S.groups.splice(from, 1);
    let to = S.groups.findIndex((x) => x.id === d.target); if (d.pos === 'after') to++;
    S.groups.splice(to, 0, g);
  } else {
    const from = S.depts.findIndex((x) => x.id === d.id); const [dept] = S.depts.splice(from, 1);
    const [tk, tid] = d.target.split(':');
    if (tk === 'd') {
      const tgt = S.depts.find((x) => x.id === tid); dept.group = tgt.group;
      let to = S.depts.indexOf(tgt); if (d.pos === 'after') to++;
      S.depts.splice(to, 0, dept);
    } else {
      dept.group = tid; const g = groupOf(tid); g.collapsed = false;
      let last = -1; S.depts.forEach((x, i) => { if (x.group === tid) last = i; });
      S.depts.splice(last >= 0 ? last + 1 : S.depts.length, 0, dept);
    }
  }
  reorderDepts(); save(); rerenderSoft();
}

/* ---------- 동작 ---------- */
const ACTIONS = {
  adminLogin() {
    modal('최고관리자 로그인', `<p>Cloudflare에 설정한 최고관리자 비밀번호(ADMIN_PASSWORD)를 입력하세요.</p><input class="in" type="password" id="admPw" autocomplete="current-password"><div class="alert warn" id="admMsg" style="display:none"></div>`, '로그인', (m) => {
      const pw = m.querySelector('#admPw').value, msg = m.querySelector('#admMsg');
      api('POST', '/admin/login', { password: pw }).then((r) => { adminTokenSet(r.token); IS_OWNER = true; $('#modal').classList.remove('open'); ACTIONS.openAdmin(); })
        .catch((e) => { msg.textContent = dbErrText(e); msg.style.display = 'flex'; });
      return false;
    });
    setTimeout(() => { const i = $('#admPw'); i && i.focus(); i && i.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#modal [data-ok]').click(); }); }, 30);
  },
  changelog() { changelogModal(); },
  asOfToday() { S.ui.asOf = ''; save(); rerenderSoft(); },
  shareList() { if (DEMO) return toast('체험 모드에서는 강사용 링크가 작동하지 않습니다. 학교를 만들면 사용할 수 있습니다.'); shareListModal(); },
  demo() {
    DEMO = true; OFFLINE = false; CUR = null; RO = false; MODE = 'app';
    normalize(sampleState()); S.step = LAST_STEP; render(); window.scrollTo(0, 0);
    updateSaveUI('체험 모드 · 저장되지 않음');
    toast('예시 학교로 체험합니다. 자유롭게 바꿔 보세요. 바꾼 내용은 저장되지 않습니다.');
  },
  adminLogout() { adminTokenSet(null); IS_OWNER = false; render(); },
  openAdmin() { if (!IS_OWNER) return; MODE = 'admin'; CUR = null; RO = false; render(); loadAdminList(); window.scrollTo(0, 0); },
  adminRefresh() { loadAdminList(); },
  backAdmin() { CUR = null; RO = false; ADMIN_VIEW = false; VIEW_YEAR = null; S_CURRENT = null; S = blankState(); ACTIONS.openAdmin(); },
  backCurrentYear() { switchYear(String(curYear())); },
  rollover() { rolloverModal(); },
  toGate() { if (SHARE_HASH_RE.test(location.hash)) { try { history.replaceState(null, '', location.pathname); } catch (e) { location.hash = ''; } } TEACHER = null; DEMO = false; ADMIN_VIEW = false; VIEW_YEAR = null; S_CURRENT = null; YEARS = []; MODE = 'gate'; CUR = null; RO = false; OFFLINE = false; S = blankState(); render(); },
  logout() { if (VIEW_YEAR) { S = S_CURRENT; VIEW_YEAR = null; RO = ADMIN_VIEW; } if (ADMIN_VIEW) return ACTIONS.backAdmin(); if (OFFLINE || DEMO) { ACTIONS.toGate(); return; } logout(); },
  changePw() { changePassword(false); },
  async offline() {
    const local = await loadDevice();
    OFFLINE = true; DEMO = false; CUR = null; RO = false; MODE = 'app';
    normalize(local && !local._school ? local : {}); render(); updateSaveUI('이 기기에 자동 저장');
  },
  async restoreOffline() { await ACTIONS.offline(); $('#fileIn').click(); },
  defaultYear() { const y = Number(S.info.year); S.cal.start = y + '-03-01'; S.cal.end = n2d(d2n((y + 1) + '-03-01') - 1); save(); rerenderSoft(); },
  semAll(t) { S.ui.semOpen = { 1: t.dataset.v === '1', 2: t.dataset.v === '1' }; save(); rerenderSoft(); },
  groupAll(t) { S.groups.forEach((g) => (g.collapsed = t.dataset.v === '1')); save(); rerenderSoft(); },
  addVac(t) { const s = +t.dataset.sem; S.cal.vacations.push({ id: uid(), sem: s, name: '', start: '', end: '', run: true }); S.ui.semOpen[s] = true; save(); rerenderSoft(); },
  addClosure(t) { const s = +t.dataset.sem; S.cal.closures.push({ id: uid(), sem: s, start: '', end: '', name: '', type: '재량휴업일' }); S.ui.semOpen[s] = true; save(); rerenderSoft(); },
  holIgnore() { S.cal.holIgnore = [...new Set([...(S.cal.holIgnore || []), ...missingHolidays().map((h) => h.date)])]; save(); rerenderSoft(); toast('이 공휴일들은 앞으로 안내하지 않습니다. 필요하면 ‘공휴일 자동 추가’로 넣을 수 있습니다.'); },
  autoHol() {
    const hs = holidaysInRange(S.cal.start, S.cal.end), have = new Set(S.cal.closures.map((c) => c.start));
    let added = 0, weekend = 0;
    hs.forEach((h) => {
      const w = dowOf(d2n(h.date)); if (w === 0 || w === 6) { weekend++; return; }
      if (have.has(h.date)) return;
      S.cal.closures.push({ id: uid(), sem: semOfDate(h.date) || 1, start: h.date, end: '', name: h.name, type: '공휴일' }); added++;
    });
    S.cal.closures.sort((a, b) => ((a.start || '9') < (b.start || '9') ? -1 : 1));
    save(); rerenderSoft();
    toast(added ? `평일 공휴일 ${added}일을 추가했습니다. (주말과 겹친 ${weekend}일은 생략)` : '추가할 공휴일이 없습니다.');
  },
  pasteClosures(t) {
    const sem = +t.dataset.sem;
    modal(`${sem}학기 휴업일 여러 줄 붙여넣기`, `<p>한 줄에 하나씩 <b>날짜 명칭</b> 또는 <b>시작일~종료일 명칭</b> 형식으로 입력하세요. 엑셀의 두 열(날짜, 명칭)을 복사해 붙여도 됩니다.</p>
      <textarea class="in" id="pasteArea" rows="8" placeholder="2026-05-01 재량휴업일&#10;2026-07-24~2026-07-30 방과후 정비&#10;11/16 개교기념일"></textarea>
      <div class="field" style="margin-top:10px"><label>구분</label><select class="in sm" id="pasteType">${CLOSURE_TYPES.map((x) => `<option ${x === '재량휴업일' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`, '추가', (m) => {
      const type = m.querySelector('#pasteType').value; let n = 0;
      m.querySelector('#pasteArea').value.split('\n').forEach((line) => {
        line = line.trim(); if (!line) return;
        const mm = line.match(/^([\d./-]+)\s*(?:~\s*([\d./-]+))?[\s\t,]*(.*)$/); if (!mm) return;
        const s = [...parseDateList(mm[1], S.info.year)][0]; if (!s) return;
        const e2 = mm[2] ? [...parseDateList(mm[2], S.info.year)][0] : '';
        S.cal.closures.push({ id: uid(), sem: semOfDate(s) || sem, start: s, end: e2 || '', name: mm[3].trim(), type }); n++;
      });
      S.cal.closures.sort((a, b) => ((a.start || '9') < (b.start || '9') ? -1 : 1));
      save(); rerenderSoft(); toast(n + '건을 추가했습니다.');
    });
  },
  autoQuarters() {
    const y = Number(S.info.year) || +S.cal.start.slice(0, 4), ya = d2n(S.cal.start), yb = d2n(S.cal.end);
    const raw = [['1분기', y + '-03-01', y + '-05-31'], ['2분기', y + '-06-01', y + '-08-31'], ['3분기', y + '-09-01', y + '-11-30'], ['4분기', y + '-12-01', n2d(d2n((y + 1) + '-03-01') - 1)]];
    const make = () => { S.quarters = raw.map(([name, a, b]) => ({ id: uid(), name, start: n2d(Math.max(d2n(a), ya)), end: n2d(Math.min(d2n(b), yb)) })).filter((q) => d2n(q.end) >= d2n(q.start)); save(); rerenderSoft(); };
    if (S.quarters.length) confirmBox('분기 다시 만들기', '입력된 분기를 기본 4분기로 바꿉니다.', '바꾸기', make); else make();
  },
  addQuarter() { S.quarters.push({ id: uid(), name: (S.quarters.length + 1) + '분기', start: '', end: '' }); save(); rerenderSoft(); },
  addGroup() {
    const g = { id: uid(), name: '', collapsed: false }; S.groups.push(g); save(); rerenderSoft();
    setTimeout(() => { const el = document.querySelector(`[data-gid="${g.id}"] .grp-h .in`); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } }, 0);
  },
  addDept(t) {
    const gid = t.dataset.g || S.groups[S.groups.length - 1].id; const g = groupOf(gid); g.collapsed = false;
    const d = newDept(gid); let last = -1; S.depts.forEach((x, i) => { if (x.group === gid) last = i; });
    S.depts.splice(last >= 0 ? last + 1 : S.depts.length, 0, d); reorderDepts(); save(); rerenderSoft();
    setTimeout(() => { const el = document.querySelector(`tr[data-did="${d.id}"] [data-b$=".name"]`); el && el.focus(); }, 0);
  },
  pasteDepts() {
    modal('엑셀에서 프로그램 붙여넣기', `<p>엑셀에서 <b>프로그램명 · 강사명 · 요일 · 회당 차시 · 차시당 수업료</b> 순서의 열을 복사해 붙여넣으세요. 강사명 뒤의 열은 생략할 수 있고, 요일은 ‘월수’, ‘화,목’처럼 씁니다.</p>
      <div class="field" style="margin-bottom:10px"><label>넣을 분류</label><select class="in sm" id="pasteGroup">${S.groups.map((g) => `<option value="${g.id}">${esc(g.name || '(이름 없음)')}</option>`).join('')}</select></div>
      <textarea class="in" id="pasteArea" rows="8" placeholder="로봇과학&#9;김○○&#9;화&#9;2&#9;20000&#10;영어&#9;이○○&#9;월수목&#9;1"></textarea>`, '추가', (m) => {
      const gid = m.querySelector('#pasteGroup').value; let n = 0;
      m.querySelector('#pasteArea').value.split('\n').forEach((line) => {
        if (!line.trim()) return;
        const cols = (line.includes('\t') ? line.split('\t') : line.split(/\s{2,}|\s*\|\s*/)).map((x) => x.trim());
        const [name, teacher = '', dayTxt = '', per = '1', rate = ''] = cols;
        if (!name || /^(부서|프로그램)(명)?$/.test(name)) return;
        const d = newDept(gid); Object.assign(d, { name, teacher, days: [...new Set([...dayTxt].map((ch) => DOW.indexOf(ch)).filter((w) => w >= 1))].sort(), periods: Number(per) || 1, rate: String(rate).replace(/[^\d]/g, '') });
        S.depts.push(d); n++;
      });
      groupOf(gid).collapsed = false; reorderDepts(); save(); rerenderSoft(); toast(n + '개 프로그램을 추가했습니다.');
    });
  },
  copyTable() {
    const tsv = $$('table.stat').map((tb) => $$('tr', tb).map((tr) => [...tr.children].map((c) => c.innerText.replace(/[▾▸▼▲]/g, '').replace(/\s+/g, ' ').trim()).join('\t')).join('\n')).join('\n\n');
    copyText(tsv, '표를 복사했습니다. 엑셀에 붙여넣으세요.');
  },
  copyDates() {
    const st = computeStats(S, scopeName());
    const sel = S.ui.listDept && S.depts.some((d) => d.id === S.ui.listDept) ? S.ui.listDept : S.depts[0] && S.depts[0].id;
    const r = st.depts.find((x) => x.dept.id === sel); if (!r) return;
    const days = new Map(st.days.map((d) => [d.iso, d]));
    copyText(`${r.dept.name} (${r.dept.teacher || ''})\n` + S.quarters.map((q, i) => q.name + '\t' + r.dates.filter((iso) => days.get(iso).q === i).map((iso) => fmtDate(iso) + days.get(iso).wk + '주').join(', ')).join('\n'), '날짜 목록을 복사했습니다.');
  },
  exportXlsx() { exportXlsx(); },
  printSheet() { confirmSheetModal(false); },
  printSheetT() { confirmSheetModal(true); },
  backupList() { backupModal(); },
  holidayAdmin() { holidayAdminModal(); },
  adminExport() { adminExport(); },
  saveNow() { if (CONFLICT) conflictModal(0); else if (remoteDirty) flushRemote(); else toast('저장할 변경 사항이 없습니다.'); },
  sample() {
    const go = () => { const nm = S.info.school; normalize(sampleState()); if (CUR) { S._school = CUR; if (nm) S.info.school = nm; } S.exportedAt = 0; save(); render(); toast('예시 자료를 불러왔습니다. 각 단계를 눌러 내용을 확인해 보세요.'); };
    if (hasContent()) confirmBox('예시 자료 불러오기', '현재 입력한 내용이 예시 자료로 바뀝니다. 필요하면 먼저 JSON 파일로 저장하세요.', '불러오기', go); else go();
  },
  backup() { saveJson(); },
  restore() {
    const go = () => $('#fileIn').click();
    if (hasContent()) confirmBox('JSON 파일 불러오기', '현재 입력 내용이 JSON 파일의 내용으로 바뀝니다.' + (CUR ? ' (학교 계정은 그대로 유지)' : ''), '계속', go); else go();
  },
  reset() {
    confirmBox('처음부터 다시', '입력한 모든 내용을 지웁니다. 되돌릴 수 없습니다.' + (OFFLINE && isDirty() ? ' <b>아직 JSON 파일로 저장하지 않았습니다.</b>' : '') + (CUR ? ' 학교 계정(학교코드·비밀번호)은 유지됩니다.' : ''), '모두 지우기', () => {
      const name = S.info.school; S = blankState(); if (CUR) { S.info.school = name; S._school = CUR; }
      if (OFFLINE) { S.savedAt = Date.now(); S.exportedAt = S.savedAt; saveDevice(); } else save();
      render();
    });
  },
};

async function copyText(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch (e) {
    modal('복사하기', `<p>아래 내용을 전체 선택(Ctrl+A) 후 복사(Ctrl+C)하세요.</p><textarea class="in" rows="10" id="cpArea">${esc(text)}</textarea>`, '닫기', null, '');
    setTimeout(() => { const a = $('#cpArea'); a && a.select(); }, 30);
  }
}
async function saveFile(filename, data) {
  if (!downloads && !window.claude) {   // 일반 웹(Cloudflare 등): 브라우저 다운로드
    try {
      const blob = data instanceof Blob ? data : new Blob([data], { type: filename.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000); return 'saved';
    } catch (e) { return 'unavailable'; }
  }
  if (!downloads) return 'unavailable';
  try { await downloads.save({ filename, data }); return 'saved'; }
  catch (e) { return e && e.code ? e.code : 'unavailable'; }
}
function jsonName() { const d = new Date(); return `ClassCount_${S.info.school || '학교'}_${S.info.year || ''}_${d.getMonth() + 1}월${d.getDate()}일.json`; }
async function saveJson() {
  const prev = S.exportedAt; S.exportedAt = Date.now() + 1;
  const data = JSON.stringify(snapshot(), null, 1);
  const res = await saveFile(jsonName(), data);
  if (res === 'saved') { saveDevice(); updateSaveUI(); toast('JSON 파일로 저장했습니다.'); return; }
  S.exportedAt = prev;
  if (res === 'declined') return;
  if (res === 'rate_limited') { toast('잠시 후 다시 시도해 주세요.'); return; }
  modal('JSON 내용 복사', `<p>이 화면에서는 파일 저장을 쓸 수 없습니다. 아래 내용을 복사해 메모장에 붙여넣고 <b>.json</b> 파일로 저장하세요.</p><textarea class="in" rows="9" id="cpArea">${esc(data)}</textarea>`, '복사했음', () => { S.exportedAt = Date.now() + 1; saveDevice(); updateSaveUI(); }, '닫기');
  setTimeout(() => { const a = $('#cpArea'); a && a.select(); }, 30);
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function exportXlsx() {
  if (!downloads && window.claude) { toast('이 화면에서는 파일 저장을 쓸 수 없습니다. ‘표 복사’를 이용해 주세요.'); return; }
  try { if (!window.XLSX) { toast('엑셀 파일을 만드는 중…'); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); } }
  catch (e) { toast('엑셀 모듈을 불러오지 못했습니다. ‘표 복사’를 이용해 주세요.'); return; }
  const scope = scopeName(), st = computeStats(S, scope), qs = S.quarters, XL = window.XLSX, wb = XL.utils.book_new();
  const title = [`${S.info.school} ${yearLabel()} 방과후학교 수업시수 (${scope})`];
  const anyFee = st.depts.some((r) => r.rate > 0);
  const add = (name, aoa, w) => { const ws = XL.utils.aoa_to_sheet(aoa); ws['!cols'] = (w || []).map((x) => ({ wch: x })); XL.utils.book_append_sheet(wb, ws, name); };
  const gname = (r) => (groupOf(r.dept.group) || {}).name || '';
  const sumOf = (rows, from) => rows.length ? rows[0].map((_, c) => (c < from ? '' : rows.reduce((a, r) => a + (typeof r[c] === 'number' ? r[c] : 0), 0))) : [];
  // 분기별 (분류 소계 포함)
  const h1 = ['분류', '프로그램', '강사', '요일', '주당 횟수', '회당 차시', ...qs.map((q) => q.name + ' 횟수'), '횟수 합계', ...qs.map((q) => q.name + ' 시수'), '시수 합계'];
  if (anyFee) h1.push(...qs.map((q) => q.name + ' 수업료'), '수업료 합계');
  const row1 = (r) => { const x = [gname(r), r.dept.name, r.dept.teacher, dayStr(r.dept), r.dept.days.length, r.per, ...r.byQ, r.count, ...r.byQP, r.periods]; if (anyFee) x.push(...r.byQFee, r.fee); return x; };
  const aoa1 = [title, [], h1]; const allRows = [];
  S.groups.forEach((g) => {
    const rows = st.depts.filter((r) => r.dept.group === g.id).map(row1); if (!rows.length) return;
    aoa1.push(...rows); const s = sumOf(rows, 6); s[0] = g.name + ' 소계'; s[4] = ''; aoa1.push(s); allRows.push(...rows);
  });
  const tot = sumOf(allRows, 6); tot[0] = '총계'; tot[4] = ''; aoa1.push(tot);
  add('분기별', aoa1, [18, 14, 10, 10, 8, 8]);
  // 강사별
  const h2 = ['강사', '담당 프로그램', ...qs.map((q) => q.name + ' 시수'), '시수 합계']; if (anyFee) h2.push(...qs.map((q) => q.name + ' 수업료'), '수업료 합계');
  add('강사별', [title, [], h2, ...st.teachers.map((t) => { const x = [t.teacher, t.depts.join(', '), ...t.byQP, t.periods]; if (anyFee) x.push(...t.byQFee, t.fee); return x; })], [12, 30]);
  // 요일별
  const w6 = S.depts.some((d) => d.days.includes(6)) ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const aoa3 = [title, [], ['[분기별 요일별 운영 가능일]'], ['분기', '기간', ...w6.map((w) => DOW[w]), '계']];
  qs.forEach((q, i) => { const v = w6.map((w) => st.weekday[i][w]); aoa3.push([q.name, `${q.start} ~ ${q.end}`, ...v, v.reduce((a, b) => a + b, 0)]); });
  aoa3.push([], ['[프로그램별 요일별 횟수]'], ['분류', '프로그램', '강사', ...w6.map((w) => DOW[w]), '계']);
  st.depts.forEach((r) => { const v = w6.map((w) => r.byDow[w]); aoa3.push([gname(r), r.dept.name, r.dept.teacher, ...v, v.reduce((a, b) => a + b, 0)]); });
  add('요일별', aoa3, [18, 24]);
  // 월별
  const ms = st.months;
  add('월별', [title, [], ['분류', '프로그램', '강사', ...ms.map((m) => `${m.slice(0, 4)}.${Number(m.slice(5))}`), '합계'], ...st.depts.map((r) => { const v = ms.map((m) => r.byM[m] || 0); return [gname(r), r.dept.name, r.dept.teacher, ...v, v.reduce((a, b) => a + b, 0)]; })], [18, 14, 10]);
  // 수업일지 (기존 엑셀 형식)
  const sets = st.depts.map((r) => new Set(r.dates));
  const aoa5 = [title, [], ['', '', '', '', '', '', '', ...st.depts.map(gname)], ['분기', '월', '주차', '날짜', '요일', '학교 행사', '방학', ...st.depts.map((r) => r.dept.name)]];
  st.scopedDays.forEach((d) => aoa5.push([d.q >= 0 ? qs[d.q].name : '', `${d.iso.slice(0, 4)}.${Number(d.iso.slice(5, 7))}`, d.wk + '주', d.iso, DOW[d.dow], d.closure ? d.closure.name || d.closure.type : '', d.vac ? d.vac.name + (d.vac.run ? '' : '(미운영)') : '', ...st.depts.map((r, i) => (sets[i].has(d.iso) ? r.dept.name : ''))]));
  add('수업일지', aoa5, [7, 8, 6, 11, 5, 14, 10]);
  const maxW = Math.max(5, ...st.days.map((d) => d.wk)), wks = Array.from({ length: maxW }, (_, i) => i + 1);
  add('주차별', [title, [], ['분류', '프로그램', '강사', '5주차', ...wks.map((w) => w + '주차'), '계'], ...st.depts.map((r) => { const v = wks.map((w) => r.byWk[w]); return [gname(r), r.dept.name, r.dept.teacher, week5On(S, r.dept) ? '운영' : '제외', ...v, v.reduce((a, b) => a + b, 0)]; })], [18, 14, 10, 7]);
  // 휴강·보강
  add('휴강·보강', [title, [], ['분류', '프로그램', '강사', '구분', '날짜', '요일', '사유'], ...st.depts.flatMap((r) => [...(r.dept.cancels || []).map((c) => [gname(r), r.dept.name, r.dept.teacher, '휴강', c.d, DOW[dowOf(d2n(c.d))], c.note || '']), ...(r.dept.makeups || []).map((c) => [gname(r), r.dept.name, r.dept.teacher, '보강', c.d, DOW[dowOf(d2n(c.d))], c.note || ''])])], [18, 14, 10, 6, 11, 5, 30]);
  // 학사일정
  add('학사일정', [['학교', S.info.school], ['학년도', S.info.year], ['기간', `${S.cal.start} ~ ${S.cal.end}`], ['1학기 종료', S.cal.sem1End || ''], ['2학기 시작', S.cal.sem2Start], ['5주차 수업', S.cal.week5 !== false ? '운영' : '미운영'], ['주차 기준', S.cal.weekMode === 'cal' ? '달력 주(월요일 시작)' : '그 달의 n번째 요일'], [], ['학기', '방학', '시작', '종료', '방과후 운영'], ...S.cal.vacations.map((v) => [semOfItem(v) + '학기', v.name, v.start, v.end, v.run ? '운영' : '미운영']), [], ['학기', '휴업일 시작', '종료', '명칭', '구분'], ...S.cal.closures.map((c) => [semOfItem(c) + '학기', c.start, c.end, c.name, c.type]), [], ['분기', '시작', '종료'], ...qs.map((q) => [q.name, q.start, q.end])], [8, 14, 12, 16, 12]);
  const buf = XL.write(wb, { bookType: 'xlsx', type: 'array' });
  const res = await saveFile(`${S.info.school || '방과후'}_${S.info.year || ''}_수업시수_${scope}.xlsx`, new Blob([buf]));
  if (res === 'saved') toast('엑셀 파일을 저장했습니다.'); else if (res !== 'declined') toast('파일을 저장하지 못했습니다. ‘표 복사’를 이용해 주세요.');
}
function onFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const obj = JSON.parse(rd.result); if (!obj || !obj.cal || !obj.info) throw new Error();
      normalize(obj);
      if (CUR) { S._school = CUR; save(); } else { S._school = undefined; S.savedAt = Date.now(); S.exportedAt = S.savedAt; saveDevice(); }
      render(); toast('JSON 파일을 불러왔습니다.' + (CUR ? ' 서버에 저장합니다.' : ''));
    } catch (err) { toast('JSON 파일 형식이 올바르지 않습니다.'); }
  };
  rd.readAsText(f, 'utf-8'); e.target.value = '';
}

/* ---------- 예시 자료 (기존 엑셀 2026학년도 기반) ---------- */
function sampleState() {
  const W = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 };
  const ga = uid(), gb = uid();
  const list = [[ga, '사이좋은', '강사A', '월', 's'], [ga, '로봇', '강사B', '화', ''], [ga, '자원', '강사C', '수', ''], [ga, '치어리딩', '강사D', '목', ''], [ga, '연극', '강사E', '금', ''],
    [gb, '탁구', '강사F', '목', 's'], [gb, '영어1부', '강사G', '월수목금', 's'], [gb, '영어23부', '강사G', '월화수목금', 's'], [gb, '놀이영어', '강사H', '월수', 's'], [gb, '수학', '강사I', '화수목', 's'], [gb, '주산암산', '강사J', '화목', 's'], [gb, '한자', '강사K', '월수', 's'],
    [gb, '독서논술', '강사L', '화', 's'], [gb, '과학탐구', '강사M', '화금', 's'], [gb, '만화', '강사N', '화', 's'], [gb, '캘리', '강사N', '금', 's'], [gb, '음악줄넘기', '강사O', '수', 's'], [gb, '농구', '강사P', '화금', 's'],
    [gb, '방송댄스', '강사Q', '월', 's'], [gb, '요리', '강사R', '수', 's'], [gb, '바둑', '강사S', '월금', 's'], [gb, '보드게임', '강사S', '목', 's'], [gb, '컴퓨터A', '강사T', '월수', 's'], [gb, '컴퓨터B', '강사T', '화목', 's']];
  const hol = holidaysInRange('2026-03-01', '2027-02-28').filter((h) => { const w = dowOf(d2n(h.date)); return w > 0 && w < 6; });
  return {
    v: 4, step: 6, savedAt: Date.now(),
    info: { school: '예시초등학교', year: 2026, semester: '연간', manager: '늘봄지원실' },
    cal: {
      start: '2026-03-01', end: '2027-02-28', sem1End: '2026-07-23', sem2Start: '2026-08-24',
      vacations: [{ sem: 1, name: '여름방학', start: '2026-07-24', end: '2026-08-23', run: true }, { sem: 2, name: '겨울방학', start: '2027-01-08', end: '2027-02-28', run: true }],
      closures: [...hol.map((h) => ({ start: h.date, end: '', name: h.name, type: '공휴일' })), { start: '2026-07-24', end: '2026-07-30', name: '방과후 정비', type: '방과후 미운영' }].sort((a, b) => (a.start < b.start ? -1 : 1)),
    },
    quarters: [{ name: '1분기', start: '2026-03-01', end: '2026-05-31' }, { name: '2분기', start: '2026-06-01', end: '2026-08-31' }, { name: '3분기', start: '2026-09-01', end: '2026-11-30' }, { name: '4분기', start: '2026-12-01', end: '2027-02-19' }],
    groups: [{ id: ga, name: '초1·2 맞춤형 프로그램', collapsed: false }, { id: gb, name: '방과후학교', collapsed: false }],
    depts: list.map(([g, name, teacher, d, s]) => ({ group: g, name, teacher, days: [...d].map((c) => W[c]), periods: 1, rate: '', vacRun: 'inherit', start: s ? '2026-03-09' : '', end: '', except: name === '주산암산' ? '10/27' : '', extra: '', memo: '' })),
  };
}

/* ---------- 막대 위 도움말(툴팁) ---------- */
(() => {
  let tip = null;
  const show = (el, x, y) => {
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    tip.textContent = el.dataset.tip; tip.style.display = 'block';
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 12)) + 'px';
    tip.style.top = (y + 16 + r.height > window.innerHeight ? y - r.height - 10 : y + 16) + 'px';
  };
  document.addEventListener('mousemove', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else if (tip) tip.style.display = 'none'; });
  document.addEventListener('scroll', () => { if (tip) tip.style.display = 'none'; }, true);
})();

/* ---------- 시작 ---------- */
async function boot() {
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('click', onClick);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
    const v = (n) => (f.elements[n] ? f.elements[n].value : '');
    const btn = f.querySelector('button[type=submit]');
    if (f.dataset.form === 'find') { searchSchools(v('q')); return; }
    if (f.dataset.form === 'teacher') { const c = v('tcode').trim(); if (/^[A-Za-z0-9]{6}$/.test(c)) { location.hash = 't-' + c; } else toast('6자리 조회 코드를 확인하세요.'); return; }
    if (f.dataset.form === 'login') doLogin(v('code'), v('pw'), btn); else doCreate(v('name'), v('code'), v('pw'), v('pw2'), btn);
  });
  $('#fileIn').addEventListener('change', onFile);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal').classList.remove('open'); });
  const hashCode = () => { const m = location.hash.match(SHARE_HASH_RE); return m ? m[1] : null; };
  window.addEventListener('hashchange', () => { const c = hashCode(); if (c) openTeacher(c); });
  MODE = hashCode() ? 'teacher' : 'gate'; if (MODE === 'teacher') TEACHER = { code: hashCode(), payload: null }; render();
  await initCapabilities();
  if (hashCode()) { openTeacher(hashCode()); return; }
  const ses = getSession();
  if (CONN === 'ok' && ses && ses.code && BE === 'http') {
    try { const r = await api('GET', '/school', null, ses.token); await enterSchool(ses.code, r.school); return; }
    catch (e) { if (e && e.status === 401) setSession(null); }
  } else if (CONN === 'ok' && ses && ses.code) {
    try {
      const snap = await withTimeout(schoolRef(ses.code).get());
      if (snap.exists && snap.data().pwHash === ses.token) { await enterSchool(ses.code, snap.data()); return; }
      setSession(null);
    } catch (e) { /* 첫 화면으로 */ }
  }
  render();
}
boot();
