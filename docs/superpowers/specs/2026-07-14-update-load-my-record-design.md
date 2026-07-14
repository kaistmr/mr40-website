# update.html 본인 기록 불러오기 (load → edit → 재제출) 설계

날짜: 2026-07-14
대상: `40th_website/update.html`, 새 Edge Function `myrecord`, `config.js`

## 배경 / 문제

- `update.html`은 현재 **빈 폼 → `responses` 테이블에 새 응답 insert** 방식이다.
- 병합 로직(`_shared/merge.ts`)은 한 사람(`이름|기수`)에 대해 **유효한(동의) 응답 중 가장 최근 것 하나만** 채택하고, 그 응답이 base `members` 행 위에 `||` 폴백으로 덮인다. **직전 응답은 통째로 폐기된다.**
- 따라서 한 필드만 고치려고 빈 폼을 다시 제출하면 직전에 적어둔 경력·근황·학력 등이 사라질 수 있다.
- anon은 `members`/`responses`를 직접 읽지 못한다(RLS 전면 차단). 개별 회원 조회 경로가 없다.

→ "본인 기록을 불러와 수정 후 재제출"이 **UX + 데이터 보존** 양면에서 필요.

## 결정 사항 (사용자 확정)

1. **본인 확인**: 주소록 접속 코드 재사용 + 기수 + 이름. (새 비밀 없음, 주소록과 동일 신뢰 모델)
2. **진입 방식**: `update.html` 상단 불러오기 박스. 주소록에서 오면 세션 코드 자동 채움. (주소록 카드 버튼은 추가하지 않음)
3. **데이터 소스**: 새 Edge Function `myrecord`(전체 편집 필드 반환). 주소록 병합 결과(8필드)로는 경력·학력·전공이 유실되어 부적합.

## 아키텍처

### 1) 새 Edge Function `supabase/functions/myrecord/index.ts`

- `POST { code, cohort, name }`
- `codeMatches(code, MEMBERS_CODE)` 상수시간 검증. 불일치 → `401 {error:"invalid_code"}`.
- service_role 클라이언트로 RLS 우회.
- `responses`에서 해당 `이름|기수`의 **동의한 최신 응답**을 고르고, 없으면 base `members` 행을 폼 필드로 매핑, 둘 다 없으면 `{found:false}`.
- 레코드 선택 로직은 순수 함수 `pickRecord(name, cohort, memberRows, responseRows)`로 분리해 단위 테스트.
- 응답: `200 { found:true, record:{ cohort,name,phone,email,note,visibility,education,major,current_org,career,role } }` 또는 `{ found:false }`.
- `_shared/cors.ts` 재사용. `codeMatches`는 tiny helper라 이 파일에 자체 포함(기존 `directory`는 무수정).
- 기존 `directory` 함수, RLS, migration은 **변경하지 않음**.

**base members → 폼 필드 매핑** (응답이 없을 때):
`name←name, cohort←cohort, phone←phone, email←email, current_org←org, note←quote, role←president`, `education/major/career`는 공란, `visibility`는 기본 "공개".

**responses 최신본 → 폼 필드**: 응답 컬럼을 그대로 매핑(note, visibility, education, major, current_org, career, role 포함).

### 2) `config.js`

- `MYRECORD_FN_URL: "https://<ref>.supabase.co/functions/v1/myrecord"` 한 줄 추가.

### 3) `update.html`

- 폼 위에 **불러오기 박스**: `접속 코드`(password) · `기수` · `이름` + `[불러오기]` 버튼.
- 로드 시 `sessionStorage.getItem("mr40_code")` 있으면 코드 필드 자동 채움(주소록 경유).
- 불러오기 성공:
  - 폼 전체 프리필(라디오 `role`/`visibility` 포함), consent 체크는 **자동 체크하지 않음**(제출 시 재동의).
  - "○○○(95학번) 기록을 불러왔습니다 — 아래에서 수정 후 보내기" 상태 표시, 헤더/버튼 문구를 '수정' 톤으로.
- `{found:false}`: "기존 기록이 없어 새로 작성합니다" 안내, 입력한 기수·이름만 채우고 나머지 공란.
- 401: 토스트("접속 코드가 올바르지 않습니다"), 존재 여부는 노출하지 않음.
- 네트워크 실패: 토스트 후 수동 입력 허용(불러오기 없이도 제출 가능 — 현행 유지).
- **제출 흐름은 변경 없음**: `responses`에 insert → `directory` 병합이 갱신 반영.

## 데이터 흐름

```
members.html(코드 보유) ──FAB──▶ update.html(코드 자동채움)
   기수·이름 입력 → [불러오기] → myrecord(service_role) → 프리필
   → 편집 → [보내기] → responses insert → directory 병합 반영
```

## 프라이버시 / 보안

- 로드는 주소록과 **동일한 공유 코드**로만 가능(새 비밀 없음).
- 추가 읽기 노출은 경력·학력·전공뿐. 전화·이메일은 이미 주소록에서 코드로 열람 가능.
- 덮어쓰기 위험은 현행 append+최신우선 모델에 이미 존재 — 본 기능이 악화시키지 않음.
- `codeMatches` 상수시간 비교, MEMBERS_CODE 미설정 시 항상 실패.

## 에러 처리 요약

| 상황 | 동작 |
|---|---|
| 코드 오류 | 401 → 토스트, 존재 여부 비노출 |
| 기록 없음 | found:false → 안내 + 공란 폴백 |
| 네트워크 실패 | 토스트 + 수동 입력 허용 |

## 테스트

- **단위(`myrecord/index_test.ts`)**: `codeMatches` + `pickRecord`
  - 응답 최신본이 base보다 우선
  - 응답 없으면 base members 폴백 매핑
  - 둘 다 없으면 found:false
  - 동의하지 않은/비공개 응답 처리(최신 유효 응답 선택 규칙)
- **수동**: 주소록 경유 로드 / 직접 로드(코드 수동) / 오류 코드 / 없는 사람 / 편집 후 재제출 시 미변경 필드 보존.

## 배포 (수동, 회장 실행)

- `supabase functions deploy myrecord`
- 새 환경변수 없음(`MEMBERS_CODE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 재사용).

## 범위 밖 (YAGNI)

- 주소록 카드별 '수정' 버튼.
- 이름/기수 변경 시 키 변경(새 인물 생성) 방지 로직.
- 진짜 UPDATE(현재 append+최신우선 모델 유지).
