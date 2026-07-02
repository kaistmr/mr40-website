# 주소록 클라이언트 사이드 암호화 설계

- 작성일: 2026-07-02
- 상태: 승인됨 (구현 진행)
- 배경: 주소록 데이터가 구글시트 '웹에 게시' CSV(`MEMBERS_CSV_URL`)로 노출됨. `members.html`
  접속 코드 게이트는 클라이언트 측 화면 가림일 뿐, 게시 CSV는 코드 없이 직접 다운로드 가능.
  기존 543명(전화·이메일 포함)을 그대로 올리면 사실상 공개됨.

## 목표

서버리스(GitHub Pages) 유지하면서, 게시되는 데이터는 **암호문**만 두고 접속 코드로
브라우저에서 복호화해야 읽히도록 한다.

## 인증 모델

- **공통 접속 코드 1개** + 브라우저 복호화 (per-user 아님).
- 한계: 공격자가 암호문 확보 시 오프라인 코드 대입 가능 →
  (1) 코드는 짧은 PIN이 아니라 **긴 문구**, (2) **PBKDF2 300,000회**로 지연.
  동문 디렉터리 수준에서 수용 가능. 코드 유출 시 재암호화·재배포로 회전.

## 구성요소

### 1. 데이터 (암호문, repo 커밋)
- `data/members.enc` — 주소록 CSV(헤더 1줄 + 데이터)를 AES-256-GCM으로 암호화한 JSON blob.
- 포맷: `{ v:1, kdf:"PBKDF2-SHA256", hash:"SHA-256", iter:300000, salt:<b64>, iv:<b64>, ct:<b64> }`
  - `ct` = 암호문 뒤에 GCM 인증 태그를 붙인 것(WebCrypto 호환).
- **평문 CSV는 repo에 절대 커밋하지 않는다.** 기존 `MEMBERS_CSV_URL`·`localStorage("mr40_members")`
  평문 캐시는 제거.

### 2. 암호화 도구 `scripts/encrypt-members.mjs`
- Node 표준 라이브러리(`crypto`, `zlib`)만 사용. 외부 의존성 0.
- 입력 모드
  - `--csv <path>` : 사이트 스키마 순서 CSV(이름,기수,소속,이메일,전화번호,관심사,한마디) → 암호화.
    구글시트 편집 → CSV 내보내기 → 이 모드가 상시 갱신 경로.
  - `--legacy-xlsx <path>` : 기존 `MR 주소록.xlsx`(구 컬럼 순서)를 인메모리로 읽어 스키마 매핑 후 암호화.
    초기 1회 이관용.
- 코드는 stdin으로 입력받고 저장/로그 안 함. 평문은 메모리에만. 출력은 `data/members.enc`뿐.

### 3. `members.html` 게이트 교체
- `checkCode()`(해시 비교) → `unlock(code)`:
  PBKDF2로 키 유도 → `data/members.enc` fetch → `crypto.subtle.decrypt`(AES-GCM) → CSV 파싱 →
  기존 `renderCards` 재사용.
- 코드 오류 = GCM 복호 실패 → "접속 코드가 올바르지 않습니다".
- 세션 편의: 코드만 `sessionStorage`(탭 닫으면 소멸). 복호 데이터는 메모리만. 평문 PII는 디스크에 안 남김.
- `code-input`의 숫자 전용 제약(`inputmode/pattern`) 제거(코드가 문구가 되므로).
- `MEMBERS_CODE_HASH` 제거(복호 성공 자체가 검증).

### 4. config.js
- `MEMBERS_CSV_URL`, `MEMBERS_CODE_HASH` 제거 또는 주석 처리.
- 필요 시 `MEMBERS_ENC_PATH` 기본값 `data/members.enc`.

## 데이터 매핑 (legacy → 사이트 스키마)

| 사이트 컬럼 | 소스(구 xlsx) |
|---|---|
| 이름 | B 이름 |
| 기수(학번) | A ("86.0" → "86") |
| 소속 | D 직장 + (있으면) E 지역1 |
| 이메일 | G e-mail, 없으면 H e-mail2 |
| 전화번호 | C 전화번호 |
| 관심사 | (빈칸 — 근황 설문으로 채움) |
| 한마디 | (빈칸) |

- 지역2(F, 동네 단위)는 민감/과다 → 제외.

## 보안 핸드오프

- 도구·페이지·테스트는 개발자가 완비.
- **초기 `members.enc` 생성은 회장이 직접 1회 실행**하여 접속 코드가 개발자를 거치지 않게 한다.
- 크립토 호환성은 Node `webcrypto.subtle`로 왕복 검증(브라우저 복호 보장).

## 테스트

- 합성 데이터로 Node(암호화) → WebCrypto(복호) 왕복 일치 확인.
- xlsx 리더는 실제 파일에서 행 수·헤더만 검증(PII 미출력).
- 잘못된 코드 → 복호 실패 경로 확인.
