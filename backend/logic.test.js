const { decideMove } = require("./logic");

const baseState = {
  you: { id: "bot", x: 1, y: 1, bombs: 3 },
  otherBots: [],
  points: [],
};

function logDecision(testName, state, result) {
  console.log("\n🔍 Test:", testName);
  console.log("📥 État reçu:", JSON.stringify(state, null, 2));
  console.log("📤 Décision prise:", result);
}

test("attacks adjacent enemy", () => {
  const state = {
    ...baseState,
    otherBots: [{ id: "enemy", x: 1, y: 2 }],
  };
  const res = decideMove(state);
  logDecision("attacks adjacent enemy", state, res);
  expect(res).toEqual({ move: "DOWN", action: "ATTACK" });
});

test("collects adjacent point", () => {
  const state = {
    ...baseState,
    points: [{ x: 2, y: 1 }],
  };
  const res = decideMove(state);
  logDecision("collects adjacent point", state, res);
  expect(res).toEqual({ move: "RIGHT", action: "COLLECT" });
});

test("drops bomb when enemy nearby", () => {
  const state = {
    ...baseState,
    you: { id: "bot", x: 1, y: 1, bombs: 1 },
    otherBots: [{ id: "enemy", x: 1, y: 3 }],
  };
  const res = decideMove(state);
  logDecision("drops bomb when enemy nearby", state, res);
  expect(res).toEqual({ move: "STAY", action: "BOMB", bombType: "proximity" });
});

test("collects when standing on a point", () => {
  const state = {
    ...baseState,
    points: [{ x: 1, y: 1 }],
  };
  const res = decideMove(state);
  logDecision("collects when standing on a point", state, res);
  expect(res.action).toBe("COLLECT");
});

test("avoids moving onto a timer bomb", () => {
  const state = {
    ...baseState,
    points: [{ x: 1, y: 2 }],
    grid: [
      [{}, {}, {}],
      [{}, {}, {}],
      [{}, { bombs: [{ bombType: "timer", timer: 1 }] }, {}],
    ],
  };
  const res = decideMove(state);
  logDecision("avoids moving onto a timer bomb", state, res);
  expect(res.move).not.toBe("DOWN");
});

test("moves randomly when no targets", () => {
  const state = {
    ...baseState,
    grid: [
      [{}, {}, {}],
      [{}, {}, {}],
      [{}, {}, {}],
    ],
    points: [],
  };
  const res = decideMove(state);
  logDecision("moves randomly when no targets", state, res);
  expect(["UP", "DOWN", "LEFT", "RIGHT", "STAY"]).toContain(res.move);
});

test("does not attack if enemy is on bomb", () => {
  const state = {
    ...baseState,
    otherBots: [{ id: "enemy", x: 1, y: 2 }],
    grid: [
      [{}, {}, {}],
      [{}, {}, {}],
      [{}, { bombs: [{ bombType: "static" }] }, {}],
    ],
  };
  const res = decideMove(state);
  logDecision("does not attack if enemy is on bomb", state, res);
  expect(res.action).not.toBe("ATTACK");
});

test("should not bomb if no bombs left", () => {
  const state = {
    ...baseState,
    you: { id: "bot", x: 1, y: 1, bombs: 0 },
    otherBots: [{ id: "enemy", x: 1, y: 2 }],
  };
  const res = decideMove(state);
  logDecision("should not bomb if no bombs left", state, res);
  expect(res.action).not.toBe("BOMB");
});

test("should not move outside the grid", () => {
  const state = {
    ...baseState,
    you: { id: "bot", x: 0, y: 0, bombs: 3 },
    points: [{ x: -1, y: 0 }],
    grid: [
      [{}, {}, {}],
      [{}, {}, {}],
      [{}, {}, {}],
    ],
  };
  const res = decideMove(state);
  logDecision("should not move outside the grid", state, res);
  expect(res.move).not.toBe("LEFT");
});
