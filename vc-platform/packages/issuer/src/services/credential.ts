import { SignJWT, importJWK } from 'jose';
import { IssuerConfig } from '../types';
import { didKeyToVerificationMethod } from './did';

// Convert raw ed25519 private key bytes to JWK for jose
async function privateKeyToJwk(privateKeyBytes: Uint8Array, publicKeyBytes: Uint8Array) {
  const jwk = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: Buffer.from(publicKeyBytes).toString('base64url'),
    d: Buffer.from(privateKeyBytes).toString('base64url'),
  };
  return importJWK(jwk, 'EdDSA');
}

export async function issueCredential(
  issuerConfig: IssuerConfig,
  subjectDid: string,
  credentialType: string,
  claims: Record<string, unknown>
): Promise<string> {
  const privateKey = await privateKeyToJwk(
    issuerConfig.privateKeyBytes,
    issuerConfig.publicKeyBytes
  );

  const now = Math.floor(Date.now() / 1000);
  const verificationMethod = didKeyToVerificationMethod(issuerConfig.did);

  const vc = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
    ],
    type: ['VerifiableCredential', credentialType],
    issuer: issuerConfig.did,
    issuanceDate: new Date(now * 1000).toISOString(),
    expirationDate: new Date((now + 365 * 24 * 3600) * 1000).toISOString(),
    credentialSubject: {
      id: subjectDid,
      ...claims,
    },
  };

  const jwt = await new SignJWT({ vc })
    .setProtectedHeader({ alg: 'EdDSA', kid: verificationMethod })
    .setIssuer(issuerConfig.did)
    .setSubject(subjectDid)
    .setIssuedAt(now)
    .setExpirationTime('365d')
    .setJti(`urn:uuid:${crypto.randomUUID()}`)
    .sign(privateKey);

  return jwt;
}
