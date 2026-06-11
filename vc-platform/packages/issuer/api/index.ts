// Vercel serverless entry point
import { createApp } from '../src/app';
import { getIssuerConfig } from '../src/config';

// Module-level promise so config is resolved once per cold start
const appPromise = getIssuerConfig().then(createApp);

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
