import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { drugName } = req.query;
  if (!drugName) return res.status(400).json({ error: 'Missing drug name' });

  // Placeholder LOE estimation
  const loeYear = new Date().getFullYear() + 10;
  res.status(200).json({ loeYear, source: 'placeholder' });
}
