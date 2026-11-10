# GitHub에 올리기 (yourjune21/classcount)

받은 `classcount-github.zip` 을 이미 만들어 둔 저장소 **<https://github.com/yourjune21/classcount>** 에 올리는 방법입니다. 명령줄 없이 웹 화면만으로 할 수 있습니다.

## 웹 화면으로 올리기
1. zip을 풉니다. `classcount` 폴더가 나옵니다.
2. 점(.)으로 시작하는 숨김 폴더(`.github`)와 파일(`.gitignore`, `.dev.vars.example`)이 보이게 합니다.
   - Windows 탐색기: 보기 → 표시 → **숨긴 항목** 체크
   - Mac Finder: `Cmd + Shift + .`
3. 저장소 화면에서 **Add file → Upload files** (빈 저장소라면 ‘uploading an existing file’ 링크)
4. `classcount` 폴더 **안의 모든 파일과 폴더**를 한꺼번에 끌어다 놓습니다. (`classcount` 폴더 자체가 아니라 그 안의 내용)
5. 아래 Commit message에 `ClassCount v1.11.1` 을 적고 **Commit changes**
6. 저장소 첫 화면에 `README.md`, `src`, `public`, `docs`, `.github` 등이 보이면 성공입니다.
7. **Actions** 탭에서 ‘CI’가 초록색 ✓ 인지 확인합니다.

> 저장소를 만들 때 README·LICENSE를 이미 넣었다면, 같은 이름 파일은 올린 파일로 덮어써집니다.
> 웹 업로드는 한 번에 100개까지라 이 저장소(약 35개)는 한 번에 올라갑니다. 빠진 폴더가 있으면 같은 방법으로 다시 올리세요.

## 명령줄(git)로 올리기
```bash
cd classcount
git init -b main
git add .
git commit -m "ClassCount v1.11.1"
git remote add origin https://github.com/yourjune21/classcount.git
git push -u origin main        # 저장소에 README 등을 먼저 만들었다면: git pull --rebase origin main 후 다시 push
```

## 올린 다음 할 일
| 할 일 | 위치 |
|---|---|
| **바로 써 볼 주소 만들기**(GitHub Pages, 기기 전용) | Settings → Pages → Source: **GitHub Actions** → Actions의 ‘GitHub Pages’ 완료 후 <https://yourjune21.github.io/classcount/> |
| **다른 사람이 복사해 쓰게 하기** | Settings → General → **Template repository** 체크 → 다른 사람은 ‘Use this template’ |
| 저장소 소개 | 첫 화면 오른쪽 About ⚙ → Description: `학사일정 기반 방과후학교 수업시수 계산기`, Website: Pages 주소, Topics: `afterschool`, `education`, `cloudflare-pages` |
| **학교 계정까지 운영** | [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md) — Cloudflare Pages를 이 저장소와 연결(프로젝트 이름 `classcount` → `classcount.pages.dev`) |

## 앞으로 고칠 때
`src/` 를 고친 뒤 `npm run build` 로 `public/` 을 다시 만들고, 둘 다 함께 올리세요. 자세한 순서는 [DEVELOPMENT.md](DEVELOPMENT.md).
