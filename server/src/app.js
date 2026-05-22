import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { createToken, requireAuth } from './auth.js';
import {
  createCard,
  createUser,
  deleteCard,
  getCardById,
  getUserById,
  getUserByUsername,
  listCards,
  countCards,
  getRandomCard,
  listTypes,
  listRarities,
  listSets,
  updateCard
} from './dataStore.js';
import { createCardSchema, loginSchema, parseBody, registerSchema, updateCardSchema } from './validation.js';

export function createApp(dataStore = {
  createCard,
  createUser,
  deleteCard,
  getCardById,
  getUserById,
  getUserByUsername,
  listCards,
  countCards,
  getRandomCard,
  listTypes,
  listRarities,
  listSets,
  updateCard
}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'collectible-card-game-api' });
  });

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const { username, password } = parseBody(registerSchema, req.body);
      const existingUser = await dataStore.getUserByUsername(username);

      if (existingUser) {
        return res.status(409).json({ status: 'error', message: 'That username is already taken.' });
      }

      const user = await dataStore.createUser({
        username,
        passwordHash: bcrypt.hashSync(password, 10),
        createdAt: new Date().toISOString()
      });

      const token = createToken(user);
      res.status(201).json({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { username, password } = parseBody(loginSchema, req.body);
      const user = await dataStore.getUserByUsername(username);

      if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ status: 'error', message: 'Invalid username or password.' });
      }

      const token = createToken(user);
      res.json({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/me', requireAuth, async (req, res, next) => {
    try {
      const user = await dataStore.getUserById(req.user.sub);

      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found.' });
      }

      res.json({
        status: 'success',
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/cards', requireAuth, async (_req, res, next) => {
    try {
      res.json({ status: 'success', cards: await dataStore.listCards() });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/cards/count', async (_req, res, next) => {
    try {
      const count = await dataStore.countCards();
      res.json({ status: 'success', count });
    } catch (error) {
      next(error);
    }
  });

  // Alias: GET /cards/count (public)
  app.get('/cards/count', async (_req, res, next) => {
    try {
      const count = await dataStore.countCards();
      res.json({ status: 'success', count });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/cards/random', async (_req, res, next) => {
    try {
      const card = await dataStore.getRandomCard();

      if (!card) {
        return res.status(404).json({ status: 'error', message: 'No cards available.' });
      }

      res.json({ status: 'success', card });
    } catch (error) {
      next(error);
    }
  });

  // Alias: GET /cards/random (public)
  app.get('/cards/random', async (_req, res, next) => {
    try {
      const card = await dataStore.getRandomCard();

      if (!card) {
        return res.status(404).json({ status: 'error', message: 'No cards available.' });
      }

      res.json({ status: 'success', card });
    } catch (error) {
      next(error);
    }
  });

  // Metadata endpoints
  app.get('/api/types', async (_req, res, next) => {
    try {
      const types = await dataStore.listTypes();
      res.json({ status: 'success', types });
    } catch (error) {
      next(error);
    }
  });

  // Alias: GET /types (public)
  app.get('/types', async (_req, res, next) => {
    try {
      const types = await dataStore.listTypes();
      res.json({ status: 'success', types });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/rarities', async (_req, res, next) => {
    try {
      const rarities = await dataStore.listRarities();
      res.json({ status: 'success', rarities });
    } catch (error) {
      next(error);
    }
  });

  // Alias: GET /rarities (public)
  app.get('/rarities', async (_req, res, next) => {
    try {
      const rarities = await dataStore.listRarities();
      res.json({ status: 'success', rarities });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sets', async (_req, res, next) => {
    try {
      const sets = await dataStore.listSets();
      res.json({ status: 'success', sets });
    } catch (error) {
      next(error);
    }
  });

  // Alias: GET /sets (public)
  app.get('/sets', async (_req, res, next) => {
    try {
      const sets = await dataStore.listSets();
      res.json({ status: 'success', sets });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/cards/:id', requireAuth, async (req, res, next) => {
    try {
      // If the client requested a literal sub-route (e.g. 'count' or 'random'),
      // skip this handler so the more specific routes can handle it.
      const id = req.params.id;
      if (id === 'count' || id === 'random') return next();

      const card = await dataStore.getCardById(req.params.id);

      if (!card) {
        return res.status(404).json({ status: 'error', message: 'Card not found.' });
      }

      res.json({ status: 'success', card });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/cards', requireAuth, async (req, res, next) => {
    try {
      const cardInput = parseBody(createCardSchema, req.body);
      const card = await dataStore.createCard({
        ...cardInput,
        ownerId: Number(req.user.sub),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      res.status(201).json({ status: 'success', card });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/cards/:id', requireAuth, async (req, res, next) => {
    try {
      const existingCard = await dataStore.getCardById(req.params.id);

      if (!existingCard) {
        return res.status(404).json({ status: 'error', message: 'Card not found.' });
      }

      if (existingCard.ownerId !== Number(req.user.sub)) {
        return res.status(403).json({ status: 'error', message: 'You can only edit cards you created.' });
      }

      const updates = parseBody(updateCardSchema, req.body);
      const updatedCard = await dataStore.updateCard(req.params.id, {
        name: updates.name ?? existingCard.name,
        type: updates.type ?? existingCard.type,
        rarity: updates.rarity ?? existingCard.rarity,
        attack: updates.attack ?? existingCard.attack,
        defense: updates.defense ?? existingCard.defense,
        description: updates.description ?? existingCard.description,
        imageUrl: updates.imageUrl ?? existingCard.imageUrl,
        updatedAt: new Date().toISOString()
      });

      res.json({ status: 'success', card: updatedCard });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/cards/:id', requireAuth, async (req, res, next) => {
    try {
      const card = await dataStore.getCardById(req.params.id);

      if (!card) {
        return res.status(404).json({ status: 'error', message: 'Card not found.' });
      }

      if (card.ownerId !== Number(req.user.sub)) {
        return res.status(403).json({ status: 'error', message: 'You can only delete cards you created.' });
      }

      await dataStore.deleteCard(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found.' });
  });

  app.use((error, _req, res, _next) => {
    // Determine status code: prefer explicit `statusCode`, then `status` (from some libraries),
    // then common parse errors -> 400, otherwise 500 for server errors.
    let statusCode = 500;

    if (Number.isInteger(error.statusCode)) {
      statusCode = error.statusCode;
    } else if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
      statusCode = error.status;
    } else if (error.type === 'entity.parse.failed' || error instanceof SyntaxError) {
      statusCode = 400;
    }

    const message = error.message || (statusCode === 500 ? 'Internal server error.' : 'Something went wrong.');

    res.status(statusCode).json({
      status: 'error',
      message,
      details: error.details || undefined
    });
  });

  // Debug: list registered routes (method + path)
  try {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${middleware.route.path}`);
      }
    });
    console.log('Registered routes:\n' + routes.join('\n'));
  } catch (e) {
    // ignore
  }

  return app;
}

const app = createApp();

export default app;
