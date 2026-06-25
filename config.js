// MR 40주년 사이트 설정 — 운영자는 이 파일만 수정하면 됩니다.
const CONFIG = {
  SITE_URL: "https://kaistmr.github.io/mr40-website/",
  OG_IMAGE: "assets/og-image.png",

  // 구글시트 '웹에 게시' CSV 주소 (미발급 시 "" — 페이지에 안내 표시됨)
  MEMBERS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOJwiWrRbj2_fFav3sga3dNum3iCjtwn0WdJeOoY-H3sM3EYGmx24WGgqSk9LBg22W-1WPyBJ03Mww/pub?gid=738005260&single=true&output=csv",
  OPS_SHEETS: {
    notices: "",
    event: "",
    sponsors: "",
    videos: "",
    surveys: "",
    stats: "",
  },
  // 구글폼 주소
  MEMBERS_FORM_URL: "",
  EVENT_FORM_URL: "",

  // 40주년 설문 3종 — url을 채우면 첫 화면 팝업과 각 페이지에 표시됩니다.
  // active를 false로 바꾸면 시기에 따라 잠시 내릴 수 있습니다.
  SURVEYS: [
    {
      id: "attend",
      icon: "🎉",
      title: "참석 조사",
      desc: "기념행사 참석 여부 · 동반자 · 숙박 조건",
      url: "https://forms.gle/hGYwQG2PQu6HvUaT6",
      // 이벤터스로 신청·결제 일원화되어 내림 (신청 경로 중복 방지)
      active: false,
      prefill_generation_key: "",
    },
    {
      id: "jacket",
      icon: "🧥",
      title: "동잠(단체복) 주문",
      desc: "사이즈 · 수량 · 손목 각인 이름. 입금은 주문 수합 후 별도 안내드립니다.",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSfFIGePYR4BbjLZVbGr8tGLkkMqTTrdFqw120mIe1n6F5YiEg/viewform",
      active: true,
      prefill_generation_key: "entry.1271457072",
    },
    {
      id: "contact",
      icon: "📇",
      title: "동문 근황 · 연락처 업데이트",
      desc: "주소록에 실릴 연락처와 졸업 후 진로·경력을 갱신해 주세요.",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSeaKDi6DRe2DqktW4CvvKRyENXLbiyFd2GgMYhRqiEnNc1uCw/viewform",
      active: true,
      prefill_generation_key: "entry.1146662053",
    },
  ],
  // Cloudflare R2 공개 버킷 베이스 URL (예: https://pub-xxx.r2.dev)
  R2_BASE_URL: "",
  // 주소록 접속 코드의 SHA-256 해시 (코드 변경: 새 코드를 해시해서 교체)
  MEMBERS_CODE_HASH: "eb9ccc68c4b8f5cbbd365d73ce2be9c0da9e56ec89b44feec7ce9bd7524209b9",
  // 행사 정보
  EVENT_DATE: "2026-11-28T15:00:00+09:00",
  EVENT_PLACE: "롯데시티호텔 대전",
  EVENT_DETAILS: {
    durationHours: 6,
    address: "",
    rooms: ["크리스탈볼룸", "루비룸 (1층)"],
    audience: ["MR 동문 (역대 전 기수)", "현역 부원", "지도교수 및 내빈", "가족 동반 환영"],
    fee: ["성인 10~15만원", "학부생 5만원", "유아동 3만원"],
    refundPolicy: "",
    attendanceCount: "",
    liveUrl: "",
    replayUrl: "",
    photoUploadUrl: "",
    program: [
      { time: "15:00", what: "1부 · 개회와 축사", note: "지도교수님·동문 선배·회장 인사" },
      { time: "16:00", what: "1부 · 로봇 토크 콘서트", note: "선배 연사들과 함께하는 기술·추억 토크 (약 80분)" },
      { time: "18:00", what: "2부 · 40년사 영상과 사진", note: "연대별(80·90·00·10) 선배들의 이야기" },
      { time: "20:00", what: "3부 · 선후배 대화의 시간", note: "경품 추첨과 마무리" },
    ],
  },
  PAYMENTS: {
    // provider: "direct"(페이앱+송금링크) | "eventus"(이벤터스로 일원화) | "off"(결제 숨김)
    // 이벤터스로 확정되면 provider를 "eventus"로 바꾸고 eventusUrl만 채우면
    // 사이트의 직접결제 UI가 자동으로 이벤터스 버튼으로 교체됩니다.
    provider: "eventus",
    cardUrl: "",
    transferUrl: "",
    eventusUrl: "https://event-us.kr/n6cfygv1/event/129241",
  },
  MAP_LINKS: {
    kakao: "",
    naver: "",
  },
  CONTACT: {
    phone: "",
    sms: "",
    email: "ys.an@kaist.ac.kr",
    openChat: "",
    label: "준비위원회",
  },
};
