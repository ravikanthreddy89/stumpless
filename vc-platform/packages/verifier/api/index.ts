// Vercel serverless entry point
import { createApp } from '../src/app';
import { getVerifierConfig } from '../src/config';

const appPromise = getVerifierConfig().then(createApp);

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
