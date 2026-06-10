import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { offerStore } from '../services/store';
import { IssuerConfig, PendingOffer } from '../types';

export function offerRouter(issuerConfig: IssuerConfig): Router {
  const router = Router();

  // Admin endpoint: create a credential offer
  router.post('/offers', (req: Request, res: Response) => {
    const { credentialType, subjectData, requirePin } = req.body as {
      credentialType: string;
      subjectData: Record<string, unknown>;
      requirePin?: boolean;
    };

    if (!credentialType || !subjectData) {
      return res.status(400).json({ error: 'credentialType and subjectData required' });
    }

    const preAuthorizedCode = randomUUID();
    const pin = requirePin ? Math.floor(1000 + Math.random() * 9000).toString() : undefined;

    const offer: PendingOffer = {
      preAuthorizedCode,
      credentialType,
      subjectData,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
      pin,
    };

    offerStore.set(preAuthorizedCode, offer);

    const offerUri = {
      credential_issuer: issuerConfig.issuerUrl,
      credentials: [credentialType],
      grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
          'pre-authorized_code': preAuthorizedCode,
          user_pin_required: !!requirePin,
        },
      },
    };

    const encodedOffer = Buffer.from(JSON.stringify(offerUri)).toString('base64url');
    const deepLink = `openid-credential-offer://?credential_offer=${encodedOffer}`;

    return res.json({
      preAuthorizedCode,
      pin,
      offerUri,
      deepLink,
      qrData: deepLink,
    });
  });

  return router;
}
