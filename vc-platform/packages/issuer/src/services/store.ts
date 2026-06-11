import { Redis } from '@upstash/redis';
import { PendingOffer, IssuedToken } from '../types';

// Lazily initialised so the module loads even if env vars aren't present yet
let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

const OFFER_TTL = 600;   // 10 min
const TOKEN_TTL = 300;   // 5 min
const NONCE_TTL = 600;   // 10 min

export const offerStore = {
  async set(code: string, offer: PendingOffer): Promise<void> {
    await redis().set(`offer:${code}`, JSON.stringify(offer), { ex: OFFER_TTL });
  },
  async get(code: string): Promise<PendingOffer | null> {
    const raw = await redis().get<string>(`offer:${code}`);
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as PendingOffer) : null;
  },
  async delete(code: string): Promise<void> {
    await redis().del(`offer:${code}`);
  },
};

export const tokenStore = {
  async set(token: string, data: IssuedToken): Promise<void> {
    await redis().set(`token:${token}`, JSON.stringify(data), { ex: TOKEN_TTL });
  },
  async get(token: string): Promise<IssuedToken | null> {
    const raw = await redis().get<string>(`token:${token}`);
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as IssuedToken) : null;
  },
  async delete(token: string): Promise<void> {
    await redis().del(`token:${token}`);
  },
};

export const nonceStore = {
  async markUsed(nonce: string): Promise<void> {
    await redis().set(`nonce:${nonce}`, '1', { ex: NONCE_TTL });
  },
  async isUsed(nonce: string): Promise<boolean> {
    const val = await redis().get(`nonce:${nonce}`);
    return val !== null;
  },
};
