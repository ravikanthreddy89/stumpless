import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generateDidKey } from './services/did';
import { requestRouter } from './routes/request';
import { callbackRouter } from './routes/callback';
import { VerifierConfig } from './types';

const PORT = process.env.PORT || 3002;
const VERIFIER_URL = process.env.VERIFIER_URL || `http://localhost:${PORT}`;

async function main() {
  const { did, privateKeyBytes, publicKeyBytes } = await generateDidKey();

  const verifierConfig: VerifierConfig = {
    did,
    privateKeyBytes,
    publicKeyBytes,
    verifierUrl: VERIFIER_URL,
  };

  console.log(`Verifier DID: ${did}`);

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestRouter(verifierConfig));
  app.use(callbackRouter());

  app.get('/health', (_req, res) => res.json({ status: 'ok', did }));

  app.listen(PORT, () => {
    console.log(`Verifier API running at ${VERIFIER_URL}`);
  });
}

main().catch(console.error);
