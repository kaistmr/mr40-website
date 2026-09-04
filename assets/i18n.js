/* MR40 한/영 전환 — KO는 HTML 원문 그대로, EN은 이 파일의 사전.
   HTML에 태그를 달지 않고 텍스트 노드·속성(title/aria-label/placeholder/alt/meta content)을
   한국어 원문 그대로 키로 찾아 치환한다. 동적으로 그려지는 내용은 MutationObserver가 잡는다.
   전환: 상단 메뉴의 EN/한국어 버튼, 또는 ?lang=en. 선택은 localStorage.mr40_lang 에 저장.
   점검: EN 상태에서 콘솔에 I18N.missing() → 번역 안 된 한국어 목록(회원 이름 등 데이터는 정상). */
(function () {
  "use strict";

  var DICT = {
    /* ── 공통 (nav · footer · common.js) ── */
    "홈": "Home", "연혁": "History", "주소록": "Directory", "사진관": "Gallery",
    "회지": "Magazines", "옛홈피": "Old Sites", "통계": "Stats", "행사안내": "Event",
    "MR40 처음으로": "MR40 home", "메뉴": "Menu", "맨 위로": "Back to top", "↑ 맨 위로": "↑ Top",
    "주소를 복사했습니다.": "Link copied.", "↗ 새 창": "↗ new tab", "← 처음으로": "← Home",
    "문의 오픈채팅": "Open chat", "공지": "Notice", "자세히": "Details",
    "주제가 재생/정지": "Play / pause theme song", "♪ 달리는 마우스": "♪ Running Mouse",
    "© 2026 MR 40주년 준비위원회": "© 2026 MR 40th Anniversary Committee",
    "준비위원회": "Organizing Committee", "준비 중": "Coming soon", "추후 공지": "To be announced",
    "미정": "TBD", "제목 없음": "Untitled", "불러오는 중…": "Loading…",

    /* ── index ── */
    "KAIST MR(Microrobot Research) 창립 40주년 기념 홈페이지": "KAIST MR (Microrobot Research) 40th anniversary website",
    "MR 40 — 로봇과 함께한 마흔 해": "MR 40 — Forty Years with Robots",
    "1986년부터 2026년까지, MR의 40년 기록과 사람들을 만납니다.": "From 1986 to 2026: forty years of MR's records and people.",
    "MR 40 — KAIST Microrobot Research 40주년": "MR 40 — KAIST Microrobot Research 40th Anniversary",
    "로봇과 함께한": "Forty Years", "마흔 해": "with Robots",
    "1986년 창설부터 2026년 오늘까지, 40년의 기록과 사람들을": "From our founding in 1986 to today in 2026,",
    "한 자리에 모았습니다.": "forty years of records and people, gathered in one place.",
    "아래로 보기": "Scroll down",
    "40주년 기념식까지": "Until the 40th anniversary ceremony",
    "일": "days", "시간": "hours", "분": "min", "초": "sec",
    "둘러보기": "Explore",
    "1986년부터 2026년까지, 40년의 발자취": "Forty years of footprints, 1986–2026",
    "접속 코드 필요": "Access code required", "🔒 코드 필요": "🔒 Code required",
    "선배·동기·후배를 다시 만나는 곳": "Reconnect with seniors, classmates and juniors",
    "8천 장의 사진과 영상으로 보는 MR": "MR in 8,000 photos and videos",
    "큰 마음 작은 이야기 — 회지 아카이브": "Big Hearts, Small Stories — the magazine archive",
    "2026.11.28 — 40주년 기념행사": "2026.11.28 — 40th anniversary celebration",
    "숫자로 보는 MR": "MR in Numbers",
    "사진·회지와 공개 가능한 동문 통계": "Photos, magazines and shareable alumni stats",
    "로고로 보는 MR": "MR through its logos",
    "시대마다 새로 그려진 동아리의 얼굴들": "The club's face, redrawn in every era",
    "MR 2000년대 로고": "MR logo, 2000s", "MR 2010년대 로고": "MR logo, 2010s",
    "MR 현행 로고 — Microrobot Research": "Current MR logo — Microrobot Research",
    "함께하는 분들": "Our Supporters",
    "40주년 행사를 후원해 주시는 분들": "Those supporting the 40th anniversary event",
    "후원사를 모시고 있습니다.": "We are welcoming sponsors.",
    "동문 개인 후원과 기업 후원 모두 환영해요 — 문의는 동아리 메일로 부탁드립니다.": "Individual alumni and corporate sponsorships are both welcome — please contact us by club email.",
    "함께해 주셔서 감사합니다 ❤️": "Thank you for being with us ❤️",
    "40주년, 함께 준비해요": "Let's prepare the 40th together",
    "잠깐 시간 내어 참여해 주시면 준비에 큰 힘이 됩니다.": "A minute of your time is a big help in the preparations.",
    "다음에 할게요": "Maybe later", "📋 참여하기": "📋 Take part", "행사 안내 보기": "See event details",
    "🎉 40주년 행사 참가 신청": "🎉 Register for the 40th anniversary event",
    "신청과 참가비 결제를 이벤터스에서 한 번에 진행합니다.": "Registration and fee payment are handled together on Eventus.",
    "행사 다시보기": "Watch the replay", "지금 라이브로 보기": "Watch live now",

    /* ── config.js 설문·행사 정보 (시트 값이 아닌 기본값) ── */
    "참석 조사": "Attendance survey",
    "기념행사 참석 여부 · 동반자 · 숙박 조건": "Attendance, companions and lodging",
    "동잠(단체복) 주문": "Club jacket order",
    "사이즈 · 수량 · 손목 각인 이름. 예상 단가 54,000원 · 9월 13일(일) 주문 마감.": "Size, quantity and wrist engraving name. Est. KRW 54,000 each · orders close Sun, Sep 13.",
    "동문 근황 · 연락처 업데이트": "Alumni news & contact update",
    "주소록에 실릴 연락처와 졸업 후 진로·경력을 갱신해 주세요.": "Update the contact details and post-graduation career shown in the directory.",
    "40주년 후원": "40th anniversary sponsorship",
    "사단법인 계좌 이체로 후원하고 설문을 남겨 주시면 사은품을 보내드립니다.": "Donate by bank transfer to the association account, fill in the survey, and we'll send you a gift.",
    "롯데시티호텔 대전": "Lotte City Hotel Daejeon", "크리스탈볼룸": "Crystal Ballroom", "루비룸 (1층)": "Ruby Room (1F)",
    "MR 동문 (역대 전 기수)": "MR alumni (all cohorts)", "현역 부원": "Current members",
    "지도교수 및 내빈": "Advising professors and guests", "가족 동반 환영": "Families welcome",
    "졸업생 및 가족(성인) 12만원": "Alumni and adult family: KRW 120,000",
    "대학원생 8만원": "Graduate students: KRW 80,000",
    "학부생(현재 동아리원) 및 가족(유·아동 제외) 5만원": "Undergraduates (current members) and family (excl. children): KRW 50,000",
    "가족(유·아동) 2만 5천원": "Children: KRW 25,000",
    "호텔 지하 주차장 이용 가능": "Hotel underground parking available",
    "선착순 배정 예정": "First come, first served",
    "010-6351-6533 (안연수 회장)": "010-6351-6533 (Yeonsu An, President)",
    "1부 · 개회와 축사": "Part 1 · Opening and congratulatory remarks",
    "지도교수님·동문 선배·회장 인사": "Greetings from advising professors, senior alumni and the president",
    "1부 · 로봇 토크 콘서트": "Part 1 · Robot talk concert",
    "선배 연사들과 함께하는 기술·추억 토크 (약 80분)": "Tech and memories with alumni speakers (about 80 min)",
    "2부 · 40년사 영상과 사진": "Part 2 · 40 years in video and photos",
    "연대별(80·90·00·10) 선배들의 이야기": "Stories from alumni of each decade (80s · 90s · 00s · 10s)",
    "3부 · 선후배 대화의 시간": "Part 3 · Conversations across generations",
    "경품 추첨과 마무리": "Prize draw and closing",

    /* ── members ── */
    "MR 동문 주소록": "MR alumni directory", "동문 주소록 — MR 40": "Alumni Directory — MR 40",
    "선배, 동기, 후배의 소식을 다시 만나는 동문 주소록입니다.": "An alumni directory to reconnect with seniors, classmates and juniors.",
    "주소록 — MR 40": "Directory — MR 40", "동문 주소록": "Alumni Directory",
    "회원에게 공유된 접속 코드를 입력하세요.": "Enter the access code shared with members.",
    "개인정보 보호를 위해 잠겨 있습니다.": "Locked to protect personal information.",
    "접속 코드": "Access code", "접속 코드 입력": "Enter access code", "확인": "Enter",
    "이름, 기수, 소속, 관심사 검색…": "Search name, cohort, affiliation, interests…",
    "회원 검색": "Search members", "검색 초기화": "Clear search",
    "정렬": "Sort", "정렬 기준": "Sort by",
    "학번순 (오래된 기수부터)": "Cohort (oldest first)", "학번 역순 (최신 기수부터)": "Cohort (newest first)",
    "가나다순": "Name A→Z", "가나다 역순": "Name Z→A",
    "본 주소록은 동문 네트워킹 목적으로만 사용해 주세요.": "Please use this directory for alumni networking only.",
    "정보 등록/수정": "Add / edit my info",
    "접속 코드를 입력하세요.": "Please enter the access code.",
    "접속 코드가 올바르지 않습니다.": "Incorrect access code.",
    "주소록 데이터를 불러오지 못했습니다.": "Could not load the directory.",
    "검색 결과가 없습니다.": "No results.",
    "복사를 지원하지 않는 환경입니다.": "Copying isn't supported here.", "복사에 실패했습니다.": "Copy failed.",
    "📞 전화": "📞 Call", "전화번호": "Phone number", "📞 번호복사": "📞 Copy number",
    "이메일": "Email", "✉️ 메일복사": "✉️ Copy email",
    "👑 회장": "👑 President", "🎖️ 부회장": "🎖️ Vice President", "🎖️ 총무": "🎖️ Treasurer", "🎖️ 임원": "🎖️ Officer",

    /* ── event ── */
    "2026년 MR 창립 40주년 기념행사 안내": "Guide to MR's 40th anniversary celebration, 2026",
    "40주년 행사 안내 — MR 40": "40th Anniversary Event — MR 40",
    "2026년 11월 28일, MR 창립 40주년 기념행사 안내입니다.": "Details of MR's 40th anniversary celebration on November 28, 2026.",
    "행사 안내 — MR 40": "Event — MR 40", "창립 40주년 기념행사": "40th Anniversary Celebration",
    "참가 신청하기 🎉": "Register 🎉", "동문·현역 누구나 환영합니다": "All alumni and current members welcome",
    "캘린더에 추가": "Add to calendar", "카카오맵 준비 중": "Kakao Map coming soon",
    "네이버지도 준비 중": "Naver Map coming soon", "행사 당일 안내": "Day-of Guide",
    "참석 현황": "Attendance", "참석 인원을 집계하고 있습니다.": "We're counting attendees.",
    "참가비 결제": "Fee payment",
    "결제 수단과 금액을 준비하고 있습니다. 결제자명은 참석 조사 이름과 같게 입력해 주세요.": "Payment options and amounts are being prepared. Please pay under the same name you registered with.",
    "카드 결제 준비 중": "Card payment coming soon", "간편 송금 준비 중": "Bank transfer coming soon",
    "환불 규정은 확정되는 대로 안내합니다.": "The refund policy will be announced once finalized.",
    "참가비와 별도로 40주년 행사를 후원하실 수 있습니다. 사단법인 계좌로 이체하신 뒤 후원 설문을 남겨 주시면 사은품을 보내드립니다.": "Beyond the fee, you can also sponsor the 40th anniversary event. Transfer to the association account, fill in the sponsorship survey, and we'll send you a gift.",
    "후원해 주신 분들은 첫 화면의 '함께하는 분들'에 성함 또는 로고로 모십니다. (익명 후원도 가능)": "Sponsors are listed by name or logo under 'Our Supporters' on the home page. (Anonymous sponsorship is fine too.)",
    "후원 안내 · 설문 열기": "Sponsorship info · open survey",
    "온라인 중계": "Live stream",
    "온라인 중계 주소는 행사 당일 이 자리에 공개됩니다.": "The stream link will appear here on the day of the event.",
    "프로그램": "Program", "장소 추후 공지": "Venue to be announced",
    "📍 장소": "📍 Venue", "👥 대상": "👥 Who", "💰 참가비": "💰 Fee",
    "세부 프로그램은 확정되는 대로 공지됩니다.": "The detailed program will be announced once finalized.",
    "카카오맵으로 보기": "Open in Kakao Map", "네이버지도로 보기": "Open in Naver Map",
    "참가 신청과 결제를 이벤터스에서 한 번에 진행합니다.": "Registration and payment are handled together on Eventus.",
    "이벤터스에서 신청·결제하기": "Register & pay on Eventus", "카드 결제": "Card payment", "간편 송금": "Bank transfer",
    "다시보기 열기": "Open replay", "중계 채널 열기": "Open stream channel",
    "행사 당일(11월 28일)부터 이 채널에서 생중계됩니다.": "Live streaming starts on this channel on the day of the event (November 28).",
    "MR40 온라인 중계": "MR40 live stream",

    /* ── survey ── */
    "MR 40주년 행사 설문 참여 안내": "MR 40th anniversary surveys", "설문 참여 — MR 40": "Surveys — MR 40",
    "MR 40주년 준비를 위한 설문에 참여해 주세요.": "Please take part in the surveys for MR's 40th anniversary.",
    "설문 참여": "Survey", "설문": "Survey",
    "아래 문항을 작성한 뒤 마지막의 보내기 버튼을 눌러 주세요.": "Fill in the questions below and press Submit at the end.",
    "연락처 업데이트는 모든 동문께 권장드립니다.": "We recommend every alum update their contact details.",
    "이미 주소록에 정보가 있으신 분도 새로 작성해 주세요 — 새 내용이 기존 데이터 위에 갱신됩니다.": "Even if you're already in the directory, please fill it in again — new entries overwrite the old data.",
    "이번에는 이름·연락처뿐 아니라": "This time we're collecting not only names and contacts but also",
    "관심사와 졸업 후 진로·경력": "interests and post-graduation careers",
    "까지 새로 받아, 주소록 전체를 리뉴얼합니다.": ", renewing the whole directory.",
    "예상 단가는 54,000원": "Estimated price: KRW 54,000 each",
    "이며, 입금은 주문 수합 후 별도로 안내드립니다.": "; payment details will follow once orders are collected.",
    "제작 기간 관계로 주문은": "Due to production time, orders are accepted only",
    "9월 13일(일)까지": "until Sunday, September 13", "만 받습니다.": ".",
    "수집한 정보는 40주년 행사 운영 목적에 한해 사용하며, 행사 종료 후 파기합니다.": "Collected information is used only to run the 40th anniversary event and is deleted afterwards.",
    "후원은 사단법인 계좌로 이체하신 뒤 이 설문을 작성해 주시면 완료됩니다.": "To sponsor, transfer to the association account and then fill in this survey.",
    "설문에 남겨 주신 주소로 사은품을 보내드립니다.": "We'll send a gift to the address you leave in the survey.",
    "후원해 주신 분들은 메인 페이지의": "Sponsors are listed under", "'함께하는 분들'": "'Our Supporters'",
    "에 성함 또는 로고로 모십니다. 익명 후원을 원하시면 설문에서 선택해 주세요.": " on the home page by name or logo. Choose the anonymous option in the survey if you prefer.",
    "설문을 새 창에서 열기": "Open survey in a new tab", "설문 링크를 준비하고 있습니다.": "The survey link is being prepared.",
    "2단계": "Step 2",
    "신청서를 보내셨다면 참가비를 결제해 주세요.": "Once you've submitted the form, please pay the fee.",
    "결제(입금)자 이름을 신청서의 이름과 같게": "Use the same name as on your form when paying",
    "해주시면 확인이 빨라집니다.": "so we can confirm it faster.",
    "참가비 안내": "Fee table",
    "졸업생 및 가족(성인)": "Alumni & adult family", "12만원": "KRW 120,000",
    "대학원생": "Graduate students", "8만원": "KRW 80,000",
    "학부생(현재 동아리원) 및 가족(유·아동 제외)": "Undergraduates (current members) & family (excl. children)", "5만원": "KRW 50,000",
    "가족(유·아동)": "Children", "2만 5천원": "KRW 25,000",
    "폼 사용이 어려우면 준비위원회에 전화나 문자로 접수할 수 있습니다.": "If the form is hard to use, you can register with the committee by phone or text.",
    "연락처 준비 중": "Contact details coming soon",
    "설문을 불러올 수 없습니다.": "Could not load the survey.",
    "신청이 접수됐어요! 이어서 참가비를 결제해 주세요.": "Your registration is in! Please continue to payment.",
    "💳 카드로 결제": "💳 Pay by card", "🏦 간편 송금(이체)": "🏦 Bank transfer",
    "결제 수단을 준비하고 있어요. 열리는 대로 이 자리와 단톡방에 안내드릴게요.": "Payment options are being prepared. We'll announce them here and in the group chat.",
    "문자 보내기": "Send a text",

    /* ── gallery ── */
    "MR 40년의 활동 사진과 영상 아카이브": "Forty years of MR photos and videos", "사진관 — MR 40": "Gallery — MR 40",
    "40년의 순간을 사진과 영상으로 만나보세요.": "Forty years of moments in photos and video.",
    "40년의 순간들 — 역대 활동 사진과 영상 아카이브": "Forty years of moments — the photo and video archive",
    "📷 사진": "📷 Photos", "🎬 영상": "🎬 Videos",
    "사진 크게 보기": "View photo", "닫기": "Close", "이전": "Previous", "다음": "Next",
    "연도미상": "Unknown year", "전체": "All",
    "아직 사진이 없습니다.": "No photos yet.", "사진을 불러오는 중입니다.": "Loading photos…",
    "사진 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.": "Could not load photos. Please try again shortly.",
    "영상은 디지털로 옮기는 중이에요 🎞️": "Videos are being digitized 🎞️",
    "영상 재생": "Play video", "영상": "Video", "영상 데이터를 불러오지 못했습니다.": "Could not load videos.",

    /* ── timeline ── */
    "1986년 창단부터 이어진 MR 40년 연혁": "MR's 40-year history since its founding in 1986", "연혁 — MR 40": "History — MR 40",
    "MR의 40년 발자취를 시간순으로 살펴봅니다.": "MR's forty years of footprints, in order.",
    "40년의 발자취": "Forty Years of Footprints",
    "2024년부터 1986년 창단까지, 시간을 거슬러 올라가는 여행": "A journey back in time, from 2024 to the founding in 1986",
    "↓ 아래로 스크롤할수록 과거로 갑니다": "↓ Scroll down to go further back",
    "AI와 함께하는 새로운 도전": "New challenges with AI", "로봇 캠프와 교육의 시대": "The era of robot camps and education",
    "전국 대회를 휩쓸던 시절": "Sweeping the national contests", "MIROSOT 세계 무대의 주역": "Leading the MIROSOT world stage",
    "모든 것이 시작된 곳": "Where it all began",
    "바로 보기": "Watch", "SBS 공식 무료 다시보기": "Official free replay on SBS", "새 탭에서 열림 ↗": "Opens in a new tab ↗",
    "> KAIST MICROROBOT RESEARCH — 모든 이야기의 시작_": "> KAIST MICROROBOT RESEARCH — WHERE EVERY STORY BEGAN_",
    "연혁 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.": "Could not load the timeline. Please try again shortly.",

    /* ── magazine (+ data/magazines.json 제목) ── */
    "MR 역대 회지 PDF 아카이브": "MR magazine PDF archive", "회지 — MR 40": "Magazines — MR 40",
    "역대 MR 회지를 온라인에서 읽어보세요.": "Read past MR magazines online.",
    "회지 아카이브": "Magazine Archive",
    "선배들이 남긴 기록 — 회지와 대회 자료집을 그대로 펼쳐 보세요": "Records left by our seniors — browse magazines and contest booklets as they were",
    "등록된 회지가 없습니다.": "No magazines yet.",
    "디지털화 작업이 진행 중입니다. 조금만 기다려 주세요!": "Digitization in progress. Please check back soon!",
    "회지 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.": "Could not load magazines. Please try again shortly.",
    "회지 준비호": "Magazine, Preview Issue", "큰 마음 작은 이야기": "Big Hearts, Small Stories", "형 배고파요": "Bro, I'm Hungry",
    "MR 회지 2호": "MR Magazine No. 2", "제4회 마이크로 로봇 대회": "4th Micro Robot Contest",
    "제5회 마이크로 로봇 대회": "5th Micro Robot Contest", "제5회 동아리 연합회": "5th Club Federation",
    "2002 로봇 축구 대회": "2002 Robot Soccer Contest", "MR 주제가 악보": "MR Theme Song Sheet Music",

    /* ── archive ── */
    "MR 옛 홈페이지 보존 아카이브": "Archive of MR's old websites", "옛 홈페이지 — MR 40": "Old Websites — MR 40",
    "2000년대 MR 홈페이지를 원형에 가깝게 보존했습니다.": "MR's 2000s websites, preserved close to their original form.",
    "옛 홈페이지 보관소": "Old Website Vault",
    "그 시절 MR 홈페이지를 그대로 보존했습니다 — 클릭하면 그때 그 화면이 열립니다": "The MR websites of those days, preserved as they were — click to open them",
    "⚠️ 20년 전 웹 기술로 만들어진 페이지라 일부 메뉴·플래시는 동작하지 않을 수 있어요.": "⚠️ Built with 20-year-old web tech, so some menus and Flash content may not work.",
    "모든 페이지는 당시 모습 그대로이며, 새 탭에서 열립니다.": "Every page is shown as it was and opens in a new tab.",
    "새천년의 MR — 동아리 소개와 활동 기록": "MR in the new millennium — club intro and activity records",
    "당시 앨범 1,700여 장이 담긴 가장 풍성한 기록": "The richest record, with some 1,700 album photos",
    "MR Story in KAIST — 당시 활동과 사람들": "MR Story in KAIST — activities and people of the time",
    "활동 소개 중심의 콤팩트한 홈페이지": "A compact site focused on activities",
    "사진 자료가 풍부한 기록": "A record rich in photos", "문서 자료와 함께 보존된 홈페이지": "Preserved along with its documents",

    /* ── stats ── */
    "숫자로 보는 KAIST MR(Microrobot Research)의 40년": "KAIST MR's forty years in numbers",
    "숫자로 보는 MR — MR 40": "MR in Numbers — MR 40",
    "사진, 회지, 연혁과 공개 가능한 동문 통계를 살펴봅니다.": "Photos, magazines, history and shareable alumni statistics.",
    "숫자로 보는": "By the numbers:", "공개 가능한 집계 수치만 표시합니다.": "Only shareable aggregate figures are shown.",
    "사이트 보유 자료": "Site holdings", "동문 통계를 준비하고 있습니다.": "Alumni statistics are being prepared.",
    "보유 사진": "Photos", "보유 영상": "Videos", "보유 회지": "Magazines", "보유 연혁": "Timeline entries", "MR 통계": "MR statistics",

    /* ── day ── */
    "MR 40주년 행사 당일 안내": "Day-of guide for MR's 40th anniversary event", "행사 당일 안내 — MR 40": "Day-of Guide — MR 40",
    "식순, 오시는 길, 주차와 비상 연락처를 확인하세요.": "Program, directions, parking and emergency contacts.",
    "현장에서 필요한 정보를 한곳에 모았습니다.": "Everything you need on site, in one place.",
    "오시는 길": "Directions", "주차": "Parking", "좌석 안내": "Seating", "비상 연락처": "Emergency contact",
    "식순": "Program", "지도 앱": "Map apps",
    "지도 앱으로 행사장(롯데시티호텔 대전)까지 바로 길을 찾을 수 있습니다.": "Get directions to the venue (Lotte City Hotel Daejeon) in your map app.",
    "카카오맵": "Kakao Map", "네이버지도": "Naver Map",

    /* ── 404 ── */
    "페이지를 찾을 수 없습니다 — MR 40": "Page not found — MR 40", "페이지를 찾을 수 없습니다": "Page not found",
    "주소가 바뀌었거나 잘못 입력되었습니다.": "The address may have changed or been mistyped.",

    /* ── update ── */
    "MR 40주년 동문 근황·연락처 업데이트": "MR 40th alumni news & contact update",
    "근황·연락처 업데이트 — MR 40": "Contact Update — MR 40",
    "이미 등록하신 분은": "If you've already registered, you can", "기존 기록을 불러와": "load your existing record", "고칠 수 있어요.": "and edit it.",
    "이름과 기수는 기존 주소록과 같게": "Use the same name and cohort as in the directory",
    "적어 주세요 — 같은 사람으로 인식해 정보를 갱신합니다.": "— that's how we match and update your record.",
    "공개 범위를": "If you set visibility to", "비공개": "Private",
    "로 선택하시면 주소록에서 완전히 제외됩니다.": ", you'll be left out of the directory entirely.",
    "내 기록 불러오기": "Load my record",
    "이미 등록한 적이 있으면": "If you've registered before, enter your",
    "주소록 접속 코드 · 기수 · 이름": "directory access code, cohort and name",
    "으로 기존 내용을 불러와 수정할 수 있어요. 처음이라면 건너뛰고 아래에 바로 작성하세요.": " to load and edit your entry. First time? Skip this and fill in the form below.",
    "주소록 접속 코드": "Directory access code", "주소록과 같은 코드": "Same code as the directory",
    "기수": "Cohort", "예: 95": "e.g. 95", "이름": "Name", "기존 기록 불러오기": "Load existing record",
    "입학 연도 두 자리 (예: 1995학번 → 95, 2008학번 → 08)": "Two-digit entry year (e.g. 1995 → 95, 2008 → 08)",
    "휴대폰": "Mobile", "예: 010-1234-5678": "e.g. 010-1234-5678", "현재 소속 · 직위": "Current affiliation · title",
    "여러 개는": "Separate multiple entries with", "콤마(,)로 구분": "commas (,)",
    "하면 주소록에서 각각 태그로 표시돼요. 예:": " to show each as a tag in the directory. e.g.",
    "현대자동차, 책임연구원, 울산": "Hyundai Motor, Principal Researcher, Ulsan",
    "최종 학력": "Highest degree", "전공": "Major", "경력": "Career",
    "거쳐온 회사·직무나 활동을 자유롭게 적어 주세요.": "Companies, roles or activities you've been part of — in your own words.",
    "한마디 · 근황": "A word · what's new", "주소록 카드에 실릴 짧은 인사나 근황.": "A short greeting or update for your directory card.",
    "동아리 임원 경력": "Club officer roles",
    "MR에서 맡았던 직책이 있으면 선택해 주세요. 주소록 카드에 뱃지로 표시됩니다.": "Select any role you held in MR. It appears as a badge on your card.",
    "해당 없음": "None", "회장": "President", "부회장": "Vice President", "총무": "Treasurer", "기타 임원": "Other officer",
    "주소록 공개 범위": "Directory visibility",
    "공개 (동문 주소록에 실음)": "Public (listed in the alumni directory)", "비공개 (주소록에서 제외)": "Private (not listed)",
    "개인정보 수집 · 이용 동의": "Consent to collection and use of personal information",
    "수집 항목: 이름, 기수, 연락처(휴대폰·이메일), 소속·경력, 근황.": "Items collected: name, cohort, contact (mobile, email), affiliation and career, updates.",
    "이용 목적: KAIST MR 40주년 기념 동문 주소록 작성 및 행사 운영.": "Purpose: building the KAIST MR 40th anniversary alumni directory and running the event.",
    "보유 · 이용 기간: 행사 운영 종료 후 파기 (동문 주소록은 회칙에 따라 보관).": "Retention: deleted after the event (the alumni directory is kept per club bylaws).",
    "동의를 거부하실 수 있으며, 이 경우 주소록 등재가 제한됩니다.": "You may decline, in which case you can't be listed in the directory.",
    "위 개인정보 수집 · 이용에 동의합니다.": "I agree to the collection and use described above.",
    "보내기": "Submit", "보내는 중…": "Sending…",
    "근황이 접수됐습니다. 감사합니다!": "Your update has been received. Thank you!",
    "입력하신 내용은 주소록에 반영됩니다.": "Your entry will be reflected in the directory.",
    "주소록으로 돌아가기": "Back to the directory",
    "기수와 이름을 입력하세요.": "Please enter your cohort and name.",
    "기록을 불러왔어요. 아래에서 고친 뒤": "— record loaded. Edit below and press", "를 눌러 주세요.": ".",
    "기존 기록이 없어요. 아래에 새로 작성해 주세요.": "No existing record found. Please fill in the form below.",
    "불러오지 못했습니다. 잠시 후 다시 시도하거나 아래에 직접 작성해 주세요.": "Could not load. Try again shortly or fill in the form below.",
    "개인정보 수집·이용에 동의해 주세요.": "Please agree to the collection and use of personal information.",
    "기수와 이름은 필수입니다.": "Cohort and name are required.",
    "제출에 실패했습니다. 잠시 후 다시 시도해 주세요.": "Submission failed. Please try again shortly."
  };

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEKDAYS = { "일": "Sun", "월": "Mon", "화": "Tue", "수": "Wed", "목": "Thu", "금": "Fri", "토": "Sat" };

  /* 숫자·이름이 섞여 사전으로 못 잡는 문구. [정규식, 치환문자열 | 함수(match...)] */
  var RULES = [
    [/^(\d{4})년 (\d{1,2})월 (\d{1,2})일(.*)$/, function (_, y, mo, d, rest) {
      return MONTHS[mo - 1] + " " + d + ", " + y + rest
        .replace(/\((일|월|화|수|목|금|토)\)/, function (_, w) { return "(" + WEEKDAYS[w] + ")"; })
        .replace("기념행사", "celebration");
    }],
    [/^(\d{4})년대$/, "$1s"],
    [/^(\d{4})년 홈페이지$/, "$1 website"],
    [/^(\d+)명 검색됨 \(전체 (\d+)명\)$/, "$1 found (of $2)"],
    [/^총 (\d+)명$/, "$1 members"],
    [/^현재까지 (\d+)명 참석 예정입니다\.$/, "$1 people are attending so far."],
    [/^(.+) \(새 창\)$/, function (_, s) { return tr(s.replace(/ ↗ 새 창$/, "")) + " (new tab)"; }],
    [/^(.+)으로 필터$/, "Filter by $1"],
    [/^(.+)에게 전화$/, "Call $1"],
    [/^(.+) 복사됨$/, function (_, w) { return tr(w) + " copied"; }],
    [/^MR (.+) 사진$/, function (_, y) { return "MR photo, " + tr(y); }],
    [/^(.+) 대표 사진$/, "Photo, $1"],
    [/^(.+) 표지$/, function (_, w) { return tr(w) + " cover"; }],
    [/^전화 (.+)$/, "Call $1"],
    [/^결제 확인은 준비위원회가 신청서와 대조해 진행합니다\.(.*)$/, "The committee confirms payments against the registration forms.$1"],
    [/^참가비 (.+) · 신청과 결제를 이벤터스에서 한 번에 진행합니다\.$/, function (_, fee) {
      return "Fee " + fee.split(" / ").map(tr).join(" / ") + " · registration and payment are handled together on Eventus.";
    }],
    [/^참가비 (.+) · 결제자명은 신청자 이름과 같게 입력해 주세요\.$/, function (_, fee) {
      return "Fee " + fee.split(" / ").map(tr).join(" / ") + " · please pay under the same name you registered with.";
    }],
    // "🧥 동잠 주문"처럼 아이콘 + 문구가 한 텍스트 노드일 때
    [/^(\S+) (.*[가-힣].*)$/, function (_, icon, rest) { var v = lookup(rest); return v == null ? null : icon + " " + v; }],
    [/(\d+)학번/, function (m) { return m.replace(/(\d+)학번/g, "Cohort $1"); }]
  ];

  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  var HANGUL = /[가-힣]/;

  // 번역 결과 또는 null(사전에 없음)
  function lookup(s) {
    var k = norm(s);
    if (!HANGUL.test(k)) return null;
    if (Object.prototype.hasOwnProperty.call(DICT, k)) return DICT[k];
    for (var i = 0; i < RULES.length; i++) {
      var m = k.match(RULES[i][0]);
      if (!m) continue;
      var out = typeof RULES[i][1] === "function" ? RULES[i][1].apply(null, m) : k.replace(RULES[i][0], RULES[i][1]);
      if (out != null) return out;
    }
    return null;
  }
  function tr(s) { var v = lookup(s); return v == null ? s : v; }

  var query = new URLSearchParams(location.search).get("lang");
  var lang = "ko";
  try {
    if (query === "en" || query === "ko") { lang = query; localStorage.setItem("mr40_lang", query); }
    else lang = localStorage.getItem("mr40_lang") === "en" ? "en" : "ko";
  } catch (e) {}

  var missing = {};
  var ATTRS = ["title", "aria-label", "placeholder", "alt", "content"];

  function fixText(node) {
    var v = node.nodeValue;
    if (!HANGUL.test(v)) return;
    var p = node.parentElement;
    if (p && p.closest('script,style,[translate="no"]')) return;
    var en = lookup(v);
    if (en == null) { missing[norm(v)] = 1; return; }
    node.nodeValue = v.replace(/^(\s*)([\s\S]*?)(\s*)$/, function (_, a, __, c) { return a + en + c; });
  }
  function fixAttr(el, name) {
    if (name === "content" && el.tagName !== "META") return;
    var v = el.getAttribute(name);
    if (v == null || !HANGUL.test(v)) return;
    var en = lookup(v);
    if (en == null) { missing[norm(v)] = 1; return; }
    el.setAttribute(name, en);
  }
  function walk(node) {
    if (node.nodeType === 3) { fixText(node); return; }
    if (node.nodeType === 1) {
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.getAttribute("translate") === "no") return;
      for (var i = 0; i < ATTRS.length; i++) if (node.hasAttribute(ATTRS[i])) fixAttr(node, ATTRS[i]);
    } else if (node.nodeType !== 9 && node.nodeType !== 11) return;
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  function addToggle() {
    var actions = document.querySelector(".topnav .nav-actions");
    if (!actions || actions.querySelector(".lang-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-toggle";
    btn.setAttribute("aria-label", "Language");
    btn.setAttribute("translate", "no");
    btn.textContent = lang === "en" ? "한국어" : "EN";
    btn.addEventListener("click", function () {
      try { localStorage.setItem("mr40_lang", lang === "en" ? "ko" : "en"); } catch (e) {}
      var u = new URL(location.href); u.searchParams.delete("lang");
      history.replaceState(null, "", u.href);
      location.reload();
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  if (lang === "en") {
    document.documentElement.lang = "en";
    // 파싱 중 추가되는 노드와 이후 JS가 그리는 내용 모두 여기서 잡는다
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        if (r.type === "characterData") fixText(r.target);
        else if (r.type === "attributes") fixAttr(r.target, r.attributeName);
        else for (var i = 0; i < r.addedNodes.length; i++) walk(r.addedNodes[i]);
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  document.addEventListener("DOMContentLoaded", function () {
    if (lang === "en") walk(document);
    addToggle();
  });

  window.I18N = { lang: lang, t: function (s) { return lang === "en" ? tr(s) : s; }, missing: function () { return Object.keys(missing); } };
})();
