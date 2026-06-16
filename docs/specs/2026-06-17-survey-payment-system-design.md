# 설문·결제 자동 대조 시스템 설계

- 작성일: 2026-06-17
- 대상: MR 40주년 홈페이지 — 참석 조사/동잠 구매 등 설문 + 참가비 결제
- 상태: 설계안 (검증 필요 항목 2개 포함 — 문서 끝 "미검증 공백" 참조)

## 1. 목표

지금은 구글폼(설문) + 외부 송금링크(결제) + 준비위 수동 대조 구조다. 두 가지를 해결한다.

1. **신청-결제 자동 대조**: "누가 냈는지"를 사람이 입금자명으로 맞추지 않고, 시스템이 자동으로 매칭한다.
2. **디자인/브랜딩 통일**: 설문 폼을 사이트 안에서 직접 렌더링한다(구글폼 iframe 제거).

부수 효과: 데이터 우리 소유, 개인정보 통제, 구글 의존 감소.

비목표(YAGNI): 자체 카드 처리·정산 시스템 구축은 하지 않는다(법·보안·운영 부담). 결제는 PG/플랫폼에 맡기고 **기록만** 내부로 모은다.

## 2. 아키텍처

정적 사이트(GitHub Pages)는 그대로 두고, **쓰기/대조용 백엔드**를 하나 얹는다. 프론트는 백엔드의 HTTP 계약만 알고, 그 뒤가 Apps Script든 AWS든 모른다.

```
[정적 사이트]               [백엔드 (HTTP API)]                  [데이터스토어]
 survey.html(커스텀 폼) --POST /submit--> 신청 저장·신청ID 발급 --> submissions 테이블/시트
        │  결제버튼(신청ID 동반)
        ▼
 [PG 결제창: PayApp]  --feedbackurl 웹훅--> POST /webhook: 신청ID로 납부=완료 기록
                                              (서명·금액·멱등 검증)
 대시보드 ← GET (인증) ← 전체 명단+납부현황
 본인 ←  GET /status?id= ← 납부상태만(PII 없음)
```

### 2.1 호스트 무관 API 계약 (이음새)

백엔드 호스팅(아래 2.2)은 **내일 전산팀장과 결정**한다. 둘 중 무엇이든 이 3개를 구현하면 프론트는 안 바뀐다.

- `POST /submit` — 신청 저장, `submission_id` 반환
- `GET /status?id=...` — **본인 납부상태만** 반환 (전화·이메일 등 PII 절대 미포함)
- `POST /webhook` — PG 결제완료 수신 → 해당 신청 `납부=완료` 기록

### 2.2 호스팅 선택 (Apps Script vs AWS)

| | Apps Script + 구글시트 | AWS (전산팀 루트) |
|---|---|---|
| DB | 구글시트 | RDS/Postgres 등 |
| 비용/운영 | 무료·무서버 | 서버 있음, 전산팀 관리 |
| 개인정보 | 구글에 저장 | 우리 인프라(접근제어 유리) |
| 멱등성 구현 | 유니크 제약 없음 → LockService로 직접 | DB **유니크 제약**으로 깔끔 |
| 동시쓰기 | LockService 필수, 시트 ~1 write/sec | 제약 없음 |
| 규모 천장 | 6분/실행·동시 30·일일 쿼터 | 사실상 없음 |

근거(공식 문서·벤치마크): Apps Script는 실행당 6분 제한, 사용자당 동시 30·스크립트당 1000, 일일 트리거 런타임 90분(일반 계정)/6시간(Workspace). 구글시트를 DB로 쓰면 안정 쓰기 약 **초당 1건**, 동시쓰기는 **LockService(getScriptLock)** 없이는 2건만 동시여도 유실 가능, 350초 타임아웃 락이면 약 60 동시까지 안정. 문서/웹앱 standalone에서는 getDocumentLock이 null이라 **getScriptLock** 사용 필수. (출처: developers.google.com/apps-script/guides/services/quotas, .../reference/lock, tanaikech 벤치마크 2021)

