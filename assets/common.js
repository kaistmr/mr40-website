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
    ["stats.html", "통계"], ["event.html", "행사안내"],
  ];
  const links = items.map(([href, label]) =>
    `<a href="${escapeHtml(href)}" class="nav-link${escapeHtml(href) === escapeHtml(active) ? " active" : ""}">${escapeHtml(label)}</a>`).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <nav class="topnav">
      <a href="index.html" class="logo" aria-label="MR40 처음으로"><img class="logo-mark" src="assets/logos/mr_logo_2026.png" alt="" />MR<span>40</span></a>
      <div class="nav-actions">
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="메뉴">☰</button>
      </div>
      <div class="nav-links" id="primary-nav">${links}</div>
    </nav>`);

  const nav = document.querySelector(".topnav");
  const menuButton = nav.querySelector(".nav-toggle");

  menuButton.addEventListener("click", function () {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });


  const utility = document.createElement("div");
  utility.className = "page-utilities";
  utility.innerHTML =
    '<button class="back-to-top" type="button" aria-label="맨 위로">↑ 맨 위로</button>';
  document.body.appendChild(utility);
  utility.querySelector(".back-to-top").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("scroll", function () {
    utility.querySelector(".back-to-top").classList.toggle("visible", window.scrollY > 600);
  }, { passive: true });
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
    const separator = url.indexOf("?") === -1 ? "?" : "&";
    const res = await fetch(url + separator + "t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const rows = (await res.text()).split(/\r?\n/).slice(1)
      .map(parseCsvLine).filter((r) => r.length > 1 && r[0]);
    localStorage.setItem(cacheKey, JSON.stringify(rows));
    render(rows);
  } catch (e) { if (!cached && onFail) onFail("fetch-error"); }
}

// 헤더 행을 키로 사용하는 운영 시트 로더.
async function loadSheetObjects(url, cacheKey, render, onFail) {
  const cached = localStorage.getItem(cacheKey);
  if (cached) { try { render(JSON.parse(cached)); } catch (e) {} }
  if (!url) { if (!cached && onFail) onFail("not-configured"); return; }
  try {
    const separator = url.indexOf("?") === -1 ? "?" : "&";
    const res = await fetch(url + separator + "t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const lines = (await res.text()).split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(lines.shift() || "");
    const rows = lines.map(parseCsvLine).map(function (values) {
      const item = {};
      headers.forEach(function (key, index) { item[key.trim()] = values[index] || ""; });
      return item;
    }).filter(function (item) { return Object.values(item).some(Boolean); });
    localStorage.setItem(cacheKey, JSON.stringify(rows));
    render(rows);
  } catch (e) { if (!cached && onFail) onFail("fetch-error"); }
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, location.href);
    return /^(https?:|tel:|sms:|mailto:)$/.test(url.protocol) ? url.href : "";
  } catch (e) { return ""; }
}

async function shareCurrentPage() {
  const data = { title: document.title, text: document.querySelector('meta[name="description"]')?.content || "", url: location.href };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(location.href);
    showToast("주소를 복사했습니다.");
  } catch (e) {
    window.prompt("주소를 복사해 주세요.", location.href);
  }
}

function enhanceCommonContent() {
  document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
    if (link.querySelector(".new-window-note")) return;
    const note = document.createElement("span");
    note.className = "new-window-note";
    note.textContent = " ↗ 새 창";
    link.appendChild(note);
    const label = link.getAttribute("aria-label") || link.textContent.trim();
    link.setAttribute("aria-label", label + " (새 창)");
  });
  document.querySelectorAll(".site-footer").forEach(function (footer) {
    if (footer.querySelector(".footer-home")) return;
    const p = document.createElement("p");
    p.className = "footer-home";
    p.innerHTML = '<a href="index.html">← 처음으로</a>';
    footer.insertBefore(p, footer.firstChild);
    if (CONFIG.CONTACT && !footer.querySelector(".footer-contact")) {
      const channels = [];
      if (safeUrl(CONFIG.CONTACT.openChat)) {
        channels.push('<a href="' + escapeHtml(safeUrl(CONFIG.CONTACT.openChat)) +
          '" target="_blank" rel="noopener">문의 오픈채팅</a>');
      }
      if (CONFIG.CONTACT.email && safeUrl("mailto:" + CONFIG.CONTACT.email)) {
        channels.push('<a href="' + escapeHtml(safeUrl("mailto:" + CONFIG.CONTACT.email)) +
          '">' + escapeHtml(CONFIG.CONTACT.email) + '</a>');
      }
      if (channels.length) {
        const contact = document.createElement("p");
        contact.className = "footer-contact";
        contact.innerHTML = channels.join(" · ");
        footer.insertBefore(contact, footer.firstChild);
      }
    }
  });

  const noticeUrl = CONFIG.OPS_SHEETS && CONFIG.OPS_SHEETS.notices;
  if (noticeUrl && !document.querySelector(".site-notice")) {
    loadSheetObjects(noticeUrl, "mr40_ops_notices", function (rows) {
      const now = Date.now();
      const notice = rows.find(function (item) {
        const active = !item.active || /^(1|true|yes|y|공개)$/i.test(item.active);
        const afterStart = !item.starts_at || new Date(item.starts_at).getTime() <= now;
        const beforeEnd = !item.ends_at || new Date(item.ends_at).getTime() >= now;
        return active && afterStart && beforeEnd;
      });
      if (!notice || document.querySelector(".site-notice")) return;
      const bar = document.createElement("aside");
      bar.className = "site-notice";
      bar.setAttribute("aria-label", "공지");
      const href = safeUrl(notice.link);
      bar.innerHTML = '<strong>' + escapeHtml(notice.title || "공지") + '</strong> ' +
        '<span>' + escapeHtml(notice.body || "") + '</span>' +
        (href ? ' <a href="' + escapeHtml(href) + '">' + escapeHtml(notice.label || "자세히") + '</a>' : "");
      document.body.insertBefore(bar, document.body.firstChild.nextSibling);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceCommonContent);
} else {
  enhanceCommonContent();
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
