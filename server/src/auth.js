import jwt from 'jsonwebtoken';
import { jwtSecret } from './config.js';

export function createToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username
    },
    jwtSecret,
    { expiresIn: '8h' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ status: 'error', message: 'Missing bearer token.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
  }
}