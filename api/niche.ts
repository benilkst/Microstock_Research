import { verifyPasscode, handleNicheIdeas, formatErrorResponse } from '../lib/handlers';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
  }

  // 1. Verifikasi Kode Akses
  const passcodeHeader = req.headers['x-app-passcode'];
  const passcodeCheck = verifyPasscode(passcodeHeader);
  if (!passcodeCheck.ok) {
    return res.status(passcodeCheck.status || 401).json({
      success: false,
      error: passcodeCheck.error,
      needsPasscode: true,
    });
  }

  // 2. Eksekusi Handler
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleNicheIdeas(body);
    return res.status(200).json(result);
  } catch (error: any) {
    const { status, body } = formatErrorResponse(error);
    return res.status(status).json(body);
  }
}
