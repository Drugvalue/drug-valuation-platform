import type { NextApiRequest, NextApiResponse } from 'next';
import { getValuationBySlug } from '../../../../lib/store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });
  const doc = await getValuationBySlug(slug as string);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(doc);
}
