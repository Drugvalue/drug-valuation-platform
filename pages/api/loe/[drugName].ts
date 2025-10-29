import type { NextApiRequest, NextApiResponse } from 'next';

// When you have a real Orange Book integration, fetch the patents/exclusivity dates here.
// For now, return a placeholder LOE year.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { drugName } = req.query;
  if (!drugName || Array.isArray(drugName)) {
    return res.status(400).json({ error: 'Invalid drug name' });
  }
  try {
    // TODO: call FDA’s Orange Book API or your own database to determine LOE.
    const loeYear = 2035; // placeholder
    return res.status(200).json({ loeYear });
  } catch (error) {
    console.error('Error in LOE API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
