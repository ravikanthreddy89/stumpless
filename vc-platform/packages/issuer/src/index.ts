import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generateDidKey } from './services/did';
import { metadataRouter } from './routes/metadata';
import { offerRouter } from './routes/offer';
import { tokenRouter } from './routes/token';
import { credentialRouter } from './routes/credential';
import { IssuerConfig } from './types';

const PORT = process.env.PORT || 3001;
const ISSUER_URL = process.env.ISSUER_URL || `http://localhost:${PORT}`;

async function main() {
  const { did, privateKeyBytes, publicKeyBytes } = await generateDidKey();

  const issuerConfig: IssuerConfig = {
    did,
    privateKeyBytes,
    publicKeyBytes,
    issuerUrl: ISSUER_URL,
  };

  console.log(`Issuer DID: ${did}`);

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(metadataRouter(issuerConfig));
  app.use(offerRouter(issuerConfig));
  app.use(tokenRouter(issuerConfig));
  app.use(credentialRouter(issuerConfig));

  app.get('/health', (_req, res) => res.json({ status: 'ok', did }));

  app.listen(PORT, () => {
    console.log(`Issuer API running at ${ISSUER_URL}`);
  });
}

main().catch(console.error);
