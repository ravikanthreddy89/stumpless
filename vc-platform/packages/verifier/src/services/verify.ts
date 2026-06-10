import { decodeJwt, decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { base58btc } from 'multiformats/bases/base58';
import {
  PresentationResponse,
  PresentationRequest,
  VerificationResult,
  VerifiedCredential,
} from '../types';

const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

function didKeyToPublicKey(did: string): Uint8Array {
  const multibase = did.replace('did:key:', '');
  const decoded = base58btc.decode(multibase);
  return decoded.slice(ED25519_PREFIX.length);
}

async function verifyEdDSAJwt(jwt: string): Promise<{ payload: Record<string, unknown>; valid: boolean }> {
  try {
    const header = decodeProtectedHeader(jwt);
    const kid = header.kid as string;
    if (!kid) throw new Error('No kid in header');
    
    const did = kid.split('#')[0];
    const pubKeyBytes = didKeyToPublicKey(did);
    
    const importedKey = await importJWK(
      {
        kty: 'OKP',
        crv: 'Ed25519',
        x: Buffer.from(pubKeyBytes).toString('base64url'),
      },
      'EdDSA'
    );

    const { payload } = await jwtVerify(jwt, importedKey);
    return { payload: payload as Record<string, unknown>, valid: true };
  } catch (_err) {
    return { payload: {}, valid: false };
  }
}

export async function verifyPresentation(
  response: PresentationResponse,
  request: PresentationRequest
): Promise<VerificationResult> {
  if (response.state !== request.state) {
    return { verified: false, error: 'State mismatch' };
  }

  const vpResult = await verifyEdDSAJwt(response.vp_token);
  if (!vpResult.valid) {
    return { verified: false, error: 'Invalid VP JWT signature' };
  }

  const vpPayload = vpResult.payload;

  if (vpPayload['nonce'] !== request.nonce) {
    return { verified: false, error: 'Nonce mismatch' };
  }

  const vp = vpPayload['vp'] as Record<string, unknown>;
  if (!vp) {
    return { verified: false, error: 'No VP claim in token' };
  }

  const vcJwts = vp['verifiableCredential'] as string[];
  if (!vcJwts?.length) {
    return { verified: false, error: 'No credentials in presentation' };
  }

  const verifiedCredentials: VerifiedCredential[] = [];

  for (const vcJwt of vcJwts) {
    const vcResult = await verifyEdDSAJwt(vcJwt);
    if (!vcResult.valid) {
      return { verified: false, error: 'Invalid VC JWT signature' };
    }

    const vcPayload = vcResult.payload;
    const vc = vcPayload['vc'] as Record<string, unknown>;
    if (!vc) continue;

    const exp = vcPayload['exp'] as number;
    if (exp && Date.now() / 1000 > exp) {
      return { verified: false, error: 'Credential expired' };
    }

    const credSubject = vc['credentialSubject'] as Record<string, unknown>;
    const { id: subjectId, ...claims } = credSubject;

    verifiedCredentials.push({
      type: vc['type'] as string[],
      issuer: vc['issuer'] as string,
      subject: subjectId as string,
      claims,
      issuanceDate: vc['issuanceDate'] as string,
      expirationDate: vc['expirationDate'] as string | undefined,
    });
  }

  const holderDid = (decodeJwt(response.vp_token)['iss'] as string) || '';

  return {
    verified: true,
    holder: holderDid,
    credentials: verifiedCredentials,
  };
}
