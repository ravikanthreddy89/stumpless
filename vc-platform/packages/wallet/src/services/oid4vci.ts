import { WalletIdentity } from '../types';
import { signJwt } from './crypto';

export interface CredentialOfferPayload {
  credential_issuer: string;
  credentials: string[];
  grants: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
      'pre-authorized_code': string;
      user_pin_required: boolean;
    };
  };
}

export function parseCredentialOffer(deepLink: string): CredentialOfferPayload {
  const url = new URL(deepLink);
  const offerParam = url.searchParams.get('credential_offer');
  if (!offerParam) throw new Error('No credential_offer parameter');
  return JSON.parse(Buffer.from(offerParam, 'base64url').toString());
}

export async function fetchToken(
  issuerUrl: string,
  preAuthorizedCode: string,
  userPin?: string
): Promise<{ access_token: string; c_nonce: string }> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
    'pre-authorized_code': preAuthorizedCode,
  });
  if (userPin) body.append('user_pin', userPin);

  const res = await fetch(`${issuerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.error || 'Token request failed');
  }

  return res.json();
}

export async function fetchCredential(
  issuerUrl: string,
  accessToken: string,
  cNonce: string,
  identity: WalletIdentity,
  credentialType: string
): Promise<string> {
  const privateKeyBytes = Buffer.from(identity.privateKeyBase64, 'base64');
  const publicKeyBytes = Buffer.from(identity.publicKeyBase64, 'base64');

  const kid = `${identity.did}#${identity.did.replace('did:key:', '')}`;
  const now = Math.floor(Date.now() / 1000);

  const proofJwt = await signJwt(
    {
      iss: identity.did,
      aud: issuerUrl,
      iat: now,
      nonce: cNonce,
    },
    privateKeyBytes,
    publicKeyBytes,
    kid
  );

  const res = await fetch(`${issuerUrl}/credential`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      format: 'jwt_vc_json',
      types: ['VerifiableCredential', credentialType],
      proof: {
        proof_type: 'jwt',
        jwt: proofJwt,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.error || 'Credential request failed');
  }

  const data = await res.json();
  return data.credential;
}
