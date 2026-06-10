import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { offerStore, tokenStore } from '../services/store';
import { IssuerConfig, IssuedToken } from '../types';

export function tokenRouter(issuerConfig: IssuerConfig): Router {
  const router = Router();

  router.post('/token', async (req: Request, res: Response) => {
    const { grant_type, 'pre-authorized_code': preAuthCode, user_pin } = req.body as {
      grant_type: string;
      'pre-authorized_code'?: string;
      user_pin?: string;
    };

    if (grant_type !== 'urn:ietf:params:oauth:grant-type:pre-authorized_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!preAuthCode) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'pre-authorized_code required' });
    }

    const offer = offerStore.get(preAuthCode);
    if (!offer) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired pre-authorized_code' });
    }

    if (Date.now() > offer.expiresAt) {
      offerStore.delete(preAuthCode);
      return res.status(400).json({ error: 'invalid_grant', error_description: 'pre-authorized_code expired' });
    }

    if (offer.pin && offer.pin !== user_pin) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid PIN' });
    }

    offerStore.delete(preAuthCode);

    const accessToken = randomUUID();
    const cNonce = randomUUID();

    const tokenData: IssuedToken = {
      accessToken,
      cNonce,
      credentialType: offer.credentialType,
      subjectData: offer.subjectData,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    tokenStore.set(accessToken, tokenData);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 300,
      c_nonce: cNonce,
      c_nonce_expires_in: 300,
    });
  });

  return router;
}
