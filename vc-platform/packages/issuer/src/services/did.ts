import * as ed from '@noble/ed25519';
import { base58btc } from 'multiformats/bases/base58';

// ed25519 multicodec prefix: 0xed01
const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

export function pubKeyToDidKey(publicKey: Uint8Array): string {
  const prefixed = new Uint8Array(ED25519_PREFIX.length + publicKey.length);
  prefixed.set(ED25519_PREFIX);
  prefixed.set(publicKey, ED25519_PREFIX.length);
  // base58btc.encode returns string starting with 'z', which is the multibase prefix
  return `did:key:${base58btc.encode(prefixed)}`;
}

export async function generateDidKey(): Promise<{
  did: string;
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
}> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  const did = pubKeyToDidKey(publicKeyBytes);
  return { did, privateKeyBytes, publicKeyBytes };
}

export function didKeyToVerificationMethod(did: string): string {
  const keyFragment = did.replace('did:key:', '');
  return `${did}#${keyFragment}`;
}
