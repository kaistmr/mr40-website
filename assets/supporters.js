// 후원사 벽 — 첫 화면(index)과 후원 페이지(donate)가 함께 쓴다.
// 데이터: 운영 시트 sponsors 탭 → 없으면 data/supporters.json
// 항목: { tier: "PLATINUM"|"GOLD"|"SILVER", name, logo, url } / 동문: { kind: "person", name }
(function () {
  var TIERS = ["PLATINUM", "GOLD", "SILVER"];

  function load() {
    var fromSheet = window.MR40Ops ? MR40Ops.rows("sponsors").then(function (items) {
      return items.filter(MR40Ops.active).sort(function (a, b) { return MR40Ops.number(a.sort, 0) - MR40Ops.number(b.sort, 0); });
    }) : Promise.resolve([]);
    return fromSheet.then(function (items) {
      if (items.length) return items;
      return fetch("data/supporters.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    }).catch(function () { return []; });
  }

  function card(s) {
    var inner = s.logo
      ? '<img src="' + escapeHtml(s.logo) + '" alt="' + escapeHtml(s.name || "") + '" loading="lazy">'
      : '<span class="sw-text">' + escapeHtml(s.name || "") + "</span>";
    return s.url
      ? '<a class="sw-logo" href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + inner + "</a>"
      : '<div class="sw-logo">' + inner + "</div>";
  }

  function render(el, items) {
    var people = items.filter(function (s) { return s.kind === "person"; });
    var orgs = items.filter(function (s) { return s.kind !== "person"; });
    if (!orgs.length && !people.length) {
      el.innerHTML = '<p class="sw-empty">후원해 주실 분들을 기다리고 있습니다.</p>';
      return;
    }
    var html = TIERS.map(function (t) {
      var list = orgs.filter(function (s) { return String(s.tier || "SILVER").toUpperCase() === t; });
      return list.length
        ? '<div class="sw-tier sw-' + t.toLowerCase() + '"><p class="sw-label">' + t + '</p><div class="sw-row">' + list.map(card).join("") + "</div></div>"
        : "";
    }).join("");
    if (people.length) {
      html += '<div class="sw-tier sw-people"><p class="sw-label">동문 후원</p><p class="sw-names">' +
        people.map(function (s) { return "<span>" + escapeHtml(s.name) + "</span>"; }).join("") +
        '</p><p class="sw-anon">이름을 밝히지 않고 후원해 주신 선배님들께도 감사드립니다.</p></div>';
    }
    el.innerHTML = html;
  }

  window.renderSponsorWall = function (el) {
    if (el) load().then(function (items) { render(el, items); });
  };
})();