**판단**: 40주년 행사 신청은 수백~수천 건이 몇 주에 걸쳐 분산 → Apps Script도 LockService를 쓰면 충분히 가능. 단 **공지 직후 동시 폭주**나 **개인정보 통제**를 중시하면 AWS가 우월. 전산팀이 AWS를 관리해준다면 **AWS 권장**(특히 멱등성을 유니크 제약으로 처리할 수 있어 더 견고). 결정은 내일 회의 후.

## 3. 데이터 모델

`submissions` 테이블/시트 (호스트 무관 공통 스키마).

| 필드 | 설명 |
|---|---|
| `submission_id` | 서버 발급 고유 ID. 결제 대조 키(PayApp `var1`로 전달) |
| `survey_id` | attend / voice / contact |
| `name`, `generation` | 이름·기수 |
| `phone`, `email` | **민감정보 — 대시보드(인증)에서만 노출** |
| `answers` | 설문별 응답 JSON 한 칸 (문항 달라도 스키마 안정) |
| `party` | 인원 구분(성인/학부생/유아동 수) 또는 동잠 수량 |
| `amount` | **서버가 단가표로 재계산한** 청구금액 |
| `payment_status` | 대기 / 완료 / 취소 |
| `payment_ref` | PG 거래번호(PayApp `mul_no`) — 멱등 키 |
| `paid_at` | 결제 확인 시각 |
| `created_at`, `updated_at` | |

## 4. 폼 (사이트 내 커스텀)

1. **참석 조사**: 이름·기수·연락처 / 참석여부 / 동반자(성인·학부생·유아동 인원) / 숙박 → **결제 연결(참가비)**
2. **총회 한마디 & 동잠 구매**: 메시지 / 잠바 사이즈·수량 → **결제 연결(잠바값)**
3. **연락처 업데이트**: 주소록용 연락처·근황 → 결제 없음

신청 1건 = 결제 1건. 참가비와 동잠은 별개 신청·별개 결제(현행 3-설문 구조 유지).

## 5. 결제 흐름 (PayApp 기준)

PayApp 개발자문서 확인 결과, 우리가 필요한 웹훅 대조 패턴을 그대로 지원한다(출처: payapp.kr/dev_center).

1. 폼 제출 → `POST /submit` → 서버가 `submission_id` 발급, `payment_status=대기` 저장.
2. 화면이 "2단계 결제"로 전환 → PayApp 결제창 호출 시 **`var1=submission_id`** 동반.
3. 결제 완료 → PayApp이 **`feedbackurl`(우리 `/webhook`) 호출**. 페이로드: `pay_state`(4=완료, 8/32=취소, 9/64=환불, 10=대기), `mul_no`(거래ID), `var1`(우리 신청ID).
4. `/webhook`이 검증(6절) 통과 시 `var1`로 신청 찾아 `payment_status=완료`, `payment_ref=mul_no`, `paid_at` 기록 → 본문 `SUCCESS` 응답.
5. 대시보드 실시간 반영.

`var1` 미스매치(orphan)면 별도 `미매칭` 영역에 보관 → 준비위 수동 확인(7절).

## 6. 보안 · 신뢰성

업계 베스트 프랙티스(Svix·Stripe·Hookdeck 등)와 PayApp 문서를 반영.

- **웹훅 검증**: PayApp는 암호서명이 아니라 `userid`/`linkkey`/`linkval` **공유 시크릿 대조** 방식. 따라서 (a) `linkval` 일치 확인, (b) **금액 서버 재검증**(단가표로 재계산해 `pay_state=완료`의 금액과 대조), (c) 멱등 검증을 함께 건다. 검증 통과 전에는 어떤 상태도 기록하지 않는다.
- **멱등성**: PayApp은 `feedbackurl`을 **최대 10회 재전송**(SUCCESS 못 받으면). `mul_no`를 멱등 키로 사용.
  - AWS: `payment_ref`(=mul_no)에 **유니크 제약** → insert가 곧 check+claim, 첫 건만 성공.
  - Apps Script: 유니크 제약이 없으므로 **getScriptLock 획득 → 이미 완료면 무시 → 기록 → 락 해제**로 직렬화(check-then-write 레이스 방지).
