# ClassCount 개발 안내

외부 라이브러리 없이 HTML·CSS·JavaScript만으로 만든 단일 페이지 앱과, Cloudflare Pages의 `_worker.js` 서버로 이루어져 있습니다. 엑셀 내보내기만 실행 시점에 SheetJS(cdnjs)를 불러옵니다.

## 폴더 구조
```
src/
  index.template.html   화면 뼈대 (/*CSS*/, /*ENGINE*/, /*UI*/ 자리에 아래 파일이 들어감)
  style.css             스타일
  engine.js             계산 엔진(날짜·수업일·통계) — 화면과 무관, 테스트 대상
  ui.js                 화면·저장·로그인·최고관리자·강사용 조회 (APP_VERSION, CHANGELOG)
worker/
  _worker.js            Cloudflare Pages 서버 (/api/*, KV) (SERVER_VERSION)
scripts/
  build.mjs             src + worker → public/ (버전 불일치 시 실패)
public/                 배포용 결과물 — 빌드 후 함께 커밋 (index.html, _worker.js)
tests/                  node:test 테스트
docs/                   설명서와 화면 캡처
(wrangler.toml 없음)    Pages의 KV·비밀값은 대시보드에서 설정 — 파일을 두면 GitHub 빌드가 대시보드 설정을 무시함
.github/workflows/      CI(테스트), GitHub Pages 배포(선택)
```

## 자주 쓰는 명령
| 명령 | 하는 일 |
|---|---|
| `npm run build` | `public/index.html`, `public/_worker.js` 생성 |
| `npm test` | 계산 엔진 테스트 + `public/` 최신 여부 + 버전 일치 확인 |
| `npm run check` | `public/` 이 소스와 같은지만 확인 |
| `npm run dev` | 빌드 후 로컬 서버(`wrangler pages dev`, KV 포함) — `.dev.vars.example` 을 `.dev.vars` 로 복사해 두세요 |
| `npm run deploy` | 빌드 후 Cloudflare에 직접 배포(Wrangler, 프로젝트 `classcount`) |

Node 18 이상이면 되고, 설치할 패키지는 없습니다(`dev`·`deploy`만 `npx wrangler` 사용).

## 수정 순서
1. `src/` 또는 `worker/` 를 고칩니다.
2. **버전 올리기**: `src/ui.js` 의 `APP_VERSION`·`APP_DATE`, `CHANGELOG` 맨 위 한 줄, `worker/_worker.js` 의 `SERVER_VERSION`, `package.json` 의 `version` 을 같은 번호로. (`CHANGELOG.md` 는 빌드가 자동으로 만듭니다.)
   - 큰 구조 변경 → 앞자리(2.0.0), 기능 추가 → 가운데(1.11.0), 오류 수정 → 끝자리(1.10.1)
3. `npm run build` → `npm test`
4. `public/` 까지 함께 커밋합니다. (CI가 `public/` 이 소스와 다르면 실패시킵니다.)

## 저장 방식 (환경 자동 감지)
| 환경 | 판단 | 저장소 |
|---|---|---|
| claude.ai 웹앱 | `window.claude` 존재 | 웹앱 db (`schools/<코드>`, `shares/<6자리>`, `settings/app`) |
| Cloudflare Pages | `/api/health` 응답 | `_worker.js` + KV |
| 그 밖(GitHub Pages, 파일) | 둘 다 아님 | 이 기기(쿠키·localStorage) + JSON 파일 |

자료 형식(학교 한 곳의 현재 학년도)은 `ui.js` 의 `blankState()` / `normalize()` 를 보세요. 예전 형식은 `normalize()` 에서 자동 변환됩니다(`v: 3`).

## 서버 API (`worker/_worker.js`)
| 메서드·경로 | 인증 | 설명 |
|---|---|---|
| `GET /api/health` | – | 상태·서버 버전·관리자 설정 여부·새 학교 생성 허용 여부·관리자 공휴일 설정(`holidays`, `holidayOff`) |
| `GET /api/schools?q=` | – | 학교 찾기(최대 30곳) |
| `POST /api/schools` | – | 학교 생성 (`allowCreate` 가 꺼져 있으면 403) |
| `POST /api/login` | – | 학교코드 또는 학교명 + 비밀번호 → 학교 토큰 |
| `GET/PUT /api/school` | 학교 | 현재 학년도 자료 읽기/저장. PUT에 `baseUpdatedAt`을 보내면 그 사이 다른 곳에서 저장했을 때 409(`conflict`), `force`로 덮어쓰기, 바뀐 것이 없으면 KV에 쓰지 않음. 그날 처음 바뀔 때 이전 자료를 자동 백업 |
| `GET /api/school/backups` | 학교 | 자동 백업 목록(최근 10개) |
| `GET /api/school/backups/<id>` | 학교 | 백업 자료 |
| `POST /api/school/password` | 학교 | 비밀번호 변경 |
| `POST /api/school/rollover` | 학교 | 학년도 전환(현재 자료 보관 + 새 자료) |
| `GET /api/school/archive/<학년도>` | 학교 | 지난 학년도 자료 |
| `GET /api/t/<6자리>` | – | 강사용 조회(수업료·메모 제외) |
| `POST /api/admin/login` | – | `ADMIN_PASSWORD` → 관리자 토큰 |
| `GET/PUT /api/admin/settings` | 관리자 | 설정 읽기/저장 (`allowCreate`, `holidays`, `holidayOff`) |
| `GET /api/admin/export` | 관리자 | 전체 학교 백업(현재·지난 학년도, 비밀번호 제외) |
| `GET /api/admin/schools` | 관리자 | 전체 학교 목록(색인 새로 고침 포함) |
| `GET/DELETE /api/admin/schools/<코드>` | 관리자 | 학교 자료 보기/삭제 |
| `POST /api/admin/schools/<코드>/reset` | 관리자 | 임시 비밀번호로 초기화 |
| `GET /api/admin/schools/<코드>/archive/<학년도>` | 관리자 | 지난 학년도 보기 |

토큰은 HMAC-SHA256 서명(학교 30일·관리자 12시간)이며, 학교 토큰에는 비밀번호 버전이 들어 있어 비밀번호를 바꾸거나 초기화하면 기존 로그인이 무효가 됩니다.

## 공휴일 자료
`src/engine.js` 의 `KR_HOLIDAYS` 에 연도별로 있습니다(2026~2028년 우주항공청 월력요항, 2029~2030년 음력 환산 예정일). 최고관리자가 화면에서 추가·제외한 날은 `setHolidayOverrides()` 로 덮어씁니다. 새 연도가 발표되면 같은 형식으로 추가하고 `tests/engine.test.cjs` 에 확인 항목을 넣어 주세요.
