import { generateDidKey } from './services/did';
import { VerifierConfig } from './types';

let _config: VerifierConfig | null = null;

export async function getVerifierConfig(): Promise<VerifierConfig> {
  if (_config) return _config;

  const verifierUrl = process.env.VERIFIER_URL || 'http://localhost:3002';

  if (process.env.VERIFIER_PRIVATE_KEY_BASE64 && process.env.VERIFIER_PUBLIC_KEY_BASE64) {
    const privateKeyBytes = Buffer.from(process.env.VERIFIER_PRIVATE_KEY_BASE64, 'base64');
    const publicKeyBytes = Buffer.from(process.env.VERIFIER_PUBLIC_KEY_BASE64, 'base64');
    const { pubKeyToDidKey } = await import('./services/did');
    _config = {
      did: process.env.VERIFIER_DID || pubKeyToDidKey(publicKeyBytes),
      privateKeyBytes,
      publicKeyBytes,
      verifierUrl,
    };
  } else {
    const { did, privateKeyBytes, publicKeyBytes } = await generateDidKey();
    console.warn('No VERIFIER_PRIVATE_KEY_BASE64 set — using ephemeral key. Set env vars for stable DID.');
    console.info(`VERIFIER_DID=${did}`);
    console.info(`VERIFIER_PRIVATE_KEY_BASE64=${Buffer.from(privateKeyBytes).toString('base64')}`);
    console.info(`VERIFIER_PUBLIC_KEY_BASE64=${Buffer.from(publicKeyBytes).toString('base64')}`);
    _config = { did, privateKeyBytes, publicKeyBytes, verifierUrl };
  }

  return _config;
}
