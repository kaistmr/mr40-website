# MR40 운영 시트 사용법

## 1. 시트 만들기

1. 구글시트 하나를 만들고 탭 이름을 `공지`, `행사정보`, `후원사`, `영상목록`, `설문링크`, `통계`로 정한다.
2. `docs/operations-sheet-templates/`의 같은 이름 CSV를 각 탭에 가져온다.
3. 각 탭에서 예시 행을 수정하거나 삭제한다. 첫 번째 헤더 행은 변경하지 않는다.
4. `[파일] → [공유] → [웹에 게시]`에서 탭별로 CSV 게시 URL을 만든다.
5. URL을 `config.js`의 `OPS_SHEETS`에 입력한다.

게시 URL이 없거나 시트를 읽지 못하면 사이트는 `config.js`와 `data/*.json` 기본값으로 동작한다. 게시 시트에는 공개해도 되는 정보만 넣는다.

## 2. 공통 입력 규칙

- `active`, `public`: `true`면 노출, `false`면 숨김. 빈 값은 노출로 처리한다.
- URL은 `https://` 주소만 사용한다.
- 여러 줄 값은 셀 안에서 줄바꿈한다.
- 날짜·시각은 `2026-06-12T09:00:00+09:00`처럼 작성한다.
- 수정 후 사이트 반영에는 브라우저 캐시 때문에 수 분이 걸릴 수 있다.

## 3. 탭별 규약

### 공지

`active,title,body,link,label,starts_at,ends_at`

- 표시 기간을 비우면 항상 노출한다.
- 현재는 기간 안에 있는 첫 번째 활성 공지만 상단에 표시한다.

### 행사정보

`key,value`

주요 키:

| key | 값 형식 |
|---|---|
| `place` | 장소명 |
| `rooms` | 방 이름을 셀 안 줄바꿈으로 구분 |
| `address` | 전체 주소 |
| `audience` | 참석 대상별 한 줄 |
| `fee` | 요금별 한 줄 |
| `program` | `시각|프로그램명|설명`, 한 행 또는 셀 안 줄바꿈 |
| `duration_hours` | 캘린더에 넣을 행사 시간 숫자 |
| `parking`, `seating`, `emergency` | 당일 안내 문구 |
| `refund_policy` | 환불 규정 |
| `attendance_count` | 숫자 |
| `card_payment`, `transfer_payment` | 결제 URL |
| `kakao_map`, `naver_map` | 지도 URL |
| `live_url`, `replay_url` | YouTube 등 영상 URL |

같은 `key`를 여러 행에 입력하면 줄바꿈으로 합쳐진다. 따라서 식순은 `program` 행을 여러 개 만들어도 된다.

### 후원사

`name,logo,url,sort,active`

- `logo`는 사이트 안 경로 또는 공개 HTTPS 이미지 주소다.
- `sort`가 작은 항목부터 표시한다.

### 영상목록

`id,title,year,desc,active`

- `id`에는 YouTube 영상 ID만 입력한다.

### 설문링크

`id,icon,title,desc,url,active,prefill_generation_key`

- `id`는 `attend`, `voice`, `contact` 중 하나다.
- `prefill_generation_key`는 구글폼의 기수 문항 파라미터 예: `entry.123456789`다.

### 통계

`group,label,value,sort,public`

- 개인 이름이나 연락처를 넣지 않는다.
- `value`는 숫자만 입력한다.

## 4. 게시 전 점검

- 시크릿 창에서 CSV URL을 열었을 때 로그인 없이 내용이 보인다.
- 헤더 철자와 순서가 템플릿과 같다.
- 준비 중인 링크는 임의 주소를 넣지 않고 빈 값으로 둔다.
- 행사 페이지와 `day.html`에서 장소·요금·식순이 같이 바뀌는지 확인한다.
