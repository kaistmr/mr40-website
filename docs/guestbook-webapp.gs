/**
 * MR 40주년 방명록 — 사이트 내 작성 백엔드 (Google Apps Script 웹 앱)
 *
 * GitHub Pages는 정적 호스팅이라 서버가 없으므로, 이 웹 앱이 방명록 글을
 * 받아 시트에 저장하는 "쓰기 엔드포인트" 역할을 한다.
 *
 * 설치(운영자, 1회):
 *  1) https://script.google.com → 새 프로젝트 → 이 코드 전체 붙여넣기
 *  2) 함수 목록에서 setupGuestbook 선택 → 실행 → 권한 승인
 *     → 실행 로그에 [시트 URL]과 다음 안내가 출력됨
 *  3) 출력된 시트를 열어 "파일 → 공유 → 웹에 게시 → 방명록 시트 → CSV"로 게시
 *     → 그 주소 = GUESTBOOK_CSV_URL (메시지 표시용)
 *  4) 배포 → 새 배포 → 유형: 웹 앱
 *     - 실행: 나(본인) / 액세스 권한: 모든 사용자 → 배포 → 웹 앱 URL(/exec) 복사
 *     → 그 주소 = GUESTBOOK_POST_URL (작성용)
 *  5) 두 주소를 안윤수에게 전달 → config.js에 연결
 *
 * 시트 열 순서(사이트가 읽는 형식): 타임스탬프 · 이름 · 기수 · 메시지
 */

var PROP_KEY = 'MR40_GUESTBOOK_SHEET_ID';
var SHEET_NAME = '방명록';

function setupGuestbook() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_KEY);
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('MR40 방명록');
  if (!id) props.setProperty(PROP_KEY, ss.getId());

  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['타임스탬프', '이름', '기수', '메시지']);

  // 자동 생성된 빈 기본 시트 정리
  ss.getSheets().forEach(function (s) {
    if (s.getName() !== SHEET_NAME && s.getLastRow() === 0) {
      try { ss.deleteSheet(s); } catch (x) {}
    }
  });

  Logger.log([
    '== 방명록 시트 준비 완료 ==',
    '시트 URL: ' + ss.getUrl(),
    '',
    '다음 1) 이 시트를 "파일 → 공유 → 웹에 게시 → ' + SHEET_NAME + ' 시트 → CSV"로 게시',
    '        → 그 주소 = GUESTBOOK_CSV_URL',
    '다음 2) 배포 → 새 배포 → 웹 앱(액세스: 모든 사용자) → /exec URL',
    '        → 그 주소 = GUESTBOOK_POST_URL'
  ].join('\n'));
}

function doPost(e) {
  try {
    var data = parseBody_(e);
    if (data.hp) return json_({ ok: true });                 // 허니팟 → 봇 무시(성공인 척)
    var name = String(data.name || '').trim().slice(0, 40) || '익명';
    var cohort = String(data.cohort || '').trim().slice(0, 20);
    var message = String(data.message || '').trim();
    if (message.length < 2) return json_({ ok: false, error: 'too short' });
    message = message.slice(0, 1000);

    var id = PropertiesService.getScriptProperties().getProperty(PROP_KEY);
    if (!id) return json_({ ok: false, error: 'not set up — run setupGuestbook first' });
    SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME)
      .appendRow([new Date(), name, cohort, message]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server error' });
  }
}

// 사이트는 mode:"no-cors" + text/plain 으로 JSON 문자열을 보냄
function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (x) {}
  }
  return (e && e.parameter) || {};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
