const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const storage = new Map();
const context = {
  CONFIG: { OPS_SHEETS: {} },
  window: {},
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, value); },
    removeItem(key) { storage.delete(key); },
  },
  fetch() { throw new Error("fetch should not run without a configured URL"); },
  parseCsvLine(line) { return line.split(","); },
  console,
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "assets", "ops.js"), "utf8"),
  context,
);

const ops = context.window.MR40Ops;

assert.deepEqual(
  Array.from(ops.lines("크리스탈볼룸\n루비룸")),
  ["크리스탈볼룸", "루비룸"],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(ops.program("15:00|개회|인사\n16:00|토크|80분"))),
  [
    { time: "15:00", what: "개회", note: "인사" },
    { time: "16:00", what: "토크", note: "80분" },
  ],
);
assert.equal(
  ops.eventMap([
    { key: "fee", value: "성인 10만원" },
    { key: "fee", value: "학부생 5만원" },
  ]).fee,
  "성인 10만원\n학부생 5만원",
);

storage.set("mr40_ops_event", JSON.stringify([{ key: "place", value: "예전 장소" }]));
ops.rows("event").then((rows) => {
  assert.deepEqual(Array.from(rows), []);
  assert.equal(storage.has("mr40_ops_event"), false);
  console.log("ops.js tests passed");
});
