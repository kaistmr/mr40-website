# 🤖 MR 40주년 기념 홈페이지

KAIST 동아리 **MR**(Microrobot Research, 1986~) 창립 40주년 기념 사이트입니다.
서버·데이터베이스 비용 없이 **GitHub Pages + Google Sheets + YouTube**로 운영됩니다.

- **저장소**: <https://github.com/kaistmr/mr40-website>
- **라이브 사이트**: <https://kaistmr.github.io/mr40-website/>

## 🚀 구성

| 페이지 | 내용 | 데이터 출처 |
|---|---|---|
| `index.html` | 메인 (D-day 카운터) | `config.js` |
| `timeline.html` | 40년 연혁 (레트로 연출) | `data/timeline.json` |
| `members.html` | 동문 주소록 (접속 코드 보호) | 구글시트 CSV |
| `gallery.html` | 사진·영상 아카이브 | `data/gallery.json`, `data/videos.json` |
| `magazine.html` | 회지 PDF 아카이브 | `data/magazines.json`, `pdfs/` |
| `guestbook.html` | 축하 방명록 | 구글시트 CSV |
| `event.html` | 행사 안내·참가 신청 | `config.js` + 페이지 상단 상수 |
| `survey.html` | 구글폼 임베드·대체 접수 | 운영 시트 또는 `config.js` |
| `stats.html` | 공개 집계 통계 | 운영 시트 + 로컬 JSON 자동 집계 |
| `day.html` | 행사 당일 안내 | 운영 시트 |

## 🛠️ 운영 원리 (3줄 요약)

1. **주소록**: 비공개 구글 시트(주소록 원본 + 연락처 설문 응답)를 GitHub Actions가 매일 새벽 자동으로 읽어 병합·암호화한 `data/members.enc`를 커밋합니다. **방명록**은 구글폼 응답이 쌓인 시트를 "웹에 게시(CSV)"하면 사이트가 자동으로 읽어옵니다.
2. **사진**: `scripts/build_gallery.py`가 원본 사진을 썸네일(WebP)로 변환해 사이트에 넣습니다.
3. **영상**: YouTube(한정공개)에 올리고 `data/videos.json`에 ID만 적으면 됩니다.

**즉, 코드를 몰라도 시트와 JSON 파일만 고치면 사이트가 바뀝니다.**

## ⚙️ 최초 설정 (운영자용 체크리스트)

`config.js` 파일의 빈 값들을 채우면 기능이 하나씩 켜집니다:

1. **주소록**: 접속 코드로 보호되는 페이지(`members.html`)는 CSV를 직접 읽지 않고, 접속 코드로 복호화하는 암호문 `data/members.enc`(`config.js`의 `MEMBERS_ENC_PATH`)를 읽습니다. 이 파일은 두 가지 방법으로 만들 수 있습니다.
   - **자동(권장)**: GitHub Actions `update-members` 워크플로가 비공개 구글 시트 2개(주소록 원본 + 연락처 설문 응답)를 매일 읽어 병합·암호화·커밋합니다. 최초 설정 절차는 [`docs/members-pipeline-guide.md`](docs/members-pipeline-guide.md)를 참고하세요.
   - **수동**: CSV나 구 엑셀 주소록을 직접 암호화하려면 `node scripts/encrypt-members.mjs --csv <경로>`(또는 `--legacy-xlsx <경로>`)를 실행하고 접속 코드를 입력하면 `data/members.enc`가 생성됩니다.
   - 연락처 업데이트 폼 링크는 `MEMBERS_FORM_URL`(비워두면 `SURVEYS`의 `contact` 설문 URL을 대신 사용)에 입력합니다.
   - 접속 코드 자체는 동문 공지로만 배포하고, 자동 파이프라인을 쓴다면 GitHub Secrets의 `MEMBERS_CODE`도 같은 값으로 맞춰 두세요(둘이 다르면 사이트에서 복호화가 실패합니다).
   - ⚠️ 접속 코드는 클라이언트 측 검증(복호화 성공 여부)이라 완벽한 보안이 아닙니다. 극도로 민감한 정보는 시트에 넣지 마세요.
