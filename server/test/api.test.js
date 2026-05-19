import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createToken } from '../src/auth.js';
import { createApp } from '../src/app.js';

function buildStore() {
  const users = [
    {
      id: 1,
      username: 'demo',
      passwordHash: bcrypt.hashSync('demo1234', 10),
      createdAt: '2025-01-01T00:00:00.000Z'
    }
  ];

  const cards = [
    {
      id: 1,
      name: 'Ember Drake',
      type: 'Creature',
      rarity: 'Rare',
      attack: 7,
      defense: 5,
      description: 'A fire-breathing dragon.',
      imageUrl: 'https://example.com/ember.jpg',
      ownerId: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    }
  ];

  let nextUserId = 2;
  let nextCardId = 2;

  return {
    async getUserByUsername(username) {
      return users.find((user) => user.username.toLowerCase() === String(username).toLowerCase()) || null;
    },
    async getUserById(id) {
      return users.find((user) => user.id === Number(id)) || null;
    },
    async createUser(user) {
      const created = { ...user, id: nextUserId++ };
      users.push(created);
      return created;
    },
    async listCards() {
      return [...cards].sort((left, right) => right.id - left.id);
    },
    async getCardById(id) {
      return cards.find((card) => card.id === Number(id)) || null;
    },
    async createCard(card) {
      const created = { ...card, id: nextCardId++ };
      cards.push(created);
      return created;
    },
    async updateCard(id, updates) {
      const card = cards.find((entry) => entry.id === Number(id));
      if (!card) {
        return null;
      }

      Object.assign(card, updates);
      return card;
    },
    async deleteCard(id) {
      const index = cards.findIndex((entry) => entry.id === Number(id));
      if (index >= 0) {
        cards.splice(index, 1);
      }
    }
  };
}

test('health endpoint works', async () => {
  const app = createApp(buildStore());
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true, service: 'collectible-card-game-api' });
});

test('register validates input', async () => {
  const app = createApp(buildStore());
  const response = await request(app).post('/api/auth/register').send({ username: 'ab', password: 'short' });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.message, 'Validation failed.');
  assert.ok(Array.isArray(response.body.details));
});

test('register and login return tokens', async () => {
  const store = buildStore();
  const app = createApp(store);

  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ username: 'player1', password: 'supersecret' });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.status, 'success');
  assert.ok(registerResponse.body.token);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'demo', password: 'demo1234' });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.status, 'success');
  assert.ok(loginResponse.body.token);
});

test('protected card routes require auth', async () => {
  const app = createApp(buildStore());
  const response = await request(app).get('/api/cards');

  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing bearer token.');
});

test('card workflow respects ownership', async () => {
  const store = buildStore();
  const app = createApp(store);
  const token = createToken({ id: 1, username: 'demo' });

  const listResponse = await request(app)
    .get('/api/cards')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.cards.length, 1);

  const createResponse = await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Moon Archer',
      type: 'Creature',
      rarity: 'Common',
      attack: 2,
      defense: 1,
      description: 'A fast ranged unit.',
      imageUrl: 'https://example.com/moon.jpg'
    });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.card.ownerId, 1);

  const forbiddenResponse = await request(app)
    .put('/api/cards/1')
    .set('Authorization', `Bearer ${createToken({ id: 2, username: 'other' })}`)
    .send({ name: 'New Name' });

  assert.equal(forbiddenResponse.status, 403);
  assert.equal(forbiddenResponse.body.message, 'You can only edit cards you created.');
});
