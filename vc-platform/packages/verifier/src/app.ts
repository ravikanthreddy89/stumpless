import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { VerifierConfig } from './types';
import { requestRouter } from './routes/request';
import { callbackRouter } from './routes/callback';

export function createApp(verifierConfig: VerifierConfig) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestRouter(verifierConfig));
  app.use(callbackRouter());

  app.get('/health', (_req, res) => res.json({ status: 'ok', did: verifierConfig.did }));

  return app;
}
