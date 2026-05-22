import { z } from 'zod';

const authSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters long.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.')
});

const cardNameSchema = z.string().trim().min(1, 'Name is required.');
const cardTypeSchema = z.string().trim().min(1, 'Type is required.');
const cardRaritySchema = z.string().trim().min(1, 'Rarity is required.');
const cardAttackSchema = z.coerce.number().int().min(0).max(999);
const cardDefenseSchema = z.coerce.number().int().min(0).max(999);
const cardDescriptionSchema = z.string().trim();
const cardImageUrlSchema = z.string().trim().url('Image URL must be a valid URL.').or(z.literal(''));

const createCardSchemaBase = z.object({
  name: cardNameSchema,
  type: cardTypeSchema.optional().default('Creature'),
  rarity: cardRaritySchema.optional().default('Common'),
  attack: cardAttackSchema.optional().default(0),
  defense: cardDefenseSchema.optional().default(0),
  description: cardDescriptionSchema.optional().default(''),
  imageUrl: cardImageUrlSchema.optional().default('')
});

const updateCardSchemaBase = z.object({
  name: cardNameSchema,
  type: cardTypeSchema,
  rarity: cardRaritySchema,
  attack: cardAttackSchema,
  defense: cardDefenseSchema,
  description: cardDescriptionSchema,
  imageUrl: cardImageUrlSchema
});

export const registerSchema = authSchema;
export const loginSchema = authSchema;
export const createCardSchema = createCardSchemaBase;
export const updateCardSchema = updateCardSchemaBase.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one card field must be provided.'
});

export function parseBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request body',
      message: issue.path.length === 0
        ? 'Send a JSON object in the request body with the required field(s).'
        : issue.message
    }));

    const error = new Error('Validation failed.');
    error.statusCode = 400;
    error.details = details;
    throw error;
  }

  return result.data;
}
