import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { nctId } = req.query;
  if (!nctId) return res.status(400).json({ error: 'Missing NCT ID' });

  // Placeholder response
  res.status(200).json({
    phase: 'Phase 2',
    sponsor: 'Example Sponsor',
    startDate: '2024-03-01',
  });
}
