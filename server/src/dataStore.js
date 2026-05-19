import { Pool } from 'pg';
import { databaseUrl } from './config.js';

const pool = new Pool({ connectionString: databaseUrl });

async function query(text, values = []) {
  const result = await pool.query(text, values);
  return result.rows;
}

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      rarity TEXT NOT NULL,
      attack INTEGER NOT NULL DEFAULT 0,
      defense INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function mapUser(row) {
  return row ? {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  } : null;
}

function mapCard(row) {
  return row ? {
    id: row.id,
    name: row.name,
    type: row.type,
    rarity: row.rarity,
    attack: row.attack,
    defense: row.defense,
    description: row.description,
    imageUrl: row.image_url,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } : null;
}

export async function getUserByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE lower(username) = lower($1) LIMIT 1', [username]);
  return mapUser(rows[0]);
}

export async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return mapUser(rows[0]);
}

export async function createUser(user) {
  const rows = await query(
    'INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, $3) RETURNING *',
    [user.username, user.passwordHash, user.createdAt]
  );
  return mapUser(rows[0]);
}

export async function listCards() {
  const rows = await query('SELECT * FROM cards ORDER BY id DESC');
  return rows.map(mapCard);
}

export async function getCardById(id) {
  const rows = await query('SELECT * FROM cards WHERE id = $1 LIMIT 1', [id]);
  return mapCard(rows[0]);
}

export async function createCard(card) {
  const rows = await query(
    `
      INSERT INTO cards (name, type, rarity, attack, defense, description, image_url, owner_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      card.name,
      card.type,
      card.rarity,
      card.attack,
      card.defense,
      card.description,
      card.imageUrl,
      card.ownerId,
      card.createdAt,
      card.updatedAt
    ]
  );

  return mapCard(rows[0]);
}

export async function updateCard(id, updates) {
  const rows = await query(
    `
      UPDATE cards
      SET name = $1, type = $2, rarity = $3, attack = $4, defense = $5, description = $6, image_url = $7, updated_at = $8
      WHERE id = $9
      RETURNING *
    `,
    [
      updates.name,
      updates.type,
      updates.rarity,
      updates.attack,
      updates.defense,
      updates.description,
      updates.imageUrl,
      updates.updatedAt,
      id
    ]
  );

  return mapCard(rows[0]);
}

export async function deleteCard(id) {
  await query('DELETE FROM cards WHERE id = $1', [id]);
}

export async function countCards() {
  const rows = await query('SELECT COUNT(*)::int AS count FROM cards');
  return rows[0]?.count || 0;
}

export async function closeDatabase() {
  await pool.end();
}
