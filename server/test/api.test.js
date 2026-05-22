import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import { createToken } from '../src/auth.js';
import app from '../src/app.js';

await import('../src/seed.js');

test('auth endpoints work with seeded data', async () => {
  const healthResponse = await request(app).get('/api/health');

  assert.equal(healthResponse.status, 200);
  assert.deepEqual(healthResponse.body, { ok: true, service: 'collectible-card-game-api' });

  const invalidRegisterResponse = await request(app)
    .post('/api/auth/register')
    .send({ username: 'ab', password: 'short' });

  assert.equal(invalidRegisterResponse.status, 400);
  assert.equal(invalidRegisterResponse.body.status, 'error');
  assert.equal(invalidRegisterResponse.body.message, 'Validation failed.');
  assert.ok(Array.isArray(invalidRegisterResponse.body.details));

  const uniqueUsername = `player-${crypto.randomUUID().slice(0, 8)}`;
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ username: uniqueUsername, password: 'supersecret' });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.status, 'success');
  assert.ok(registerResponse.body.token);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'demo', password: 'demo1234' });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.status, 'success');
  assert.ok(loginResponse.body.token);

  const meResponse = await request(app)
    .get('/api/me')
    .set('Authorization', `Bearer ${loginResponse.body.token}`);

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.status, 'success');
  assert.equal(meResponse.body.user.username, 'demo');
});

test('card creation reports a helpful message when the request body is missing', async () => {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'demo', password: 'demo1234' });

  const response = await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${loginResponse.body.token}`);

  assert.equal(response.status, 400);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.message, 'Validation failed.');
  assert.ok(response.body.details.some((detail) => detail.field === 'request body'));
  assert.ok(response.body.details.some((detail) => detail.message.includes('Send a JSON object')));
});

test('seeded card endpoints support read and ownership flows', async () => {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'demo', password: 'demo1234' });

  assert.equal(loginResponse.status, 200);
  const demoToken = loginResponse.body.token;

  const countResponse = await request(app).get('/api/cards/count');
  assert.equal(countResponse.status, 200);
  assert.equal(countResponse.body.status, 'success');
  assert.ok(countResponse.body.count >= 1);

  const listResponse = await request(app)
    .get('/api/cards')
    .set('Authorization', `Bearer ${demoToken}`);

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.status, 'success');
  assert.equal(listResponse.body.cards.length, countResponse.body.count);

  const randomResponse = await request(app).get('/api/cards/random');
  assert.equal(randomResponse.status, 200);
  assert.equal(randomResponse.body.status, 'success');
  assert.ok(listResponse.body.cards.some((card) => card.id === randomResponse.body.card.id));

  const typesResponse = await request(app).get('/api/types');
  assert.equal(typesResponse.status, 200);
  assert.ok(typesResponse.body.types.includes('Creature'));
  assert.ok(typesResponse.body.types.includes('Spell'));

  const raritiesResponse = await request(app).get('/api/rarities');
  assert.equal(raritiesResponse.status, 200);
  assert.ok(raritiesResponse.body.rarities.includes('Common'));
  assert.ok(raritiesResponse.body.rarities.includes('Rare'));

  const setsResponse = await request(app).get('/api/sets');
  assert.equal(setsResponse.status, 200);
  assert.deepEqual(setsResponse.body.sets, []);

  const cardId = listResponse.body.cards[0].id;
  const cardResponse = await request(app)
    .get(`/api/cards/${cardId}`)
    .set('Authorization', `Bearer ${demoToken}`);

  assert.equal(cardResponse.status, 200);
  assert.equal(cardResponse.body.card.id, cardId);

  const missingCardResponse = await request(app)
    .get('/api/cards/99999999')
    .set('Authorization', `Bearer ${demoToken}`);

  assert.equal(missingCardResponse.status, 404);
  assert.equal(missingCardResponse.body.message, 'Card not found.');

  const baseCount = countResponse.body.count;
  const createResponse = await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${demoToken}`)
    .send({
      name: `Moon Archer ${crypto.randomUUID().slice(0, 8)}`,
      type: 'Creature',
      rarity: 'Common',
      attack: 2,
      defense: 1,
      description: 'A fast ranged unit.',
      imageUrl: 'https://example.com/moon.jpg'
    });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.status, 'success');
  assert.equal(createResponse.body.card.ownerId, 1);

  const afterCreateCountResponse = await request(app).get('/api/cards/count');
  assert.equal(afterCreateCountResponse.body.count, baseCount + 1);

  const minimalCreateResponse = await request(app)
    .post('/api/cards')
    .set('Authorization', `Bearer ${demoToken}`)
    .send({
      name: `Blank Slate ${crypto.randomUUID().slice(0, 8)}`
    });

  assert.equal(minimalCreateResponse.status, 201);
  assert.equal(minimalCreateResponse.body.status, 'success');
  assert.equal(minimalCreateResponse.body.card.type, 'Creature');
  assert.equal(minimalCreateResponse.body.card.rarity, 'Common');
  assert.equal(minimalCreateResponse.body.card.attack, 0);
  assert.equal(minimalCreateResponse.body.card.defense, 0);
  assert.equal(minimalCreateResponse.body.card.description, '');
  assert.equal(minimalCreateResponse.body.card.imageUrl, '');

  const minimalCardId = minimalCreateResponse.body.card.id;

  const cleanupMinimalCardResponse = await request(app)
    .delete(`/api/cards/${minimalCardId}`)
    .set('Authorization', `Bearer ${demoToken}`);

  assert.equal(cleanupMinimalCardResponse.status, 204);

  const createdCardId = createResponse.body.card.id;

  const forbiddenUpdateResponse = await request(app)
    .put(`/api/cards/${createdCardId}`)
    .set('Authorization', `Bearer ${createToken({ id: 2, username: 'other' })}`)
    .send({ name: 'New Name' });

  assert.equal(forbiddenUpdateResponse.status, 403);
  assert.equal(forbiddenUpdateResponse.body.message, 'You can only edit cards you created.');

  const updateResponse = await request(app)
    .put(`/api/cards/${createdCardId}`)
    .set('Authorization', `Bearer ${demoToken}`)
    .send({ name: 'Moon Archer Prime' });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.card.name, 'Moon Archer Prime');

  const forbiddenDeleteResponse = await request(app)
    .delete(`/api/cards/${createdCardId}`)
    .set('Authorization', `Bearer ${createToken({ id: 2, username: 'other' })}`);

  assert.equal(forbiddenDeleteResponse.status, 403);
  assert.equal(forbiddenDeleteResponse.body.message, 'You can only delete cards you created.');

  const deleteResponse = await request(app)
    .delete(`/api/cards/${createdCardId}`)
    .set('Authorization', `Bearer ${demoToken}`);

  assert.equal(deleteResponse.status, 204);

  const afterDeleteCountResponse = await request(app).get('/api/cards/count');
  assert.equal(afterDeleteCountResponse.body.count, baseCount);

  const deletedCardResponse = await request(app)
    .get(`/api/cards/${createdCardId}`)
    .set('Authorization', `Bearer ${demoToken}`);

  assert.equal(deletedCardResponse.status, 404);
  assert.equal(deletedCardResponse.body.message, 'Card not found.');
});
