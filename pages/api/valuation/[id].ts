import type { NextApiRequest, NextApiResponse } from 'next';
import { getValuationByIdOrSlug } from '../../../lib/store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const doc = await getValuationByIdOrSlug(id as string);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(doc);
}
