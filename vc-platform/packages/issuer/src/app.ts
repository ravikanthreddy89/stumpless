import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { IssuerConfig } from './types';
import { metadataRouter } from './routes/metadata';
import { offerRouter } from './routes/offer';
import { tokenRouter } from './routes/token';
import { credentialRouter } from './routes/credential';

export function createApp(issuerConfig: IssuerConfig) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(metadataRouter(issuerConfig));
  app.use(offerRouter(issuerConfig));
  app.use(tokenRouter(issuerConfig));
  app.use(credentialRouter(issuerConfig));

  app.get('/health', (_req, res) => res.json({ status: 'ok', did: issuerConfig.did }));

  return app;
}