2. **방명록**: 구글폼(이름/기수/메시지) → 응답 시트를 [파일]→[공유]→[웹에 게시]로 CSV 게시 → 그 URL을 `GUESTBOOK_CSV_URL`에, 폼 URL을 `GUESTBOOK_FORM_URL`에 입력. 시트 열 순서는 타임스탬프/이름/기수/메시지.
3. **40주년 설문 3종**: `config.js`의 `SURVEYS` 배열에서 각 설문(참석 조사 / 동잠 주문 / 연락처 업데이트)의 `url`에 구글폼 주소를 넣으세요. 첫 화면 팝업과 우하단 "참여하기" 버튼에 자동 표시됩니다. 시기상 내릴 설문은 `active: false`로 바꾸면 됩니다.
4. **행사 신청(구버전 키)**: 폼 URL을 `EVENT_FORM_URL`에. 장소 확정 시 `EVENT_PLACE` 수정. 프로그램은 `event.html` 상단의 `EVENT_INFO`/`PROGRAM` 상수 수정.
5. **원본급 사진(선택)**: Cloudflare R2 공개 버킷 생성 → `build_gallery.py --full-out`으로 만든 full WebP를 `full/` 경로에 업로드 → 버킷 공개 URL을 `R2_BASE_URL`에 입력. 비워두면 라이트박스가 썸네일을 사용합니다(동작에는 문제 없음).

## 🔄 주소록 자동 갱신 파이프라인

`.github/workflows/update-members.yml`이 매일 03:00 KST(cron `0 18 * * *`, UTC 기준)와 수동 실행(`workflow_dispatch`)으로 `scripts/build-members-enc.mjs`를 돌립니다. 구글 서비스 계정(Sheets API, `spreadsheets.readonly` 스코프)으로 비공개 시트 2개를 읽어 병합 규칙(동의한 최신 응답만 반영, 비공개 선택자는 제외 등)을 적용하고, 기존 `data/members.enc`를 접속 코드로 복호화해 내용이 실제로 바뀐 경우에만 새로 암호화해 커밋합니다. 회원 데이터는 어떤 단계에서도 로그에 출력되지 않습니다(개수만 출력). 서비스 계정 발급, GitHub Secrets/Variables 등록, 문제 해결은 [`docs/members-pipeline-guide.md`](docs/members-pipeline-guide.md)에 단계별로 정리되어 있습니다.

## 운영 시트 연결

`config.js`의 `OPS_SHEETS`에 각 탭을 웹에 게시한 CSV URL을 입력합니다. URL이 비어 있거나 로드에 실패하면 기존 설정과 `data/*.json`이 사용됩니다.

운영진용 전체 절차와 복사 가능한 CSV는 [`docs/operations-sheet-guide.md`](docs/operations-sheet-guide.md)와 `docs/operations-sheet-templates/`에 있습니다.

| 탭 | 열 |
|---|---|
| 공지 | `active,title,body,link,label,starts_at,ends_at` |
| 행사정보 | `key,value` |
| 후원사 | `name,logo,url,sort,active` |
| 영상목록 | `id,title,year,desc,active` |
| 설문링크 | `id,icon,title,desc,url,active,prefill_generation_key` |
| 통계 | `group,label,value,sort,public` |

행사정보의 주요 키는 `place`, `rooms`, `address`, `audience`, `fee`, `refund_policy`, `attendance_count`, `card_payment`, `transfer_payment`, `kakao_map`, `naver_map`, `live_url`, `replay_url`, `program`, `duration_hours`, `parking`, `seating`, `emergency`입니다. 값이 없으면 화면에는 비활성화된 준비 중 상태가 표시됩니다.

## 📅 콘텐츠 추가 방법

### 사진 추가
```bash
# 1. scripts/curation.txt에 원본 경로 추가 (MR_ws 기준 상대경로, 한 줄에 하나)
# 2. 실행
cd scripts && python3 build_gallery.py curation.txt
# (R2 사용 시: python3 build_gallery.py curation.txt --full-out ../full_out)
# 3. thumbs/ 와 data/gallery.json 커밋·푸시
```
연도는 경로의 폴더명(예: `2005 MR`)에서 자동 인식됩니다. 원본 파일은 절대 수정되지 않습니다.

