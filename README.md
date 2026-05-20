# Collectible Card Game API

Beginner-friendly full-stack starter for a fictional collectible card game.

## What it includes

- Express.js API with JWT auth
- Register/login endpoints
- Protected CRUD routes for collectible cards
- React frontend for trying the API in a browser
- Postgres storage with automatic table creation on startup
- Request validation and structured error responses
- Small API test suite

## Requirements

- Node.js 18 or newer
- npm
- A running Postgres database

## Install

```bash
npm install
```

## Configure Postgres

Set `server/.env` from `server/.env.example` and point `DATABASE_URL` at your database.

Example local Postgres URL:

```bash
postgres://postgres:postgres@localhost:5432/collectible_card_game
```

If you want a quick local database, Docker works well:

```bash
docker compose up -d
```

That starts the `postgres` service from `docker-compose.yml`.

## Run in development

```bash
npm run dev
```

The backend runs on `http://localhost:3001` and the React app runs on `http://localhost:5173`.

Seed demo data after the database is up:

```bash
npm run seed
```

## Production build

```bash
npm run build
npm run start
```

## Tests

```bash
npm test
```

## API quick start

1. Register a user with `POST /api/auth/register`.
2. Log in with `POST /api/auth/login`.
3. Copy the token into the `Authorization: Bearer <token>` header.
4. Use the card routes under `/api/cards`.

## Why Docker?

I chose to use Docker's software program because it allows you to build, test, and deploy applications quickly by packaging them into standardized units called containers. I felt it was a good use of the program due to the style of program I am building.
