import { SignJWT, importJWK } from 'jose';
import { StoredCredential, WalletIdentity } from '../types';

export interface PresentationRequestParams {
  response_uri: string;
  nonce: string;
  state: string;
  client_id: string;
  presentation_definition: string;
}

export function parsePresentationRequest(deepLink: string): PresentationRequestParams {
  const url = new URL(deepLink.replace('openid4vp://', 'https://placeholder/'));
  return {
    response_uri: url.searchParams.get('response_uri') || url.searchParams.get('redirect_uri') || '',
    nonce: url.searchParams.get('nonce') || '',
    state: url.searchParams.get('state') || '',
    client_id: url.searchParams.get('client_id') || '',
    presentation_definition: url.searchParams.get('presentation_definition') || '{}',
  };
}

export function matchCredentials(
  credentials: StoredCredential[],
  presentationDefinition: Record<string, unknown>
): StoredCredential[] {
  const definition = presentationDefinition as {
    input_descriptors: Array<{
      constraints: { fields: Array<{ path: string[]; filter?: { contains?: { const: string } } }> };
    }>;
  };

  const requiredTypes = definition.input_descriptors
    .flatMap((d) => d.constraints.fields)
    .flatMap((f) => (f.filter?.contains?.const ? [f.filter.contains.const] : []));

  if (!requiredTypes.length) return credentials;

  return credentials.filter((cred) =>
    requiredTypes.every((type) => cred.type.includes(type))
  );
}

export async function createPresentation(
  credentials: StoredCredential[],
  identity: WalletIdentity,
  nonce: string,
  audience: string
): Promise<string> {
  const privateKeyBytes = Buffer.from(identity.privateKeyBase64, 'base64');
  const publicKeyBytes = Buffer.from(identity.publicKeyBase64, 'base64');

  const privateKey = await importJWK(
    {
      kty: 'OKP',
      crv: 'Ed25519',
      x: Buffer.from(publicKeyBytes).toString('base64url'),
      d: Buffer.from(privateKeyBytes).toString('base64url'),
    },
    'EdDSA'
  );

  const kid = `${identity.did}#${identity.did.replace('did:key:', '')}`;

  const vp = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: identity.did,
    verifiableCredential: credentials.map((c) => c.jwt),
  };

  return new SignJWT({ vp, nonce })
    .setProtectedHeader({ alg: 'EdDSA', kid })
    .setIssuer(identity.did)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

export async function submitPresentation(
  responseUri: string,
  state: string,
  vpToken: string,
  definitionId: string,
  credentials: StoredCredential[]
): Promise<void> {
  const submission = {
    id: `submission_${Date.now()}`,
    definition_id: definitionId,
    descriptor_map: credentials.map((cred, i) => ({
      id: cred.type.find((t) => t !== 'VerifiableCredential') || 'VerifiableCredential',
      format: 'jwt_vp',
      path: '$',
      path_nested: {
        format: 'jwt_vc',
        path: `$.verifiableCredential[${i}]`,
      },
    })),
  };

  const body = new URLSearchParams({
    state,
    vp_token: vpToken,
    presentation_submission: JSON.stringify(submission),
  });

  const res = await fetch(responseUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Presentation submission failed');
  }
}
