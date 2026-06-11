import 'react-native-get-random-values';
import * as ed from '@noble/ed25519';
import { base58btc } from 'multiformats/bases/base58';

const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

export function pubKeyToDidKey(publicKey: Uint8Array): string {
  const prefixed = new Uint8Array(ED25519_PREFIX.length + publicKey.length);
  prefixed.set(ED25519_PREFIX);
  prefixed.set(publicKey, ED25519_PREFIX.length);
  const encoded = base58btc.encode(prefixed);
  return `did:key:${encoded}`;
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

export async function signJwt(
  payload: Record<string, unknown>,
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
  kid: string
): Promise<string> {
  const { SignJWT, importJWK } = await import('jose');
  const privateKey = await importJWK(
    {
      kty: 'OKP',
      crv: 'Ed25519',
      x: Buffer.from(publicKeyBytes).toString('base64url'),
      d: Buffer.from(privateKeyBytes).toString('base64url'),
    },
    'EdDSA'
  );

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'EdDSA', kid, typ: 'openid4vci-proof+jwt' })
    .sign(privateKey);
}
