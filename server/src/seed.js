import bcrypt from 'bcryptjs';
import {
  countCards,
  createCard,
  createUser,
  getUserByUsername,
  initializeDatabase
} from './dataStore.js';

await initializeDatabase();

let demoUser = await getUserByUsername('demo');

if (!demoUser) {
  demoUser = await createUser({
    username: 'demo',
    passwordHash: bcrypt.hashSync('demo1234', 10),
    createdAt: new Date().toISOString()
  });
}

if ((await countCards()) === 0) {
  await createCard({
    name: 'Ember Drake',
    type: 'Creature',
    rarity: 'Rare',
    attack: 7,
    defense: 5,
    description: 'A fire-breathing dragon that lights the battlefield.',
    imageUrl: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80',
    ownerId: demoUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await createCard({
    name: 'Arcane Barrier',
    type: 'Spell',
    rarity: 'Common',
    attack: 0,
    defense: 3,
    description: 'A shield that blocks the next strike.',
    imageUrl: 'https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?auto=format&fit=crop&w=800&q=80',
    ownerId: demoUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

console.log('Seed data written to Postgres.');
