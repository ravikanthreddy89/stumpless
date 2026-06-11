import { Redis } from '@upstash/redis';
import { PresentationRequest, VerificationResult } from '../types';

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

const REQUEST_TTL = 600;  // 10 min
const RESULT_TTL = 3600;  // 1 hour

export const requestStore = {
  async set(state: string, req: PresentationRequest): Promise<void> {
    await redis().set(`vp_req:${state}`, JSON.stringify(req), { ex: REQUEST_TTL });
  },
  async get(state: string): Promise<PresentationRequest | null> {
    const raw = await redis().get<string>(`vp_req:${state}`);
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as PresentationRequest) : null;
  },
  async delete(state: string): Promise<void> {
    await redis().del(`vp_req:${state}`);
  },
};

export const resultStore = {
  async set(state: string, result: VerificationResult): Promise<void> {
    await redis().set(`vp_result:${state}`, JSON.stringify(result), { ex: RESULT_TTL });
  },
  async get(state: string): Promise<VerificationResult | null> {
    const raw = await redis().get<string>(`vp_result:${state}`);
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as VerificationResult) : null;
  },
};
