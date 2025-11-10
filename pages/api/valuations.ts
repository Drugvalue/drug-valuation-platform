import type { NextApiRequest, NextApiResponse } from 'next';
import { createValuation } from '../../lib/store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { inputs, outputs } = req.body;
    if (!inputs || !outputs) return res.status(400).json({ error: 'inputs and outputs required' });
    const doc = await createValuation({ inputs, outputs } as any);
    res.status(200).json({ id: doc.id, shareSlug: doc.shareSlug });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
