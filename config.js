// MR 40주년 사이트 설정 — 운영자는 이 파일만 수정하면 됩니다.
const CONFIG = {
  // 구글시트 '웹에 게시' CSV 주소 (미발급 시 "" — 페이지에 안내 표시됨)
  MEMBERS_CSV_URL: "",
  GUESTBOOK_CSV_URL: "",
  // 구글폼 주소
  MEMBERS_FORM_URL: "",
  GUESTBOOK_FORM_URL: "",
  EVENT_FORM_URL: "",

  // 40주년 설문 3종 — url을 채우면 첫 화면 팝업과 각 페이지에 표시됩니다.
  // active를 false로 바꾸면 시기에 따라 잠시 내릴 수 있습니다.
  SURVEYS: [
    {
      id: "attend",
      icon: "🎉",
      title: "참석 조사",
      desc: "기념행사 참석 여부 · 동반자 · 숙박 조건",
      url: "",
      active: true,
    },
    {
      id: "voice",
      icon: "💬",
      title: "총회 한마디 & 동잠 구매",
      desc: "총회에서 하고 싶은 말, 동아리 잠바 구매 수요",
      url: "",
      active: true,
    },
    {
      id: "contact",
      icon: "📇",
      title: "연락처 업데이트",
      desc: "주소록에 실릴 내 연락처·근황 갱신",
      url: "",
      active: true,
    },
  ],
  // Cloudflare R2 공개 버킷 베이스 URL (예: https://pub-xxx.r2.dev)
  R2_BASE_URL: "",
  // 주소록 접속 코드의 SHA-256 해시 (코드 변경: 새 코드를 해시해서 교체)
  MEMBERS_CODE_HASH: "eb9ccc68c4b8f5cbbd365d73ce2be9c0da9e56ec89b44feec7ce9bd7524209b9",
  // 행사 정보
  EVENT_DATE: "2026-11-28T17:00:00+09:00",
  EVENT_PLACE: "미정",
};
