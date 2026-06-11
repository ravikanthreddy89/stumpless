import { generateDidKey } from './services/did';
import { IssuerConfig } from './types';

let _config: IssuerConfig | null = null;

// On Vercel the DID keypair must come from env vars so it's stable across
// cold starts. Generate once and print for copy-paste during first deploy.
export async function getIssuerConfig(): Promise<IssuerConfig> {
  if (_config) return _config;

  const issuerUrl = process.env.ISSUER_URL || 'http://localhost:3001';

  if (process.env.ISSUER_PRIVATE_KEY_BASE64 && process.env.ISSUER_PUBLIC_KEY_BASE64) {
    const privateKeyBytes = Buffer.from(process.env.ISSUER_PRIVATE_KEY_BASE64, 'base64');
    const publicKeyBytes = Buffer.from(process.env.ISSUER_PUBLIC_KEY_BASE64, 'base64');
    const { pubKeyToDidKey } = await import('./services/did');
    _config = {
      did: process.env.ISSUER_DID || pubKeyToDidKey(publicKeyBytes),
      privateKeyBytes,
      publicKeyBytes,
      issuerUrl,
    };
  } else {
    // First run / local dev: generate ephemeral keys
    const { did, privateKeyBytes, publicKeyBytes } = await generateDidKey();
    console.warn('No ISSUER_PRIVATE_KEY_BASE64 set — using ephemeral key. Set env vars for stable DID.');
    console.info(`ISSUER_DID=${did}`);
    console.info(`ISSUER_PRIVATE_KEY_BASE64=${Buffer.from(privateKeyBytes).toString('base64')}`);
    console.info(`ISSUER_PUBLIC_KEY_BASE64=${Buffer.from(publicKeyBytes).toString('base64')}`);
    _config = { did, privateKeyBytes, publicKeyBytes, issuerUrl };
  }

  return _config;
}
