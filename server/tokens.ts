import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export interface MagicLinkPayload {
  productId: string;
  sellerId: string;
  action: 'mark_sold' | 'relist';
}

export function generateMagicToken(payload: MagicLinkPayload): string {
  // Token expires in 7 days
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyMagicToken(token: string): MagicLinkPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as MagicLinkPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
