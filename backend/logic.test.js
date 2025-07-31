const { decideMove } = require("./logic");

const baseState = {
  you: { id: "bot", x: 1, y: 1, bombs: 3 },
  otherBots: [],
  points: [],
};

test("attacks adjacent enemy", () => {
  const state = {
    ...baseState,
    otherBots: [{ id: "enemy", x: 1, y: 2 }],
  };
  expect(decideMove(state)).toEqual({ move: "DOWN", action: "ATTACK" });
});

test("collects adjacent point", () => {
  const state = {
    ...baseState,
    points: [{ x: 2, y: 1 }],
  };
  expect(decideMove(state)).toEqual({ move: "RIGHT", action: "COLLECT" });
});

test("drops bomb when enemy nearby", () => {
  const state = {
    ...baseState,
    you: { id: "bot", x: 1, y: 1, bombs: 1 },
    otherBots: [{ id: "enemy", x: 1, y: 3 }],
  };
  expect(decideMove(state)).toEqual({ move: "STAY", action: "BOMB", bombType: "proximity" });
});

