const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
const CONFIG = new Function(src + "; return CONFIG;")();

const ids = CONFIG.SURVEYS.map((s) => s.id);
assert.ok(!ids.includes("voice"), "voice 설문은 방명록으로 흡수되어 제거되어야 함");
assert.ok(ids.includes("jacket"), "jacket(동잠) 설문이 있어야 함");
assert.ok(ids.includes("contact"), "contact 설문이 있어야 함");

const attend = CONFIG.SURVEYS.find((s) => s.id === "attend");
assert.equal(attend.active, false, "참석 조사는 이벤터스 전환으로 active:false 여야 함");

for (const id of ["jacket", "contact"]) {
  const s = CONFIG.SURVEYS.find((x) => x.id === id);
  for (const key of ["id", "icon", "title", "desc", "url", "active", "prefill_generation_key"]) {
    assert.ok(key in s, `${id} 항목에 ${key} 필드가 있어야 함`);
  }
}

assert.ok(!/mosw626/i.test(CONFIG.SITE_URL), "SITE_URL에 옛 개인 레포(mosw626)가 남아있으면 안 됨");
assert.ok(/kaistmr\.github\.io/.test(CONFIG.SITE_URL), "SITE_URL은 kaistmr 주소여야 함");

console.log("config surveys OK:", ids.join(","));
