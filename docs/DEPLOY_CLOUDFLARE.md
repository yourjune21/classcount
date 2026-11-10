# Cloudflare Pages 배포 안내 (GitHub 연동)

학교 계정·최고관리자·강사용 링크까지 모두 쓰려면 Cloudflare Pages에 배포합니다. GitHub 저장소와 연결해 두면 **GitHub에 수정 사항을 올릴 때마다 자동으로 다시 배포**됩니다.

> 준비물: GitHub 계정, Cloudflare 계정(무료), 이 저장소(<https://github.com/yourjune21/classcount>) 또는 내 계정으로 가져온 복사본(Fork·‘Use this template’)

---

## 1. KV 저장소 만들기
1. Cloudflare 대시보드 → **Storage & Databases → KV** (Workers KV)
2. **Create** → 이름 예: `classcount-schools` → 만들기

학교 자료, 지난 학년도, 강사용 링크 색인, 설정이 모두 여기에 저장됩니다.

## 2. Pages 프로젝트를 GitHub과 연결
1. **Workers & Pages → Create application**
2. 화면 아래쪽 **“Looking to deploy Pages? Get started”** 를 누릅니다.
   - ⚠ 그냥 ‘Create’로 진행하면 **Worker** 프로젝트가 만들어집니다. Worker(정적 자산만)에는 KV를 연결할 수 없다는 오류가 나니 반드시 **Pages**로 만드세요.
3. **Import an existing Git repository** → GitHub 연결(처음이면 권한 승인) → `classcount` 저장소 선택
   - 프로젝트 이름을 `classcount` 로 하면 주소가 `https://classcount.pages.dev` 가 됩니다
4. 빌드 설정
   | 항목 | 값 |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `public` |
   | Production branch | `main` |
5. **Save and Deploy**

주소는 `https://<프로젝트이름>.pages.dev` 가 됩니다. `workers.dev` 로 끝나면 Worker로 잘못 만든 것입니다.

## 3. KV와 비밀값 연결
프로젝트 → **Settings**
1. **Bindings → Add → KV namespace**
   - Variable name: **`SCHOOL`** (`SCHOOLS`로 넣어도 동작)
   - KV namespace: 1단계에서 만든 것
2. **Variables and Secrets → Add** (Type: **Secret**)
   | 이름 | 값 |
   |---|---|
   | `ADMIN_PASSWORD` | 최고관리자 비밀번호(길고 추측하기 어렵게) |
   | `TOKEN_SECRET` | 아무 긴 무작위 문자열(40자 이상 권장). 바꾸면 모든 사용자가 다시 로그인해야 함 |
3. Production 환경에 넣었는지 확인합니다.

## 4. 다시 배포 (중요)
설정은 **새 배포부터** 적용됩니다. **Deployments → 최신 배포의 ⋯ → Retry deployment** 를 누르거나, GitHub에 아무 커밋이나 올리세요.

## 5. 확인
- `https://<프로젝트이름>.pages.dev/api/health` →
  `{"ok":true,"admin":true,"version":"1.11.2","allowCreate":true}` 가 보이면 정상
- 화면 맨 아래 `서버 v1.11.2` 이 화면 버전과 같아야 합니다. 다르면 ⚠ 표시가 붙습니다.
- 첫 화면 아래 **‘최고관리자 로그인’** → `ADMIN_PASSWORD` 로 들어가 학교 목록을 확인합니다.

---

## 업데이트 받기
- **내 저장소가 Fork라면**: GitHub 저장소 화면의 **Sync fork → Update branch** 를 누르면 원본의 새 버전이 들어오고, Cloudflare가 자동으로 다시 배포합니다.
- **직접 고쳤다면**: `npm run build` 후 `public/` 까지 함께 커밋해 올리면 됩니다(Cloudflare도 빌드 명령으로 다시 만듭니다).
- 학교 자료는 KV에 있으므로 배포를 다시 해도 그대로 남습니다.

## 다른 방법: 명령줄(Wrangler)로 배포
> 저장소에는 `wrangler.toml` 을 두지 않습니다. 이 파일이 있으면 Cloudflare가 GitHub 빌드 때 대시보드 설정 대신 파일을 읽어서, KV 연결을 대시보드에서 바꿀 수 없게 됩니다.

```bash
npm install -g wrangler
wrangler login
wrangler pages project create classcount          # 처음 한 번
npm run deploy                                     # = npm run build && wrangler pages deploy ./public --project-name classcount
```
KV 연결(변수 이름 `SCHOOL`)과 `ADMIN_PASSWORD`·`TOKEN_SECRET` 은 대시보드 Settings에서 넣고, 한 번 더 `npm run deploy` 하세요.

## 다른 방법: 대시보드에 파일 끌어다 놓기
`public/` 폴더의 `index.html` 과 `_worker.js` 를 zip으로 묶어 **Pages → Upload assets(Drag and drop)** 로 올려도 됩니다. 이후 KV·비밀값 연결과 재배포 순서는 같습니다. 이 방식은 GitHub 자동 배포가 되지 않습니다.

---

## 무료 요금제 한도와 비용
| 항목 | 무료 한도(하루) | 이 앱의 사용 |
|---|---|---|
| KV 쓰기 | 1,000회 | 입력을 멈추고 약 4초 뒤 1회 저장 |
| KV 읽기 | 100,000회 | 로그인·강사용 조회 시 |
| KV 목록 | 1,000회 | 최고관리자 학교 목록을 열 때 |

여러 학교가 같은 날 오래 입력하면 쓰기 한도에 닿을 수 있습니다. 그때는 Workers 유료 요금제(월 5달러)를 고려하세요.

## 서버에 저장되는 것
| KV 키 | 내용 |
|---|---|
| `school:<학교코드>` | 현재 학년도 자료 + 목록용 요약(메타데이터), 비밀번호 해시 |
| `archive:<학교코드>:<학년도>` | 지난 학년도 자료(조회 전용) |
| `index:schools` | 학교 찾기·학교명 로그인용 색인 |
| `share:<6자리>` | 강사용 링크 → 학교코드 |
| `settings:app` | 최고관리자 설정(새 학교 생성 허용 여부) |
| `fail:*` | 로그인 실패 횟수(10분 뒤 자동 삭제) |

## 문제 해결
| 증상 | 원인·해결 |
|---|---|
| “정적 자산만 있는 Worker에는 바인딩을 추가할 수 없습니다” | Worker로 만들어졌습니다. 2단계처럼 **Pages**로 새로 만드세요 |
| “Invalid KV namespace ID (…). Not a valid hex string” | 저장소에 `wrangler.toml` 이 있습니다. 파일을 지우고(커밋) 다시 배포하세요. v1.11.2부터는 들어 있지 않습니다 |
| 첫 화면에 “서버(/api)가 없습니다” | KV 연결 후 재배포를 안 했거나, 변수 이름이 `SCHOOL`(또는 `SCHOOLS`)이 아닙니다 |
| 하단에 `서버 v… ⚠` | 화면과 서버 버전이 다릅니다. 최신 커밋으로 다시 배포하세요 |
| 최고관리자 로그인이 안 됨 | `ADMIN_PASSWORD` 를 넣고 재배포했는지 확인하세요 |
| 새 학교 만들기가 흐리게 보임 | 최고관리자가 ‘새 학교 생성’을 꺼 두었습니다 |