- **금액 신뢰 금지**: 클라이언트가 보낸 금액은 무시. 서버가 `config` 단가표로 재계산한 값만 청구·기록.
- **응답 규약**: `/webhook`은 반드시 본문 `SUCCESS` 반환(리다이렉트/JS 금지 — 콜백 깨짐).
- **개인정보**: 공개 읽기(`/status`)는 PII 미포함. 대시보드만 인증 후 PII 노출. 전송은 HTTPS.
- **스팸**: 공개 폼에 honeypot + 가벼운 rate-limit.

## 7. 실패·엣지 처리

- **신청 후 미결제**: `대기` 유지 → 대시보드 미납자 목록 → 리마인더.
- **웹훅 중복**: `mul_no` 멱등으로 무시(6절).
- **orphan 결제**(var1 매칭 실패): `미매칭`에 적재 → 준비위 확인. **수동 대조의 최후 보루**(이때만 사람 개입). 리컨실 triage 3분류(자동/수동/미분류) 원칙 적용.
- **결제 취소/환불**: `pay_state` 8/9/32/64 수신 시 `payment_status=취소` 기록 + 환불 정책 표시.

## 8. 대시보드 (준비위용)

- 표: 이름·기수·참석구분·인원·금액·납부상태·결제일
- 합계: 신청 N명 / 납부완료 M명 / 수금 합계 ₩
- 검색·필터·CSV 내보내기
- 접근제어: 현행 `members.html`의 SHA-256 코드 해시 패턴 재사용. AWS로 가면 진짜 로그인으로 강화.

## 9. config 연동 (기존 추상화 재사용)

`config.js`에 이미 `PAYMENTS.provider: "direct"|"eventus"|"off"`와 설문 단가 관련 필드가 있다. 여기에 `"payapp"`를 추가하고, 미정 값은 임시값+주석으로 둔다.

- 성인 참가비: **120,000원 (미정·임시)**, 학부생 50,000, 유아동 30,000
- 동잠 단가: **(미정·임시)** — 확정 시 한 줄 수정
- **이벤터스 폴백**: 내일 PG 가입이 막히면 `provider="eventus"`로 전환 → 결제+대조는 이벤터스, 사이트는 비결제 폼만 커스텀. 구조 안 깨짐.

## 10. 미검증 공백 (재검증 필요)

세션 한도(1:30am Asia/Seoul 리셋)로 아래 2개 딥리서치가 중단됨. 한도 리셋 후 재실행 예정. 둘 다 내일 현실 확인(전산팀장·PayApp 문의)으로도 보완 가능.

1. ⚠️ **비영리 사단법인의 PG 실제 가입 가능 여부 및 필요 서류**(고유번호증 vs 사업자등록증, 비영리 심사 기준). — 자동 대조 전체가 여기 의존. PayApp 웹훅 *기술*은 확인됐으나 *가입 자격*은 미확인.
2. ⚠️ **개인정보보호법(PIPA) 의무**(수집 동의 문구, 보관기간, 파기, 안전성 확보조치) — 비영리 행사 맥락. 현재 설계는 합리적 기본값(동의 체크박스·행사 후 파기·접근제어)을 가정.

## 11. 출처

- PayApp 개발자센터(1차): https://www.payapp.kr/dev_center/dev_center01.html — feedbackurl, pay_state, mul_no, var1/var2, SUCCESS 응답·10회 재전송, 시크릿 대조.
- Apps Script 쿼터/락(1차): developers.google.com/apps-script/guides/services/quotas, .../reference/lock(-service).
- 동시쓰기 벤치마크: tanaikech.github.io/2021/09/15/benchmark-concurrent-writing-to-google-spreadsheet-using-form.
- 웹훅 멱등·검증 베스트프랙티스: svix.com, stripe(zenn 정리), hookdeck.com, pragmaticengineer(payment system).
