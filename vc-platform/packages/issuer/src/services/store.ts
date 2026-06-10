import { PendingOffer, IssuedToken } from '../types';

// In-memory store — replace with Redis/DB for production
const offers = new Map<string, PendingOffer>();
const tokens = new Map<string, IssuedToken>();
const usedNonces = new Set<string>();

export const offerStore = {
  set: (code: string, offer: PendingOffer) => offers.set(code, offer),
  get: (code: string) => offers.get(code),
  delete: (code: string) => offers.delete(code),
};

export const tokenStore = {
  set: (token: string, data: IssuedToken) => tokens.set(token, data),
  get: (token: string) => tokens.get(token),
  delete: (token: string) => tokens.delete(token),
};

export const nonceStore = {
  markUsed: (nonce: string) => usedNonces.add(nonce),
  isUsed: (nonce: string) => usedNonces.has(nonce),
};
