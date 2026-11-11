/**
 * ClassCount (방과후학교 수업시수 계산기) — Cloudflare Pages 서버 (_worker.js, Advanced mode)
 *
 * 필요한 설정 (Cloudflare 대시보드 > 프로젝트 > 설정)
 *   - KV 네임스페이스 바인딩: 변수 이름 SCHOOL (SCHOOLS로 넣어도 동작)
 *   - 환경 변수(암호화 권장): ADMIN_PASSWORD  … 최고관리자 비밀번호
 *   - 환경 변수(암호화 권장): TOKEN_SECRET    … 임의의 긴 문자열 (로그인 토큰 서명용)
 *
 * /api/* 요청만 처리하고, 나머지는 정적 파일(index.html)을 그대로 돌려줍니다.
 */

const SERVER_VERSION = '1.13.0';         // 화면(index.html)의 APP_VERSION과 맞춰 올림
const SCHOOL_PREFIX = 'school:';
const SHARE_PREFIX = 'share:';
const SHARE_RE = /^[A-Za-z0-9]{6}$/;
const INDEX_KEY = 'index:schools';
const ARCHIVE_PREFIX = 'archive:';       // archive:<학교코드>:<학년도> → 지난 학년도 자료(조회 전용)
const archiveKey = (code, year) => ARCHIVE_PREFIX + code + ':' + year;
const SETTINGS_KEY = 'settings:app';     // 최고관리자 설정 { allowCreate, holidays:[{date,name}], holidayOff:[date] }
async function getSettings(env) { const v = await env.SCHOOLS.get(SETTINGS_KEY, 'json'); return { allowCreate: true, holidays: [], holidayOff: [], ...(v || {}) }; }
const BACKUP_PREFIX = 'backup:';         // backup:<학교코드>:<id> → 그날 처음 고치기 전 자료 (최근 BACKUP_KEEP개)
const backupKey = (code, id) => BACKUP_PREFIX + code + ':' + id;
const BACKUP_KEEP = 10;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const kstDay = (t = Date.now()) => new Date(t + 9 * 3600000).toISOString().slice(0, 10);
const kstStamp = (t = Date.now()) => new Date(t + 9 * 3600000).toISOString().slice(0, 16).replace(/[-:T]/g, '');
const normName = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
const CODE_RE = /^[A-Za-z0-9_-]{3,20}$/;
const PBKDF2_ITER = 100000;              // Workers의 PBKDF2 최대 반복 횟수
const SCHOOL_TOKEN_DAYS = 30;
const ADMIN_TOKEN_HOURS = 12;
const MAX_BODY = 2 * 1024 * 1024;        // 2MB
const FAIL_LIMIT = 10;                   // 10회 실패 시 10분 잠금
const FAIL_TTL = 600;

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}
const err = (status, message) => json({ error: message }, status);

async function hashPassword(pw, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(saltHex), iterations: PBKDF2_ITER }, key, 256);
  return hex(bits);
}
async function hmacKey(env) {
  const secret = env.TOKEN_SECRET || ((env.ADMIN_PASSWORD || '') + '::afterschool-calc');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signToken(env, payload) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(body));
  return body + '.' + b64u(sig);
}
async function verifyToken(env, token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}
async function safeEqual(a, b) {   // 길이와 무관하게 시간 차이가 드러나지 않도록 HMAC 비교
  const k = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const [x, y] = await Promise.all([crypto.subtle.sign('HMAC', k, enc.encode(a)), crypto.subtle.sign('HMAC', k, enc.encode(b))]);
  return hex(x) === hex(y);
}

