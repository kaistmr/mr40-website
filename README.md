# 🤖 MR 40주년 기념 홈페이지

KAIST 마이크로 로봇 동아리 **MR**(1986~) 창립 40주년 기념 사이트입니다.
서버·데이터베이스 비용 없이 **GitHub Pages + Google Sheets + YouTube**로 운영됩니다.

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

## 🛠️ 운영 원리 (3줄 요약)

1. **주소록·방명록**: 구글폼으로 받은 응답이 구글시트에 쌓이고, 시트를 "웹에 게시(CSV)"하면 사이트가 자동으로 읽어옵니다.
2. **사진**: `scripts/build_gallery.py`가 원본 사진을 썸네일(WebP)로 변환해 사이트에 넣습니다.
3. **영상**: YouTube(한정공개)에 올리고 `data/videos.json`에 ID만 적으면 됩니다.

**즉, 코드를 몰라도 시트와 JSON 파일만 고치면 사이트가 바뀝니다.**

## ⚙️ 최초 설정 (운영자용 체크리스트)

`config.js` 파일의 빈 값들을 채우면 기능이 하나씩 켜집니다:

1. **주소록**: 구글폼 생성(이름/기수/소속/이메일/전화/관심사/한마디 순서) → 응답 시트에서 같은 열 순서의 `Web` 시트 구성 → [파일]→[공유]→[웹에 게시]→해당 시트를 CSV로 게시 → 그 URL을 `MEMBERS_CSV_URL`에, 폼 URL을 `MEMBERS_FORM_URL`에 입력
2. **접속 코드**: 코드를 정한 뒤 터미널에서 해시 생성 →
   ```bash
   echo -n "정한코드" | shasum -a 256
   ```
   결과 해시를 `MEMBERS_CODE_HASH`에 입력. 코드는 동문 공지로만 배포하세요.
   ⚠️ 클라이언트 측 보호라 완벽한 보안이 아닙니다. 민감한 정보는 시트에 넣지 마세요.
3. **방명록**: 구글폼(이름/기수/메시지) → 같은 방식으로 `GUESTBOOK_CSV_URL`, `GUESTBOOK_FORM_URL` 입력. 시트 열 순서는 타임스탬프/이름/기수/메시지.
4. **행사 신청**: 폼 URL을 `EVENT_FORM_URL`에. 장소 확정 시 `EVENT_PLACE` 수정. 프로그램은 `event.html` 상단의 `EVENT_INFO`/`PROGRAM` 상수 수정.
5. **원본급 사진(선택)**: Cloudflare R2 공개 버킷 생성 → `build_gallery.py --full-out`으로 만든 full WebP를 `full/` 경로에 업로드 → 버킷 공개 URL을 `R2_BASE_URL`에 입력. 비워두면 라이트박스가 썸네일을 사용합니다(동작에는 문제 없음).

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

### 연혁 수정
`data/timeline.json`을 직접 편집하면 됩니다. (`scripts/extract_timeline.py`는 옛 홈페이지 DB에서 초안을 다시 뽑는 용도)

## ⚠️ 문제 해결

**Q. 주소록/방명록이 안 떠요**
- 구글시트 [파일]→[공유]→[웹에 게시]가 풀렸는지 확인하세요. CSV 형식으로 게시돼 있어야 합니다.
- 링크가 바뀌었으면 `config.js`의 URL을 교체하세요.

**Q. 접속 코드를 바꾸고 싶어요**
- 위 "최초 설정 2번" 방법으로 새 해시를 만들어 `MEMBERS_CODE_HASH`만 교체하면 됩니다.

**Q. 사진이 너무 많아서 리포가 무거워져요**
- 썸네일은 장당 ~40KB라 수천 장도 수백 MB 수준입니다. GitHub 권장 한도(1GB)에 가까워지면 큐레이션을 줄이거나 R2로 이전하세요.

**Q. 행사 후에는?**
- `index.html`/`event.html`의 D-day는 자동으로 감사 문구로 바뀝니다. 사이트는 그대로 두면 영구 아카이브로 남습니다.

## 💻 개발자 정보

- **스택**: HTML + Tailwind CSS(CDN) + Vanilla JS — 빌드 과정 없음, push만 하면 배포
- **공통 코드**: `assets/common.js`(네비·CSV·토스트·해시), `assets/style.css`(테마 변수)
- **테마**: CSS 변수 기반. `[data-era="retro"]`로 타임라인 레트로 구간 전환
- **테스트**: `cd scripts && python3 -m unittest test_build_gallery -v`
- **설계 문서**: `docs/superpowers/specs/`, 구현 계획: `docs/superpowers/plans/`

---
2026 · MR 40주년 준비위원회
