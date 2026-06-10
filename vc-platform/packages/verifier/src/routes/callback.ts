import { Router, Request, Response } from 'express';
import { requestStore, resultStore } from '../services/store';
import { verifyPresentation } from '../services/verify';
import { PresentationResponse } from '../types';

export function callbackRouter(): Router {
  const router = Router();

  router.post('/presentations/callback', async (req: Request, res: Response) => {
    const { state, vp_token, presentation_submission } = req.body as PresentationResponse;

    if (!state || !vp_token || !presentation_submission) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing required fields' });
    }

    const request = requestStore.get(state);
    if (!request) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Unknown state' });
    }

    if (Date.now() > request.expires_at) {
      requestStore.delete(state);
      return res.status(400).json({ error: 'invalid_request', error_description: 'Request expired' });
    }

    requestStore.delete(state);

    const result = await verifyPresentation({ state, vp_token, presentation_submission }, request);
    resultStore.set(state, result);

    if (result.verified) {
      return res.json({ redirect_uri: `${process.env.VERIFIER_URL || 'http://localhost:3002'}/success?state=${state}` });
    } else {
      return res.status(400).json({ error: 'invalid_presentation', error_description: result.error });
    }
  });

  return router;
}
