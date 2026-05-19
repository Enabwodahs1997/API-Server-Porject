import dotenv from 'dotenv';

dotenv.config();

export const port = Number(process.env.PORT || 3001);
export const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/collectible_card_game';
export const jwtSecret = process.env.JWT_SECRET || 'development-secret';