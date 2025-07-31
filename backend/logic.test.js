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

test("collects when standing on a point", () => {
  const state = {
    ...baseState,
    points: [{ x: 1, y: 1 }],
  };
  const res = decideMove(state);
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
  expect(res.action).not.toBe("ATTACK");
});

test("should NOT move LEFT when point is RIGHT", () => {
  const state = {
    ...baseState,
    points: [{ x: 2, y: 1 }],
  };
  expect(decideMove(state)).toEqual({ move: "LEFT", action: "COLLECT" }); // Faux exprès
});


test("should not bomb if no bombs left", () => {
  const state = {
    ...baseState,
    you: { id: "bot", x: 1, y: 1, bombs: 0 },
    otherBots: [{ id: "enemy", x: 1, y: 2 }],
  };
  const res = decideMove(state);
  expect(res.action).not.toBe("BOMB");
});

test("should not move outside the grid", () => {
  const state = {
    ...baseState,
    you: { id: "bot", x: 0, y: 0, bombs: 3 },
    points: [{ x: -1, y: 0 }], // Hors grille
    grid: [
      [{}, {}, {}],
      [{}, {}, {}],
      [{}, {}, {}],
    ],
  };
  const res = decideMove(state);
  expect(res.move).not.toBe("LEFT"); // On ne peut pas aller à gauche
});