const request = require("supertest");
const app = require("./server");

describe("BotWar /action API", () => {
  test("returns default command if no query is provided", async () => {
    const res = await request(app).get("/action");
    expect(res.body).toEqual({ move: "STAY", action: "NONE" });
  });

  test("returns provided move and action", async () => {
    const res = await request(app)
      .get("/action")
      .query({ move: "UP", action: "COLLECT" });

    expect(res.body).toEqual({ move: "UP", action: "COLLECT" });
  });

  test("includes bombType only when action is BOMB", async () => {
    const res = await request(app)
      .get("/action")
      .query({ move: "LEFT", action: "BOMB", bombType: "proximity" });

    expect(res.body).toEqual({
      move: "LEFT",
      action: "BOMB",
      bombType: "proximity"
    });
  });

  test("defaults bombType to proximity if not provided", async () => {
    const res = await request(app)
      .get("/action")
      .query({ move: "RIGHT", action: "BOMB" });

    expect(res.body).toEqual({
      move: "RIGHT",
      action: "BOMB",
      bombType: "proximity"
    });
  });

  test("does not include bombType if action is not BOMB", async () => {
    const res = await request(app)
      .get("/action")
      .query({ move: "DOWN", action: "ATTACK" });

    expect(res.body).toEqual({
      move: "DOWN",
      action: "ATTACK"
    });
  });
});
