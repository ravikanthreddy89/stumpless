// Local development entry point
import { createApp } from './app';
import { getVerifierConfig } from './config';

const PORT = process.env.PORT || 3002;

async function main() {
  const verifierConfig = await getVerifierConfig();
  console.log(`Verifier DID: ${verifierConfig.did}`);
  const app = createApp(verifierConfig);
  app.listen(PORT, () => console.log(`Verifier API running at http://localhost:${PORT}`));
}

main().catch(console.error);
