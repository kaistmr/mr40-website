// 공통 유틸 — 모든 페이지에서 <script src="assets/common.js"> 로 로드

// XSS 방어용 HTML 이스케이프 헬퍼
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// [1] 상단 네비게이션 주입
function injectNav(active) {
  const items = [
    ["index.html", "홈"], ["timeline.html", "연혁"], ["members.html", "주소록"],
    ["gallery.html", "사진관"], ["magazine.html", "회지"], ["archive.html", "옛홈피"],
    ["guestbook.html", "방명록"], ["event.html", "행사안내"],
  ];
  const links = items.map(([href, label]) =>
    `<a href="${escapeHtml(href)}" class="nav-link${escapeHtml(href) === escapeHtml(active) ? " active" : ""}">${escapeHtml(label)}</a>`).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <nav class="topnav">
      <a href="index.html" class="logo">MR<span>40</span></a>
      <button class="nav-toggle" onclick="this.parentElement.classList.toggle('open')">☰</button>
      <div class="nav-links">${links}</div>
    </nav>`);
}

// [2] CSV 한 줄 파서 (따옴표 내 쉼표 처리)
function parseCsvLine(line) {
  return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
             .map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
}

// [3] 시트 CSV 로드: localStorage 캐시 우선 표시 + 백그라운드 갱신
//     render(rows)는 헤더 제외 행 배열(각 행은 문자열 배열)을 받는다.
//     주의: render는 캐시+갱신으로 두 번 호출될 수 있으므로 매번 컨테이너를 초기화하고 그려야 한다.
async function loadSheet(url, cacheKey, render, onFail) {
  const cached = localStorage.getItem(cacheKey);
  if (cached) { try { render(JSON.parse(cached)); } catch (e) {} }
  if (!url) { if (!cached && onFail) onFail("not-configured"); return; }
  try {
    const res = await fetch(url + "&t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const rows = (await res.text()).split(/\r?\n/).slice(1)
      .map(parseCsvLine).filter((r) => r.length > 1 && r[0]);
    localStorage.setItem(cacheKey, JSON.stringify(rows));
    render(rows);
  } catch (e) { if (!cached && onFail) onFail("fetch-error"); }
}

// [4] 토스트
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  clearTimeout(t._timer);
  t.textContent = msg; t.className = "show";
  t._timer = setTimeout(() => (t.className = ""), 2500);
}

// [5] SHA-256 해시 (주소록 접속 코드 검증용)
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// [6] 주제가 플레이어 — 전 페이지 공통
// 재생 위치를 localStorage에 저장해 페이지를 옮겨도 이어 듣는다.
// (브라우저 자동재생 정책상 새 페이지에서는 첫 클릭/터치 때 이어 붙는다)
(function () {
  const SRC = "assets/audio/달리는_마우스.mp3";
  const OFF_KEY = "mr40_music_off";
  const POS_KEY = "mr40_music_pos";

  function init() {
    const audio = document.createElement("audio");
    audio.src = SRC;
    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0.55;

    const fab = document.createElement("button");
    fab.className = "music-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "주제가 재생/정지");
    fab.innerHTML =
      '<span class="eq" aria-hidden="true"><span></span><span></span><span></span></span>' +
      '<span class="music-title">♪ 달리는 마우스</span>';
    document.body.appendChild(audio);
    document.body.appendChild(fab);

    function setUi(playing) { fab.classList.toggle("playing", playing); }

    function start() {
      audio.play().then(() => setUi(true)).catch(() => {});
    }

    // 저장된 위치에서 이어 재생
    audio.addEventListener("loadedmetadata", () => {
      const pos = parseFloat(localStorage.getItem(POS_KEY) || "0");
      if (pos > 0 && pos < audio.duration) audio.currentTime = pos;
    });

    // 위치 저장 (재생 중 주기적으로 + 페이지 이탈 시)
    audio.addEventListener("timeupdate", () => {
      if (!audio.paused) localStorage.setItem(POS_KEY, String(audio.currentTime));
    });
    window.addEventListener("pagehide", () => {
      if (!audio.paused) localStorage.setItem(POS_KEY, String(audio.currentTime));
    });

    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      if (audio.paused) {
        localStorage.removeItem(OFF_KEY);
        start();
      } else {
        localStorage.setItem(OFF_KEY, "1");
        audio.pause();
        setUi(false);
      }
    });

    // 끈 적 없으면 자동재생 시도 → 막히면 첫 상호작용 때 시작
    if (!localStorage.getItem(OFF_KEY)) {
      start();
      const unlock = () => {
        if (audio.paused && !localStorage.getItem(OFF_KEY)) start();
        document.removeEventListener("click", unlock);
        document.removeEventListener("touchstart", unlock);
        document.removeEventListener("keydown", unlock);
      };
      document.addEventListener("click", unlock);
      document.addEventListener("touchstart", unlock);
      document.addEventListener("keydown", unlock);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
