import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createVercelApp } from '../src/vercel/app';

let app: Awaited<ReturnType<typeof createVercelApp>> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    app = app ?? (await createVercelApp());
    return app(req, res);
  } catch (err: any) {
    console.error('API crash:', err);
    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: err?.message || 'API ishga tushmadi',
        hint: 'Vercel env: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET',
      });
    }
  }
}
