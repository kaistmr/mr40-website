# 주소록 Supabase 운영 가이드 (2026-07-14~)

> **이 문서가 주소록 운영의 최신 SSOT입니다.** 옛 `members-pipeline-guide.md`(구글시트→`members.enc`)는 폐기됐습니다.

주소록은 이제 **Supabase(Postgres) 실시간 DB**에 저장됩니다.

- **프로젝트:** `mr40-directory` (ref `upbvxipashgyowctbhby`), 리전 서울
- **테이블 2개**
  - `members` — 확정 주소록(8열: 이름·기수·소속·이메일·전화·관심사·한마디·회장). RLS로 **anon 직접 조회 전면 차단**.
  - `responses` — 동문이 `update.html`로 보낸 근황. anon은 **insert만** 가능(조회 불가).
- **열람 경로:** `members.html` → `directory` Edge Function에 접속코드 POST → 서버가 코드 검증 후 `members`+`responses`를 병합해 명단 반환. anon 키로는 테이블을 절대 못 읽음.
- **근황 수집:** `update.html` 폼 → `responses`에 직접 insert. (구글폼·Apps Script·서비스계정 전부 제거)

## 접속코드

- 동문에게 공지된 **공유 코드 1개**. DB가 아니라 Edge Function 시크릿 `MEMBERS_CODE`에 보관.
- **변경 방법:**
  ```bash
  cd 40th_website
  supabase secrets set MEMBERS_CODE='새코드'
  ```
  변경 후 동문에게 새 코드를 공지. (프런트 배포 불필요 — 코드는 서버에만 있음)
- ⚠️ 현재 코드는 7자리 숫자라 온라인 무차별 대입에 이론상 취약. 여유 될 때 **더 긴 영문+숫자**로 교체하거나 레이트리밋/Turnstile 도입 권장.

## 회원 추가·수정 (관리자)

Supabase 대시보드 → **Table editor → `members`** 에서 직접 편집.
- 8열 스키마 그대로. `president`에 값이 있으면 주소록 카드에 👑 뱃지.
- `cohort`는 두 자리 문자열(예: `08`, `95`). 한 자리로 넣어도 프런트가 정규화하지만 두 자리 권장.

## 근황(responses) 검토·반영 흐름

1. 대시보드 → Table editor → `responses`에서 새 응답 확인(최신순).
2. 병합 규칙상 `directory`가 **자동으로** members 위에 근황을 얹어 보여주므로, 급하지 않으면 그대로 둬도 됨.
   - "동의"로 시작하는 consent만 유효. `visibility`에 "비공개" 포함 시 그 사람은 주소록에서 제외.
   - 같은 이름+기수의 **최신** 응답이 최종. 원본 members의 빈 칸만 채우고, 근황의 소속/한마디/연락처로 갱신.
3. 정식 반영: 검토한 근황을 `members`에 직접 반영하고 `responses`의 처리분을 정리(삭제)하면 깔끔.

## 데이터 흐름 요약

```
동문 ──(update.html 폼)──► responses (insert만)
                                   │
관리자 편집 ──► members ◄──────────┘  (directory 함수가 members+responses 병합)
                                   │
동문 ──(members.html + 접속코드)──► directory Edge Function ──► 병합 명단(JSON)
```

## 백업

- 대시보드 → **Database → Backups** (자동 백업 확인), 또는 수동:
  ```bash
  supabase db dump -f backup-$(date +%Y%m%d).sql   # 스키마+데이터
  ```
  덤프에는 회원 PII가 들어가므로 **레포에 커밋 금지**, 안전한 곳에만 보관.

## 비밀 취급 주의

- `service_role` 키·DB 비밀번호·Access Token은 **절대 레포/프런트에 넣지 말 것**. 로컬 `.env.supabase.local`(gitignore)에만.
- `anon` 키는 공개 안전(RLS가 members를 잠금) — `config.js`에 있어도 됨.
- 노출 사고 시 대시보드에서 키 rotate / DB 비밀번호 재설정 가능.

## 비상 복구 (구 방식)

DB 장애 등 비상시 `scripts/build-members-enc.mjs`/`encrypt-members.mjs`로 `members.enc`를 다시 만들 수 있으나, 현재 라이브 경로는 아님. 되도록 Supabase 백업으로 복구.
