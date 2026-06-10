import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requestStore, resultStore } from '../services/store';
import { VerifierConfig, PresentationRequest } from '../types';

export function requestRouter(verifierConfig: VerifierConfig): Router {
  const router = Router();

  router.post('/presentations/requests', (req: Request, res: Response) => {
    const { credentialTypes = ['VerifiableCredential'] } = req.body as { credentialTypes?: string[] };

    const state = randomUUID();
    const nonce = randomUUID();

    const presentationRequest: PresentationRequest = {
      id: randomUUID(),
      client_id: verifierConfig.did,
      client_id_scheme: 'did',
      response_type: 'vp_token',
      response_mode: 'direct_post',
      response_uri: `${verifierConfig.verifierUrl}/presentations/callback`,
      nonce,
      state,
      presentation_definition: {
        id: randomUUID(),
        input_descriptors: credentialTypes.map((type: string) => ({
          id: type,
          name: `${type} Credential`,
          purpose: `We need to verify your ${type}`,
          constraints: {
            fields: [
              {
                path: ['$.vc.type', '$.type'],
                filter: {
                  type: 'array',
                  contains: { const: type },
                },
              },
            ],
          },
        })),
      },
      expires_at: Date.now() + 10 * 60 * 1000,
    };

    requestStore.set(state, presentationRequest);

    const params = new URLSearchParams({
      response_type: presentationRequest.response_type,
      response_mode: presentationRequest.response_mode,
      client_id: presentationRequest.client_id,
      client_id_scheme: presentationRequest.client_id_scheme,
      response_uri: presentationRequest.response_uri,
      nonce: presentationRequest.nonce,
      state: presentationRequest.state,
      presentation_definition: JSON.stringify(presentationRequest.presentation_definition),
    });

    const deepLink = `openid4vp://?${params.toString()}`;

    return res.json({
      state,
      nonce,
      deepLink,
      qrData: deepLink,
      presentationDefinition: presentationRequest.presentation_definition,
      expiresAt: presentationRequest.expires_at,
    });
  });

  router.get('/presentations/results/:state', (req: Request, res: Response) => {
    const result = resultStore.get(req.params.state);
    if (!result) {
      return res.status(202).json({ status: 'pending' });
    }
    return res.json({ status: 'complete', result });
  });

  return router;
}
