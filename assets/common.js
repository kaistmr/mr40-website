// 공통 유틸 — 모든 페이지에서 <script src="assets/common.js"> 로 로드
// [1] 상단 네비게이션 주입
function injectNav(active) {
  const items = [
    ["index.html", "홈"], ["timeline.html", "연혁"], ["members.html", "주소록"],
    ["gallery.html", "사진관"], ["magazine.html", "회지"], ["guestbook.html", "방명록"],
    ["event.html", "행사안내"],
  ];
  const links = items.map(([href, label]) =>
    `<a href="${href}" class="nav-link${href === active ? " active" : ""}">${label}</a>`).join("");
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
async function loadSheet(url, cacheKey, render, onFail) {
  const cached = localStorage.getItem(cacheKey);
  if (cached) { try { render(JSON.parse(cached)); } catch (e) {} }
  if (!url) { if (!cached && onFail) onFail("not-configured"); return; }
  try {
    const res = await fetch(url + "&t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const rows = (await res.text()).split("\n").slice(1)
      .map(parseCsvLine).filter((r) => r.length > 1 && r[0]);
    localStorage.setItem(cacheKey, JSON.stringify(rows));
    render(rows);
  } catch (e) { if (!cached && onFail) onFail("fetch-error"); }
}

// [4] 토스트
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.innerText = msg; t.className = "show";
  setTimeout(() => (t.className = ""), 2500);
}

// [5] SHA-256 해시 (주소록 접속 코드 검증용)
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
