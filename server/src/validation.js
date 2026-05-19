import { z } from 'zod';

const authSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters long.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.')
});

const cardSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  type: z.string().trim().min(1, 'Type is required.'),
  rarity: z.string().trim().min(1, 'Rarity is required.'),
  attack: z.coerce.number().int().min(0).max(999).optional().default(0),
  defense: z.coerce.number().int().min(0).max(999).optional().default(0),
  description: z.string().trim().optional().default(''),
  imageUrl: z.string().trim().url('Image URL must be a valid URL.').optional().or(z.literal('')).default('')
});

export const registerSchema = authSchema;
export const loginSchema = authSchema;
export const createCardSchema = cardSchema;
export const updateCardSchema = cardSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one card field must be provided.'
});

export function parseBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message
    }));

    const error = new Error('Validation failed.');
    error.statusCode = 400;
    error.details = details;
    throw error;
  }

  return result.data;
}