### 영상 추가
YouTube에 업로드(한정공개 권장) 후 `data/videos.json`에 추가:
```json
{ "id": "유튜브영상ID", "title": "97 MIROSOT 후생가외", "year": 1997, "desc": "설명 한 줄" }
```

### 회지 추가
PDF를 `pdfs/`에 넣고, 표지 추출(`sips -s format jpeg -Z 480 pdfs/파일.pdf --out covers/파일.jpg`) 후 `data/magazines.json`에 항목 추가.

### 옛 홈페이지 아카이브 재생성
```bash
cd scripts
python3 build_archive.py          # 원본 덤프 → archive/ 복사·압축
python3 fix_archive_links.py      # 한글 링크 UTF-8 재인코딩
python3 patch_archive_compat.py   # 모던 브라우저 호환 패치
```
순서를 지켜야 합니다 (build가 나머지 둘의 결과를 덮어씀).

### 연혁 수정
`data/timeline.json`을 직접 편집하면 됩니다. (`scripts/extract_timeline.py`는 옛 홈페이지 DB에서 초안을 다시 뽑는 용도)

## ⚠️ 문제 해결

**Q. 방명록이 안 떠요**
- 구글시트 [파일]→[공유]→[웹에 게시]가 풀렸는지 확인하세요. CSV 형식으로 게시돼 있어야 합니다.
- 링크가 바뀌었으면 `config.js`의 `GUESTBOOK_CSV_URL`을 교체하세요.

**Q. 주소록이 안 떠요 / 접속 코드가 안 맞아요**
- `data/members.enc` 파일이 존재하고 최근에 갱신됐는지 확인하세요. GitHub Actions **update-members** 워크플로 실행 로그에서 `changed`/`no-change`가 정상 출력되는지 봅니다.
- 코드가 틀렸다는 토스트가 뜨면, 실제로 코드가 다르거나(동문 공지 코드와 `MEMBERS_CODE` 시크릿 불일치) `data/members.enc`가 다른 코드로 암호화된 상태입니다.

**Q. 접속 코드를 바꾸고 싶어요**
- 자동 파이프라인을 쓴다면 GitHub Secrets의 `MEMBERS_CODE`를 새 코드로 교체한 뒤 **Actions → update-members → Run workflow**로 수동 실행하세요. 시트 내용이 그대로여도 코드가 바뀌면 기존 파일을 복호화하지 못해 자동으로 새 코드로 재암호화·커밋됩니다.
- 수동으로 관리한다면 `node scripts/encrypt-members.mjs --csv <경로>`를 새 코드로 다시 실행해 `data/members.enc`를 갱신하세요.
- 어느 방법이든 동문에게 공지하는 코드와 반드시 동일해야 합니다.

**Q. 사진이 너무 많아서 리포가 무거워져요**
- 썸네일은 장당 ~40KB라 수천 장도 수백 MB 수준입니다. GitHub 권장 한도(1GB)에 가까워지면 큐레이션을 줄이거나 R2로 이전하세요.

**Q. 행사 후에는?**
- `index.html`/`event.html`의 D-day는 자동으로 감사 문구로 바뀝니다. 사이트는 그대로 두면 영구 아카이브로 남습니다.

## 💻 개발자 정보

- **스택**: HTML + Tailwind CSS(CDN) + Vanilla JS — 빌드 과정 없음, push만 하면 배포
- **배포**: `kaistmr/mr40-website` 의 `main` 브랜치 루트 → GitHub Pages 자동 빌드 (https://kaistmr.github.io/mr40-website/)
- **공통 코드**: `assets/common.js`(네비·CSV·토스트·해시), `assets/style.css`(테마 변수)
- **테마**: CSS 변수 기반. `[data-era="retro"]`로 타임라인 레트로 구간 전환
- **테스트**: `cd scripts && python3 -m unittest test_build_gallery test_site_static -v && node test_ops.js`
- **설계 문서**: `docs/superpowers/specs/`, 구현 계획: `docs/superpowers/plans/`

---
2026 · MR 40주년 준비위원회
