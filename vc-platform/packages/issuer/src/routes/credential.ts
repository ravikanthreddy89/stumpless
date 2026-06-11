import { Router, Request, Response } from 'express';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import { tokenStore, nonceStore } from '../services/store';
import { issueCredential } from '../services/credential';
import { IssuerConfig } from '../types';

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function credentialRouter(issuerConfig: IssuerConfig): Router {
  const router = Router();

  router.post('/credential', async (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const tokenData = await tokenStore.get(token);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      await tokenStore.delete(token);
      return res.status(401).json({ error: 'invalid_token', error_description: 'Token expired or invalid' });
    }

    const { format, proof } = req.body as { format: string; proof?: { proof_type: string; jwt: string } };

    if (format !== 'jwt_vc_json') {
      return res.status(400).json({ error: 'unsupported_credential_format' });
    }

    if (!proof?.jwt) {
      return res.status(400).json({ error: 'invalid_or_missing_proof' });
    }

    let subjectDid: string;
    try {
      const header = decodeProtectedHeader(proof.jwt);
      const payload = decodeJwt(proof.jwt);

      if (payload.nonce !== tokenData.cNonce) {
        return res.status(400).json({ error: 'invalid_or_missing_proof', error_description: 'Invalid nonce' });
      }

      if (await nonceStore.isUsed(tokenData.cNonce)) {
        return res.status(400).json({ error: 'invalid_or_missing_proof', error_description: 'Nonce already used' });
      }

      await nonceStore.markUsed(tokenData.cNonce);

      const kid = header.kid as string;
      if (!kid?.startsWith('did:key:')) {
        return res.status(400).json({ error: 'invalid_or_missing_proof', error_description: 'Invalid kid in proof' });
      }

      subjectDid = kid.split('#')[0];
    } catch {
      return res.status(400).json({ error: 'invalid_or_missing_proof' });
    }

    const credentialJwt = await issueCredential(
      issuerConfig,
      subjectDid,
      tokenData.credentialType,
      tokenData.subjectData
    );

    await tokenStore.delete(token);

    return res.json({
      format: 'jwt_vc_json',
      credential: credentialJwt,
    });
  });

  return router;
}
