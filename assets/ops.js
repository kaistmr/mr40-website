// 운영 시트 공통 접근 계층. 각 탭은 config.js의 OPS_SHEETS URL로 연결한다.
(function () {
  "use strict";

  var memory = {};

  function rows(name) {
    if (memory[name]) return memory[name];
    var key = "mr40_ops_" + name;
    var url = CONFIG.OPS_SHEETS && CONFIG.OPS_SHEETS[name];
    var cached = [];
    try { cached = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
    if (!url) {
      localStorage.removeItem(key);
      memory[name] = Promise.resolve([]);
      return memory[name];
    }
    var separator = url.indexOf("?") === -1 ? "?" : "&";
    memory[name] = fetch(url + separator + "t=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(function (text) {
        var lines = text.split(/\r?\n/).filter(Boolean);
        var headers = parseCsvLine(lines.shift() || "");
        var result = lines.map(parseCsvLine).map(function (values) {
          var item = {};
          headers.forEach(function (header, index) { item[header.trim()] = values[index] || ""; });
          return item;
        }).filter(function (item) {
          return Object.keys(item).some(function (keyName) { return item[keyName]; });
        });
        localStorage.setItem(key, JSON.stringify(result));
        return result;
      })
      .catch(function () { return cached; });
    return memory[name];
  }

  function active(item) {
    return !item || !item.active || /^(1|true|yes|y|공개)$/i.test(item.active);
  }

  function eventMap(items) {
    return (items || []).reduce(function (result, item) {
      if (item.key) {
        var key = item.key.trim();
        var value = (item.value || "").trim();
        result[key] = result[key] && value ? result[key] + "\n" + value : value;
      }
      return result;
    }, {});
  }

  function lines(value) {
    if (Array.isArray(value)) {
      return value.map(String).map(function (item) { return item.trim(); }).filter(Boolean);
    }
    return String(value || "").split(/\r?\n/).map(function (item) {
      return item.trim();
    }).filter(Boolean);
  }

  function program(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return {
          time: String(item.time || "").trim(),
          what: String(item.what || "").trim(),
          note: String(item.note || "").trim(),
        };
      }).filter(function (item) { return item.time || item.what || item.note; });
    }
    return lines(value).map(function (line) {
      var parts = line.split("|");
      return {
        time: (parts[0] || "").trim(),
        what: (parts[1] || "").trim(),
        note: parts.slice(2).join("|").trim(),
      };
    }).filter(function (item) { return item.time || item.what || item.note; });
  }

  function number(value, fallback) {
    var parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  window.MR40Ops = {
    rows: rows,
    active: active,
    eventMap: eventMap,
    lines: lines,
    program: program,
    number: number,
  };
})();
