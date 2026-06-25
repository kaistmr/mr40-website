/**
 * MR 40주년 설문 2종 자동 생성 — Google Apps Script
 *
 * 사용법(운영자):
 *  1) https://script.google.com 접속 → "새 프로젝트"
 *  2) 코드 영역에 이 파일 내용을 통째로 붙여넣기
 *  3) 함수 선택 드롭다운에서 createMR40Forms 선택 → "실행"
 *  4) 처음 실행 시 권한 승인(본인 구글 계정) 요청 → 허용
 *  5) 하단 "실행 로그"에 두 폼의 응답 URL·수정 URL과
 *     기수 prefill 키(entry.숫자)가 출력됨 → 그 값을 안윤수에게 전달
 *
 * 만들어지는 폼:
 *  ① MR 40주년 · 동잠(단체복) 주문   (구매 안 함 선택 시 이후 문항 건너뜀)
 *  ② MR 40주년 · 동문 근황·연락처 업데이트
 */
function createMR40Forms() {
  var log = [];

  // ─────────────────────────────────────────────
  // 폼 ① 동잠(단체복) 주문
  // ─────────────────────────────────────────────
  var jacket = FormApp.create('MR 40주년 · 동잠(단체복) 주문');
  jacket.setDescription('수집한 정보는 40주년 행사 운영 목적에 한해 사용하며, 행사 종료 후 파기합니다.');
  jacket.setCollectEmail(false);

  // 1. 구매 여부 (필수) — 분기 기준
  var buy = jacket.addMultipleChoiceItem().setTitle('단체복 구매 여부').setRequired(true);

  // 2~10번 문항이 들어갈 2페이지(주문 정보)
  var orderPage = jacket.addPageBreakItem().setTitle('주문 정보');

  var jacketGen = jacket.addTextItem().setTitle('기수'); // prefill 대상
  jacket.addTextItem().setTitle('이름(본명)');
  jacket.addParagraphTextItem().setTitle('성함(한자)')
    .setHelpText('오른쪽 손목 부근에 새겨질 예정입니다. 한자 표기를 적어주세요. 구매하시는 분은 꼭 답변 부탁드립니다.');
  jacket.addTextItem().setTitle('성함(영문)')
    .setHelpText('왼쪽 손목 부근에 새겨질 예정입니다. 예: Y.S. An. 구매하시는 분은 꼭 답변 부탁드립니다.');
  jacket.addMultipleChoiceItem().setTitle('사이즈').setRequired(true)
    .setChoiceValues(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']);
  jacket.addTextItem().setTitle('수량').setRequired(true);
  jacket.addMultipleChoiceItem().setTitle('수령 방법').setRequired(true)
    .setChoiceValues(['행사장 수령', '택배(주소 별도 안내)']);
  jacket.addTextItem().setTitle('연락처');
  jacket.addParagraphTextItem().setTitle('비고');

  // 결제 안내(마지막 안내문)
  jacket.addSectionHeaderItem().setTitle('결제 안내')
    .setHelpText('입금은 주문 수합 후 총액이 확정되면 별도로 안내드립니다.');

  // 분기 설정: 구매하면 주문 정보 페이지로, 안 하면 제출
  buy.setChoices([
    buy.createChoice('구매합니다.', orderPage),
    buy.createChoice('구매하지 않습니다.', FormApp.PageNavigationType.SUBMIT)
  ]);

  // ─────────────────────────────────────────────
  // 폼 ② 동문 근황·연락처 업데이트
  // ─────────────────────────────────────────────
  var contact = FormApp.create('MR 40주년 · 동문 근황·연락처 업데이트');
  contact.setDescription('수집한 정보는 40주년 행사 운영·주소록·기념 자료 목적에 한해 사용하며, 행사 종료 후 파기합니다. '
    + '연락처는 선택한 공개 범위에 따라 동문 주소록에만 반영됩니다.');
  contact.setCollectEmail(false);

  // 섹션 A — 연락처 (주소록용)
  var contactGen = contact.addTextItem().setTitle('기수'); // prefill 대상
  contact.addTextItem().setTitle('이름');
  contact.addTextItem().setTitle('휴대폰');
  contact.addTextItem().setTitle('이메일');
  contact.addParagraphTextItem().setTitle('주소·근황 한마디');
  contact.addMultipleChoiceItem().setTitle('주소록 공개 범위').setRequired(true)
    .setChoiceValues(['동문에게만 공개', '비공개']);
  contact.addCheckboxItem().setTitle('개인정보 수집·이용 동의').setRequired(true)
    .setChoiceValues(['동의합니다']);

  // 섹션 B — 졸업 후 진로 및 경력 (40년 통계용)
  contact.addPageBreakItem().setTitle('졸업 후 진로 및 경력')
    .setHelpText('이 섹션의 데이터는 나중에 "40년 통계" 시각화에 사용됩니다.');
  var edu = contact.addMultipleChoiceItem().setTitle('최종 학력').setRequired(true);
  edu.setChoiceValues(['학사', '석사', '박사', '포닥']);
  edu.showOtherOption(true);
  contact.addTextItem().setTitle('전공 분야').setRequired(true)
    .setHelpText('석/박사의 경우 세부 전공 기입.');
  contact.addTextItem().setTitle('현재 소속 및 직위').setRequired(true)
    .setHelpText('예 - OO전자 책임연구원, OO대학교 교수, 벤처 창업 등.');
  contact.addParagraphTextItem().setTitle('주요 경력 요약').setRequired(true)
    .setHelpText('선배님들의 발자취를 40주년 기념 자료에 담고자 합니다. 주요 이력을 자유롭게 적어주세요.');

  // ─────────────────────────────────────────────
  // 결과 출력 (응답 URL · 수정 URL · 기수 prefill 키)
  // ─────────────────────────────────────────────
  log.push('==================  결과 (이 내용을 전달해 주세요)  ==================');
  log.push('');
  log.push('[① 동잠(단체복) 주문]');
  log.push('  응답 URL : ' + jacket.getPublishedUrl());
  log.push('  수정 URL : ' + jacket.getEditUrl());
  log.push('  prefill_generation_key: ' + prefillEntry(jacket, jacketGen));
  log.push('');
  log.push('[② 동문 근황·연락처 업데이트]');
  log.push('  응답 URL : ' + contact.getPublishedUrl());
  log.push('  수정 URL : ' + contact.getEditUrl());
  log.push('  prefill_generation_key: ' + prefillEntry(contact, contactGen));
  log.push('');
  log.push('=====================================================================');

  Logger.log(log.join('\n'));
  return log.join('\n');
}

/**
 * 주어진 텍스트 문항(기수)의 prefill 파라미터(entry.숫자)를 추출한다.
 * 응답을 제출하지 않고 prefilled URL만 생성해 파싱한다.
 */
function prefillEntry(form, item) {
  var sentinel = '987654321';
  var resp = form.createResponse().withItemResponse(item.createResponse(sentinel));
  var url = resp.toPrefilledUrl();
  var m = url.match(new RegExp('entry\\.(\\d+)=' + sentinel));
  return m ? 'entry.' + m[1] : '(추출 실패 — 폼 ⋮ → 사전 채워진 링크 가져오기로 수동 확인)';
}