async function readBody(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw Object.assign(new Error('요청이 너무 큽니다.'), { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY) throw Object.assign(new Error('요청이 너무 큽니다.'), { status: 413 });
  try { return text ? JSON.parse(text) : {}; } catch (e) { throw Object.assign(new Error('잘못된 요청입니다.'), { status: 400 }); }
}

const getSchool = async (env, code) => env.SCHOOLS.get(SCHOOL_PREFIX + code, 'json');
function metaOf(s) {
  return {
    name: String(s.name || '').slice(0, 80), year: s.year || '', groupCount: s.groupCount || 0, deptCount: s.deptCount || 0,
    teacherCount: s.teacherCount || 0, createdAt: s.createdAt || 0, updatedAt: s.updatedAt || 0, mustChange: !!s.mustChange,
  };
}
const putSchool = (env, s) => env.SCHOOLS.put(SCHOOL_PREFIX + s.code, JSON.stringify(s), { metadata: metaOf(s) });
const publicSchool = (s) => ({ code: s.code, name: s.name, json: s.json, years: (s.archiveYears || []).slice().sort(), mustChange: !!s.mustChange, createdAt: s.createdAt, updatedAt: s.updatedAt });
function applyMeta(s, b) {
  if (typeof b.json === 'string') s.json = b.json;
  if (b.name != null) s.name = String(b.name).slice(0, 80);
  ['year', 'groupCount', 'deptCount', 'teacherCount'].forEach((k) => { if (b[k] != null) s[k] = b[k]; });
}

/* ---- 강사용 링크(6자리) 색인: share:<코드> → 학교코드 ---- */
function sharesOf(jsonText) {
  try { const st = JSON.parse(jsonText || '{}'); return [...new Set((st.depts || []).map((d) => d.share).filter((c) => SHARE_RE.test(c || '')))]; }
  catch (e) { return []; }
}
async function syncShares(env, s) {
  const now = sharesOf(s.json), prev = s.shares || [], kept = [];
  for (const c of now) {
    if (prev.includes(c)) { kept.push(c); continue; }
    const owner = await env.SCHOOLS.get(SHARE_PREFIX + c);
    if (owner && owner !== s.code) continue;             // 다른 학교가 쓰는 코드(극히 드묾)는 건너뜀
    await env.SCHOOLS.put(SHARE_PREFIX + c, s.code); kept.push(c);
  }
  for (const c of prev) if (!now.includes(c)) await env.SCHOOLS.delete(SHARE_PREFIX + c);
  s.shares = kept;
}
function teacherPayload(s, code) {
  let st; try { st = JSON.parse(s.json || '{}'); } catch (e) { return null; }
  const d = (st.depts || []).find((x) => x.share === code);
  if (!d) return null;
  const g = (st.groups || []).find((x) => x.id === d.group) || {};
  const { rate, memo, ...dept } = d;                    // 수업료·메모는 강사 화면에 보내지 않음
  return { school: s.name, info: { school: st.info?.school || s.name, year: st.info?.year, semester: st.info?.semester }, cal: st.cal || {}, quarters: st.quarters || [], group: { id: g.id, name: g.name || '' }, dept };
}

/* ---- 학교 색인 ---- */
async function listSchools(env) {
  const out = []; let cursor;
  do {
    const r = await env.SCHOOLS.list({ prefix: SCHOOL_PREFIX, cursor });
    r.keys.forEach((k) => out.push({ id: k.name.slice(SCHOOL_PREFIX.length), ...(k.metadata || {}) }));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}
async function getIndex(env) {
  const idx = await env.SCHOOLS.get(INDEX_KEY, 'json');
  if (Array.isArray(idx)) return idx;
  const rebuilt = (await listSchools(env)).map((x) => ({ code: x.id, name: x.name || '' }));
  await env.SCHOOLS.put(INDEX_KEY, JSON.stringify(rebuilt));
  return rebuilt;
}
async function indexSet(env, code, name) {
  const idx = await getIndex(env), i = idx.findIndex((x) => x.code === code);
  if (name == null) { if (i < 0) return; idx.splice(i, 1); }
  else if (i >= 0) { if (idx[i].name === name) return; idx[i].name = name; }
  else idx.push({ code, name });
  await env.SCHOOLS.put(INDEX_KEY, JSON.stringify(idx));
}

/* ---- 자동 백업: 그날 처음 저장할 때 바뀌기 전 자료를 보관 ---- */
async function addBackup(env, s, oldJson, label) {
  if (!oldJson) return;
  const now = Date.now(), list = s.backups || [];
  const id = label === 'auto' ? kstDay(now) : kstDay(now) + '-' + kstStamp(now).slice(8) + label[0];
  if (list.some((b) => b.id === id)) return;
  let deptCount = 0; try { deptCount = (JSON.parse(oldJson).depts || []).length; } catch (e) {}
  await env.SCHOOLS.put(backupKey(s.code, id), oldJson);
  list.unshift({ id, at: s.updatedAt || now, savedAt: now, label, deptCount, size: oldJson.length });
  while (list.length > BACKUP_KEEP) { const old = list.pop(); await env.SCHOOLS.delete(backupKey(s.code, old.id)); }
  s.backups = list;
}

async function failCheck(env, key) { return Number((await env.SCHOOLS.get('fail:' + key)) || 0) >= FAIL_LIMIT; }
async function failAdd(env, key) { const n = Number((await env.SCHOOLS.get('fail:' + key)) || 0) + 1; await env.SCHOOLS.put('fail:' + key, String(n), { expirationTtl: FAIL_TTL }); }
async function failClear(env, key) { if ((await env.SCHOOLS.get('fail:' + key)) != null) await env.SCHOOLS.delete('fail:' + key); }   // 기록이 있을 때만 지움 (KV 쓰기 절약)

async function auth(request, env, kind) {
  const h = request.headers.get('authorization') || '';
  const p = await verifyToken(env, h.replace(/^Bearer\s+/i, ''));
  if (!p || p.t !== kind) return null;
  return p;
}
async function schoolAuth(request, env) {
  const p = await auth(request, env, 's');
  if (!p) return null;
  const s = await getSchool(env, p.c);
  if (!s || s.pv !== p.pv) return null;      // 비밀번호가 바뀌면 기존 토큰 무효
  return s;
}
const schoolToken = (env, s) => signToken(env, { t: 's', c: s.code, pv: s.pv, exp: Date.now() + SCHOOL_TOKEN_DAYS * 86400000 });

async function handleApi(request, env, url) {
  // KV 바인딩 변수 이름은 SCHOOL 또는 SCHOOLS 어느 쪽이든 허용
  if (!env.SCHOOLS && env.SCHOOL) env = Object.create(env, { SCHOOLS: { value: env.SCHOOL } });
  if (!env.SCHOOLS) return err(500, '서버 설정이 필요합니다: KV 네임스페이스(변수 이름 SCHOOL)가 연결되지 않았습니다.');
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const m = request.method;

  if (path === '/health') { const st = await getSettings(env); return json({ ok: true, admin: !!env.ADMIN_PASSWORD, version: SERVER_VERSION, allowCreate: st.allowCreate, holidays: st.holidays, holidayOff: st.holidayOff }); }

  // ---- 강사용 조회 (로그인 없이 6자리 코드로) ----
  const tm = path.match(/^\/t\/([A-Za-z0-9]{6})$/);
  if (tm && m === 'GET') {
    const schoolCode = await env.SCHOOLS.get(SHARE_PREFIX + tm[1]);
    const s = schoolCode && (await getSchool(env, schoolCode));
    const p = s && teacherPayload(s, tm[1]);
    if (!p) return err(404, '유효하지 않거나 만료된 링크입니다. 담당 선생님께 새 링크를 요청하세요.');
    return json(p);
  }

  // ---- 등록된 학교 찾기 (학교명·코드 일부로 검색, 최대 30곳) ----
  if (path === '/schools' && m === 'GET') {
    const q = normName(url.searchParams.get('q'));
    if (!q) return json({ schools: [] });
    const hits = (await getIndex(env)).filter((x) => normName(x.name).includes(q) || x.code.toLowerCase().includes(q)).slice(0, 30);
    return json({ schools: hits });
  }

  // ---- 학교 생성 ----
  if (path === '/schools' && m === 'POST') {
    if (!(await getSettings(env)).allowCreate) return err(403, '현재 새 학교 생성이 중지되어 있습니다. 최고관리자에게 문의하세요.');
    const b = await readBody(request);
    const code = String(b.code || '').trim(), name = String(b.name || '').trim(), pw = String(b.password || '');
    if (!name) return err(400, '학교명을 입력하세요.');
    if (!CODE_RE.test(code)) return err(400, '학교코드는 영문·숫자·-·_ 3~20자로 입력하세요.');
    if (pw.length < 4) return err(400, '비밀번호는 4자 이상으로 정하세요.');
    if (await getSchool(env, code)) return err(409, '이미 등록된 학교코드입니다. 로그인하거나 최고관리자에게 비밀번호 초기화를 요청하세요.');
    const salt = randHex(16), now = Date.now();
    const s = { code, name: name.slice(0, 80), salt, hash: await hashPassword(pw, salt), pv: randHex(6), mustChange: false, json: '', createdAt: now, updatedAt: now };
    applyMeta(s, b); s.name = name.slice(0, 80);
    const dupName = (await getIndex(env)).some((x) => normName(x.name) === normName(s.name));
    await putSchool(env, s);
    await indexSet(env, s.code, s.name);
    return json({ token: await schoolToken(env, s), school: publicSchool(s), dupName });
  }

  // ---- 학교 로그인 ----
  if (path === '/login' && m === 'POST') {
    const b = await readBody(request);
    const id = String(b.id || b.code || '').trim(), pw = String(b.password || '');
    if (!id || !pw) return err(400, '학교코드(또는 학교명)와 비밀번호를 입력하세요.');
    let code = id;
    if (!CODE_RE.test(id) || !(await env.SCHOOLS.get(SCHOOL_PREFIX + id, { type: 'text', cacheTtl: 60 }))) {
      const hits = (await getIndex(env)).filter((x) => normName(x.name) === normName(id));
      if (hits.length > 1) return err(409, '같은 이름의 학교가 ' + hits.length + '곳 있습니다. 학교코드로 로그인하세요. (학교 찾기에서 확인할 수 있습니다)');
      if (hits.length === 1) code = hits[0].code;
    }
    if (await failCheck(env, 's:' + code)) return err(429, '로그인 실패가 많아 10분 동안 잠겼습니다. 잠시 후 다시 시도하세요.');
    const s = await getSchool(env, code);
    if (!s) { await failAdd(env, 's:' + code); return err(404, '등록되지 않은 학교입니다. 학교코드나 학교명을 확인하거나 ‘학교 찾기’로 검색해 보세요.'); }
    if ((await hashPassword(pw, s.salt)) !== s.hash) { await failAdd(env, 's:' + code); return err(401, '비밀번호가 맞지 않습니다.'); }
    await failClear(env, 's:' + code);
    return json({ token: await schoolToken(env, s), school: publicSchool(s) });
  }

  // ---- 로그인한 학교 ----
  if (path === '/school') {
    const s = await schoolAuth(request, env);
    if (!s) return err(401, '다시 로그인하세요.');
    if (m === 'GET') return json({ school: publicSchool(s) });
    if (m === 'PUT') {
      const b = await readBody(request);
      // 동시 수정 감지: 마지막으로 받은 버전(baseUpdatedAt) 이후 다른 곳에서 저장했으면 거절
      if (b.baseUpdatedAt != null && !b.force && s.updatedAt && Number(b.baseUpdatedAt) !== s.updatedAt) {
        return json({ error: '다른 기기에서 먼저 수정한 내용이 있습니다.', conflict: true, updatedAt: s.updatedAt }, 409);
      }
      const oldJson = s.json, oldName = s.name;
      const before = JSON.stringify(metaOf(s));
      applyMeta(s, b);
      if (s.json === oldJson && JSON.stringify(metaOf(s)) === before && !b.backupNow) return json({ ok: true, updatedAt: s.updatedAt, unchanged: true });   // 바뀐 것이 없으면 쓰지 않음
      if (b.backupNow) await addBackup(env, s, oldJson, b.backupNow === 'restore' ? 'restore' : 'manual');
      else if (s.json !== oldJson && !(s.backups || []).some((x) => x.id === kstDay())) await addBackup(env, s, oldJson, 'auto');
      s.updatedAt = Date.now();
      await syncShares(env, s);
      await putSchool(env, s);
      let dupName = false;
      if (s.name !== oldName) { dupName = (await getIndex(env)).some((x) => x.code !== s.code && normName(x.name) === normName(s.name)); await indexSet(env, s.code, s.name); }
      return json({ ok: true, updatedAt: s.updatedAt, dupName });
    }
  }
  // ---- 학년도 전환: 현재 자료를 보관하고 새 학년도 자료로 교체 ----
  if (path === '/school/rollover' && m === 'POST') {
    const s = await schoolAuth(request, env);
    if (!s) return err(401, '다시 로그인하세요.');
    const b = await readBody(request);
    const year = String(b.archiveYear || '').replace(/[^0-9]/g, '');
    if (!year || typeof b.archiveJson !== 'string' || typeof b.json !== 'string') return err(400, '잘못된 요청입니다.');
    if ((s.archiveYears || []).includes(year)) return err(409, year + '학년도는 이미 보관되어 있습니다.');
    await env.SCHOOLS.put(archiveKey(s.code, year), b.archiveJson);
    s.archiveYears = [...(s.archiveYears || []), year];
    applyMeta(s, b); s.updatedAt = Date.now();
    await syncShares(env, s);
    await putSchool(env, s);
    await indexSet(env, s.code, s.name);
    return json({ ok: true, years: s.archiveYears.slice().sort(), updatedAt: s.updatedAt });
  }
  const am = path.match(/^\/school\/archive\/(\d{4})$/);
  if (am && m === 'GET') {
    const s = await schoolAuth(request, env);
    if (!s) return err(401, '다시 로그인하세요.');
    const j = await env.SCHOOLS.get(archiveKey(s.code, am[1]));
    if (j == null) return err(404, '보관된 학년도 자료가 없습니다.');
    return json({ year: am[1], json: j });
  }

  // ---- 자동 백업 목록·내용 ----
  if (path === '/school/backups' && m === 'GET') {
    const s = await schoolAuth(request, env);
    if (!s) return err(401, '다시 로그인하세요.');
    return json({ backups: s.backups || [] });
  }
  const bm = path.match(/^\/school\/backups\/([0-9A-Za-z-]{10,24})$/);
  if (bm && m === 'GET') {
    const s = await schoolAuth(request, env);
    if (!s) return err(401, '다시 로그인하세요.');
    if (!(s.backups || []).some((x) => x.id === bm[1])) return err(404, '백업을 찾을 수 없습니다.');
    const j = await env.SCHOOLS.get(backupKey(s.code, bm[1]));
    if (j == null) return err(404, '백업을 찾을 수 없습니다.');
    return json({ id: bm[1], json: j });
  }

  if (path === '/school/password' && m === 'POST') {
    const s = await schoolAuth(request, env);
    if (!s) return err(401, '다시 로그인하세요.');
    const b = await readBody(request); const pw = String(b.password || '');
    if (pw.length < 4) return err(400, '비밀번호는 4자 이상으로 정하세요.');
    s.salt = randHex(16); s.hash = await hashPassword(pw, s.salt); s.pv = randHex(6); s.mustChange = false;
    await putSchool(env, s);
    return json({ token: await schoolToken(env, s) });
  }

  // ---- 최고관리자 ----
  if (path === '/admin/login' && m === 'POST') {
    if (!env.ADMIN_PASSWORD) return err(503, '최고관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았습니다.');
    if (await failCheck(env, 'admin')) return err(429, '로그인 실패가 많아 10분 동안 잠겼습니다.');
    const b = await readBody(request);
    if (!(await safeEqual(String(b.password || ''), env.ADMIN_PASSWORD))) { await failAdd(env, 'admin'); return err(401, '최고관리자 비밀번호가 맞지 않습니다.'); }
    await failClear(env, 'admin');
    return json({ token: await signToken(env, { t: 'a', exp: Date.now() + ADMIN_TOKEN_HOURS * 3600000 }) });
  }
  if (path.startsWith('/admin/')) {
    if (!(await auth(request, env, 'a'))) return err(401, '최고관리자로 다시 로그인하세요.');
    if (path === '/admin/settings' && m === 'GET') return json(await getSettings(env));
    if (path === '/admin/settings' && m === 'PUT') {
      const b = await readBody(request), st = await getSettings(env);
      if (typeof b.allowCreate === 'boolean') st.allowCreate = b.allowCreate;
      if (Array.isArray(b.holidays)) st.holidays = b.holidays.filter((h) => h && DATE_RE.test(h.date)).slice(0, 300).map((h) => ({ date: h.date, name: String(h.name || '공휴일').slice(0, 40) })).sort((x, y) => (x.date < y.date ? -1 : 1));
      if (Array.isArray(b.holidayOff)) st.holidayOff = b.holidayOff.filter((d) => DATE_RE.test(d)).slice(0, 300).sort();
      await env.SCHOOLS.put(SETTINGS_KEY, JSON.stringify(st));
      return json(st);
    }
    if (path === '/admin/schools' && m === 'GET') {
      const out = await listSchools(env);
      const fresh = JSON.stringify(out.map((x) => ({ code: x.id, name: x.name || '' })));
      if ((await env.SCHOOLS.get(INDEX_KEY)) !== fresh) await env.SCHOOLS.put(INDEX_KEY, fresh);   // 색인이 달라졌을 때만 새로 고침
      return json({ schools: out });
    }
    // ---- 전체 학교 백업 (비밀번호 정보 제외) ----
    if (path === '/admin/export' && m === 'GET') {
      const list = await listSchools(env), schools = [];
      for (const x of list) {
        const s = await getSchool(env, x.id); if (!s) continue;
        const archives = {};
        for (const y of s.archiveYears || []) { const j = await env.SCHOOLS.get(archiveKey(s.code, y)); if (j != null) archives[y] = j; }
        schools.push({ code: s.code, name: s.name, json: s.json, archives, createdAt: s.createdAt, updatedAt: s.updatedAt });
      }
      return json({ app: 'ClassCount', version: SERVER_VERSION, exportedAt: new Date().toISOString(), settings: await getSettings(env), schools });
    }
    const aa = path.match(/^\/admin\/schools\/([A-Za-z0-9_-]{3,20})\/archive\/(\d{4})$/);
    if (aa && m === 'GET') {
      const j = await env.SCHOOLS.get(archiveKey(aa[1], aa[2]));
      if (j == null) return err(404, '보관된 학년도 자료가 없습니다.');
      return json({ year: aa[2], json: j });
    }
    const mm = path.match(/^\/admin\/schools\/([A-Za-z0-9_-]{3,20})(\/reset)?$/);
    if (mm) {
      const s = await getSchool(env, mm[1]);
      if (!s) return err(404, '학교를 찾을 수 없습니다.');
      if (!mm[2] && m === 'GET') return json({ school: publicSchool(s) });
      if (!mm[2] && m === 'DELETE') {
        for (const c of s.shares || []) await env.SCHOOLS.delete(SHARE_PREFIX + c);
        for (const y of s.archiveYears || []) await env.SCHOOLS.delete(archiveKey(s.code, y));
        for (const bk of s.backups || []) await env.SCHOOLS.delete(backupKey(s.code, bk.id));
        await env.SCHOOLS.delete(SCHOOL_PREFIX + s.code); await indexSet(env, s.code, null); return json({ ok: true });
      }
      if (mm[2] && m === 'POST') {
        const b = await readBody(request); const pw = String(b.password || '');
        if (pw.length < 4) return err(400, '임시 비밀번호는 4자 이상이어야 합니다.');
        s.salt = randHex(16); s.hash = await hashPassword(pw, s.salt); s.pv = randHex(6); s.mustChange = true; s.resetAt = Date.now();
        await putSchool(env, s);
        return json({ ok: true });
      }
    }
  }
  return err(404, '알 수 없는 요청입니다.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url); }
      catch (e) { return err(e.status || 500, e.status ? e.message : '서버 오류가 발생했습니다.'); }
    }
    return env.ASSETS.fetch(request);
  },
};
