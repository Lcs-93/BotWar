const request = require('supertest');
const app = require('./server');

describe('manual command API', () => {
  beforeEach(async () => {
    await request(app).get('/action');
  });

  test('returns default command', async () => {
    const res = await request(app).get('/action');
    expect(res.body).toEqual({ move: 'STAY', action: 'NONE' });
  });

  test('stores command and resets after retrieval', async () => {
    await request(app).get('/command').query({ move: 'UP', action: 'COLLECT' });
    let res = await request(app).get('/action');
    expect(res.body).toEqual({ move: 'UP', action: 'COLLECT' });
    res = await request(app).get('/action');
    expect(res.body).toEqual({ move: 'STAY', action: 'NONE' });
  });

  test('handles bomb types', async () => {
    await request(app)
      .get('/command')
      .query({ move: 'LEFT', action: 'BOMB', bombType: 'proximity' });
    let res = await request(app).get('/action');
    expect(res.body).toEqual({ move: 'LEFT', action: 'BOMB', bombType: 'proximity' });

    await request(app)
      .get('/command')
      .query({ move: 'RIGHT', action: 'BOMB', bombType: 'timer' });
    res = await request(app).get('/action');
    expect(res.body).toEqual({ move: 'RIGHT', action: 'BOMB', bombType: 'timer' });
  });
});
