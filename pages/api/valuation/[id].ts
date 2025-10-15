import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    let valuation;
    if (!isNaN(Number(id))) {
      valuation = await prisma.valuation.findUnique({ where: { id: Number(id) } });
    } else {
      valuation = await prisma.valuation.findUnique({ where: { shareSlug: String(id) } });
    }
    if (!valuation) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json(valuation);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
