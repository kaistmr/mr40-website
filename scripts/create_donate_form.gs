/**
 * MR 40주년 후원 접수 폼 자동 생성 스크립트
 *
 * 사용법
 * ① script.google.com → 새 프로젝트 → 이 파일 내용을 통째로 붙여넣기
 * ② 아래 "설정 상수" 영역의 ACCOUNT_INFO 등을 실제 값으로 채우기
 * ③ 함수 목록에서 createDonateForm 선택 후 실행
 *    → 처음 실행 시 권한 승인 팝업이 뜨면 승인
 *    → 실행이 끝나면 "실행 로그"(보기 → 실행 기록/로그)에 편집 URL과 응답(게시) URL이 출력됨
 *
 * 실행 후 마무리 (config.js 연결)
 * - 출력된 편집 URL로 폼에 들어가 우측 상단 점 3개 메뉴 → "사전 채워진 링크 가져오기" 클릭
 * - "기수" 문항에 임의의 값(예: "40")을 입력하고 링크 생성
 * - 생성된 링크에서 기수 문항의 entry.숫자 부분을 복사 (예: entry.123456789)
 * - 40th_website/config.js 의 SURVEYS 배열 중 id: "donate" 항목에
 *     url: 실행 로그에 출력된 게시 URL
 *     prefill_generation_key: 위에서 복사한 "entry.숫자" 문자열
 *   을 채워 넣는다.
 */

// ── 설정 상수 (운영자가 채울 값) ─────────────────────────────
const ACCOUNT_INFO = "(계좌번호 확정 후 입력)"; // 예: "OO은행 000-000000-00-000 (사단법인 OOO)"

// ── 폼 생성 함수 ─────────────────────────────────────────────
function createDonateForm() {
  const form = FormApp.create("MR 40주년 후원");

  form.setDescription(
    "MR 40주년을 함께 축하해 주셔서 감사합니다.\n\n" +
      "아래 계좌로 이체 후 이 설문을 작성해 주시면 접수가 완료되며, 남겨 주신 주소로 사은품을 보내드립니다.\n\n" +
      "▶ 입금 계좌: " + ACCOUNT_INFO + "\n\n" +
      "후원해 주신 분들은 40주년 홈페이지 '함께하는 분들'에 성함(원하시는 경우 회사 로고)으로 모십니다. 익명 후원도 가능합니다.\n\n" +
      "수집한 정보는 40주년 행사 운영 목적에 한해 사용하며, 행사 종료 후 파기합니다."
  );

  form.setCollectEmail(false);
  form.setRequireLogin(false);
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);

  // 1. 기수 (prefill 대상)
  form.addTextItem().setTitle("기수");

  // 2. 이름(본명) (필수)
  form
    .addTextItem()
    .setTitle("이름(본명)")
    .setHelpText("입금자명과 같게 적어 주세요. 다르면 비고에 입금자명을 남겨 주세요.")
    .setRequired(true);

  // 3. 연락처(휴대폰) (필수)
  form
    .addTextItem()
    .setTitle("연락처(휴대폰)")
    .setHelpText("사은품 발송 안내를 드립니다.")
    .setRequired(true);

  // 4. 후원 금액 (필수, 숫자 유효성 검사)
  const amountValidation = FormApp.createTextValidation()
    .requireNumber()
    .build();
  form
    .addTextItem()
    .setTitle("후원 금액")
    .setHelpText("원 단위 숫자만 입력. 예: 300000")
    .setValidation(amountValidation)
    .setRequired(true);

  // 5. 이체 상태 (필수, 객관식)
  form
    .addMultipleChoiceItem()
    .setTitle("이체 상태")
    .setChoiceValues(["이체를 완료했습니다", "이체 예정입니다"])
    .setRequired(true);

  // 6. 사은품 받을 주소 (필수, 장문형)
  form
    .addParagraphTextItem()
    .setTitle("사은품 받을 주소")
    .setHelpText(
      "사은품을 보내드릴 주소를 적어 주세요. 행사장에서 직접 수령을 원하시면 '행사장 수령'이라고 적어 주세요."
    )
    .setRequired(true);

  // 7. 후원자 명단 공개 여부 (필수, 객관식)
  form
    .addMultipleChoiceItem()
    .setTitle("후원자 명단 공개 여부")
    .setChoiceValues(["이름 공개 (40주년 후원자 명단에 게재)", "익명으로 후원"])
    .setRequired(true);

  // 8. 응원 한마디 (선택, 장문형)
  form
    .addParagraphTextItem()
    .setTitle("응원 한마디")
    .setHelpText("40주년을 맞는 후배들에게 한마디 남겨 주세요.");

  // 9. 비고 (선택, 장문형)
  form
    .addParagraphTextItem()
    .setTitle("비고")
    .setHelpText("입금자명이 다른 경우, 기부금 영수증이 필요한 경우 등 특이사항을 적어 주세요.");

  // 10. 개인정보 수집·이용 동의 (필수, 체크박스)
  form
    .addCheckboxItem()
    .setTitle("개인정보 수집·이용 동의")
    .setChoiceValues(["동의합니다"])
    .setRequired(true);

  form.setConfirmationMessage(
    "후원해 주셔서 감사합니다! 입금 확인 후 사은품을 순차적으로 보내드리겠습니다."
  );

  Logger.log("편집 URL: " + form.getEditUrl());
  Logger.log("게시(응답) URL: " + form.getPublishedUrl());
}
