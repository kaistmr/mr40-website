/**
 * MR 40주년 후원 접수 폼 자동 생성/수정 스크립트
 *
 * 사용법 (처음 폼을 만드는 경우)
 * ① script.google.com → 새 프로젝트 → 이 파일 내용을 통째로 붙여넣기
 * ② 아래 "설정 상수" 영역의 ACCOUNT_INFO 등을 실제 값으로 채우기
 * ③ 함수 목록에서 createDonateForm 선택 후 실행
 *    → 처음 실행 시 권한 승인 팝업이 뜨면 승인
 *    → 실행이 끝나면 "실행 로그"(보기 → 실행 기록/로그)에 편집 URL과 응답(게시) URL이 출력됨
 *
 * 사용법 (이미 폼을 만든 경우 — 문항만 갱신)
 * ① 아래 "설정 상수" 영역의 FORM_EDIT_URL에 기존 폼의 편집 URL을 붙여넣기
 *    (폼 편집 화면 주소창의 URL, https://docs.google.com/forms/d/긴ID/edit 형태)
 * ② 함수 목록에서 updateDonateForm 선택 후 실행
 *    → 개인정보 동의 문항의 안내문을 최신 문구로 교체하고,
 *      이메일 문항이 없으면 연락처(휴대폰) 문항 바로 다음에 새로 추가한다
 *    → 실행 로그에 처리 결과가 출력됨
 *
 * 실행 후 마무리 (config.js 연결) — 폼을 새로 만든 경우에만 필요
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

// updateDonateForm 실행 시에만 사용. 폼 편집 화면 주소창의 URL을 그대로 붙여넣는다.
// 예: https://docs.google.com/forms/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
var FORM_EDIT_URL = "";

// 개인정보 수집·이용 동의 문구 (createDonateForm / updateDonateForm 공용)
var PRIVACY_CONSENT_TEXT =
  "MR 40주년 준비위원회(사단법인)는 후원 접수를 위해 아래와 같이 개인정보를 수집·이용합니다.\n\n" +
  "· 수집 항목: 이름, 기수, 전화번호(휴대폰), 주소, 이메일, 후원 금액\n" +
  "· 수집 목적: 후원금 입금 확인, 사은품 발송, 행사 관련 안내 연락, (공개를 선택하신 경우) 40주년 후원자 명단 게재\n" +
  "· 보유 및 이용 기간: 40주년 행사 운영 목적에 한해 이용하며, 행사 종료 후 파기합니다.\n\n" +
  "동의를 거부하실 수 있으나, 거부 시 후원 접수 및 사은품 발송이 어렵습니다.";

// 이메일 문항 제목 (createDonateForm / updateDonateForm 공용, 존재 여부 확인에도 사용)
var EMAIL_ITEM_TITLE = "이메일";
var EMAIL_ITEM_HELP_TEXT =
  "입금 확인·사은품 발송 관련 안내를 이메일로도 받으실 분만 적어 주세요.";

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

  // 3-1. 이메일 (선택)
  form
    .addTextItem()
    .setTitle(EMAIL_ITEM_TITLE)
    .setHelpText(EMAIL_ITEM_HELP_TEXT);

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
    .setHelpText(PRIVACY_CONSENT_TEXT)
    .setChoiceValues(["동의합니다"])
    .setRequired(true);

  form.setConfirmationMessage(
    "후원해 주셔서 감사합니다! 입금 확인 후 사은품을 순차적으로 보내드리겠습니다."
  );

  Logger.log("편집 URL: " + form.getEditUrl());
  Logger.log("게시(응답) URL: " + form.getPublishedUrl());
}

// ── 폼 수정 함수 (이미 만들어진 폼을 제자리에서 갱신) ──────────
function updateDonateForm() {
  if (!FORM_EDIT_URL) {
    Logger.log("FORM_EDIT_URL이 비어 있습니다. 폼 편집 URL을 채운 뒤 다시 실행하세요.");
    return;
  }

  const form = FormApp.openByUrl(FORM_EDIT_URL);
  const items = form.getItems();

  let consentUpdated = false;
  let emailAlreadyExists = false;
  let emailAdded = false;
  let contactItemIndex = -1;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.getTitle();

    if (title.indexOf("개인정보") !== -1) {
      // 체크박스 문항이므로 CHECKBOX 타입으로 캐스팅해 help text 교체
      item.asCheckboxItem().setHelpText(PRIVACY_CONSENT_TEXT);
      consentUpdated = true;
    }

    if (title === EMAIL_ITEM_TITLE) {
      emailAlreadyExists = true;
    }

    if (title.indexOf("연락처") !== -1 && title.indexOf("휴대폰") !== -1) {
      contactItemIndex = i;
    }
  }

  if (!consentUpdated) {
    Logger.log(
      "경고: 제목에 '개인정보'가 포함된 문항을 찾지 못했습니다. 동의 문구가 갱신되지 않았습니다."
    );
  }

  if (emailAlreadyExists) {
    Logger.log("이메일 문항이 이미 존재하여 건너뜁니다.");
  } else {
    const emailItem = form
      .addTextItem()
      .setTitle(EMAIL_ITEM_TITLE)
      .setHelpText(EMAIL_ITEM_HELP_TEXT);
    emailAdded = true;

    if (contactItemIndex !== -1) {
      // 방금 추가된 항목은 맨 끝에 위치하므로, 연락처(휴대폰) 바로 다음 자리로 이동
      form.moveItem(emailItem.getIndex(), contactItemIndex + 1);
    } else {
      Logger.log(
        "경고: '연락처(휴대폰)' 문항을 찾지 못해 이메일 문항을 맨 끝에 추가했습니다. 위치를 수동으로 조정하세요."
      );
    }
  }

  Logger.log("=== updateDonateForm 실행 결과 ===");
  Logger.log("개인정보 동의 문구 교체: " + (consentUpdated ? "완료" : "실패(문항 못 찾음)"));
  Logger.log(
    "이메일 문항: " + (emailAlreadyExists ? "이미 존재하여 스킵" : emailAdded ? "신규 추가" : "처리 안 됨")
  );
  Logger.log("편집 URL: " + form.getEditUrl());
  Logger.log("게시(응답) URL: " + form.getPublishedUrl());
}
