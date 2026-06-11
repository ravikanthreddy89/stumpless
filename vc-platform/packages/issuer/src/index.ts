// Local development entry point
import { createApp } from './app';
import { getIssuerConfig } from './config';

const PORT = process.env.PORT || 3001;

async function main() {
  const issuerConfig = await getIssuerConfig();
  console.log(`Issuer DID: ${issuerConfig.did}`);
  const app = createApp(issuerConfig);
  app.listen(PORT, () => console.log(`Issuer API running at http://localhost:${PORT}`));
}

main().catch(console.error);
