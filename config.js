// MR 40주년 사이트 설정 — 운영자는 이 파일만 수정하면 됩니다.
const CONFIG = {
  SITE_URL: "https://kaistmr.github.io/mr40-website/",
  OG_IMAGE: "assets/og-image.png",

  // 주소록 암호문 경로 (AES-256-GCM). scripts/encrypt-members.mjs 로 생성.
  // (구식) 정적 복호 방식 — Supabase 이관 후 비상 폴백용으로만 남겨둠.
  MEMBERS_ENC_PATH: "data/members.enc",

  // 주소록 실시간 DB (Supabase). anon 키는 공개용이라 정적 파일에 넣어도 안전
  // (RLS로 members 테이블 직접 조회는 전면 차단, service_role Edge Function만 접근).
  SUPABASE_URL: "https://upbvxipashgyowctbhby.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYnZ4aXBhc2hneW93Y3RiaGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTc0OTUsImV4cCI6MjA5OTU5MzQ5NX0.q7IdTlUxb_tj0NHJahPmh3kjqjVPkYmaPUywHjATyt8",
  DIRECTORY_FN_URL: "https://upbvxipashgyowctbhby.supabase.co/functions/v1/directory",
  // 본인 기록 불러오기(update.html). 접속 코드+기수+이름으로 내 최신 기록을 반환.
  MYRECORD_FN_URL: "https://upbvxipashgyowctbhby.supabase.co/functions/v1/myrecord",
  SUBMIT_UPDATE_URL: "https://upbvxipashgyowctbhby.supabase.co/rest/v1/responses",
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
      desc: "사이즈 · 수량 · 손목 각인 이름. 예상 단가 54,000원 · 9월 20일(일) 주문 마감.",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSfFIGePYR4BbjLZVbGr8tGLkkMqTTrdFqw120mIe1n6F5YiEg/viewform",
      // 9월 20일(일) 주문 마감 — 팝업·첫 화면에서 내림 (링크로 들어오면 마감 안내 표시)
      active: false,
      prefill_generation_key: "entry.1271457072",
    },
    {
      id: "contact",
      icon: "📇",
      title: "동문 근황 · 연락처 업데이트",
      desc: "주소록에 실릴 연락처와 졸업 후 진로·경력을 갱신해 주세요.",
      // 구글폼 → 사이트 자체 폼(update.html, Supabase 직접 저장)으로 이관
      url: "update.html",
      active: true,
      prefill_generation_key: "",
    },
    {
      id: "donate",
      icon: "💝",
      title: "40주년 후원",
      desc: "발전기금과 사단법인 계좌, 두 가지 방법을 안내합니다.",
      url: "https://docs.google.com/forms/d/e/1FAIpQLSdqSTzf-gZvq2JPLxGkXQVHg-x0IhI2pvBC2Alx5RQbqFTDKg/viewform",
      // page가 있으면 설문 iframe 대신 이 페이지로 보냅니다 (후원은 방법이 둘이라 별도 안내 페이지).
      page: "donate.html",
      active: true,
      prefill_generation_key: "",
    },
  ],
  // Cloudflare R2 공개 버킷 베이스 URL (예: https://pub-xxx.r2.dev)
  R2_BASE_URL: "",
  // 행사 정보
  EVENT_DATE: "2026-11-28T15:00:00+09:00",
  EVENT_PLACE: "롯데시티호텔 대전",
  EVENT_DETAILS: {
    durationHours: 6,
    address: "대전광역시 유성구 엑스포로123번길 33",
    rooms: ["1층 크리스탈홀"],
    audience: ["MR 동문 (역대 전 기수)", "현역 부원", "지도교수 및 내빈", "가족 동반 환영"],
    fee: [
      "졸업생 및 가족(성인) 12만원",
      "대학원생 8만원",
      "학부생(현재 동아리원) 및 가족(유·아동 제외) 5만원",
      "가족(유·아동) 2만 5천원",
    ],
    // 행사 당일 안내(day.html) 정적 폴백 — 운영시트(parking/seating/emergency)가 있으면 그쪽이 우선
    parking: "호텔 지하 주차장 이용 가능",
    seating: "선착순 배정 예정",
    emergency: "010-6351-6533 (안연수 회장)",
    refundPolicy: "취소·환불은 이벤터스 기본 규정을 따릅니다. 이벤터스 마이페이지의 ‘신청 행사’에서 직접 취소할 수 있고, 기한이 지난 뒤에는 준비위원회로 연락 주세요.",
    attendanceCount: "",
    liveUrl: "https://youtube.com/live/WvAlIzlu9p4?feature=share",
    replayUrl: "",
    photoUploadUrl: "",
    program: [
      { time: "13:30", what: "0부 · 등록과 로봇 전시", note: "올해 학생들이 만든 로봇 8대를 만든 학생이 직접 소개합니다" },
      { time: "15:00", what: "1부 · 개회와 축사", note: "「40년의 발자취」 영상 · 기념사 · 40년 경과보고" },
      { time: "15:42", what: "1부 · 「다음 40년」 발표", note: "제조 휴머노이드 경진대회 · 감사패 전달" },
      { time: "16:00", what: "1부 · 초청 강연", note: "로봇 분야 연사 두 분의 강연" },
      { time: "17:30", what: "후원사 소개 · 단체 사진", note: "" },
      { time: "18:00", what: "2부 · 만찬과 토크쇼 「40년 이야기」", note: "세대별 동문 패널 · 객석 질문 · 주제가 「달리는 마우스」" },
      { time: "20:00", what: "3부 · 자유 교류", note: "신청곡 · 경품 추첨 · 21:00 폐회" },
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
    kakao: "https://place.map.kakao.com/23700427",
    naver: "https://naver.me/GfCsZ9fn",
  },
  CONTACT: {
    phone: "",
    sms: "",
    email: "ys.an@kaist.ac.kr",
    openChat: "",
    label: "준비위원회",
  },
};
