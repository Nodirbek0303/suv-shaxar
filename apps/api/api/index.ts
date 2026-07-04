import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createNestServer } from '../dist/create-app';

let server: Awaited<ReturnType<typeof createNestServer>> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    server = server ?? (await createNestServer());
    return server(req, res);
  } catch (err: any) {
    console.error('API bootstrap error:', err);
    res.status(500).json({
      statusCode: 500,
      message: err?.message || 'API ishga tushmadi',
      hint: 'Vercel Environment Variables: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET',
    });
  }
}
