import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

/*
 * API route to list all saved valuations.
 *
 * In a production deployment this handler queries a PostgreSQL database via
 * Prisma to retrieve persisted valuations along with their associated drug
 * and user metadata. For this starter implementation we guard against
 * method mis use and fall back to an empty array if the database is not
 * available.
 */
const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
  try {
    const valuations = await prisma.valuation.findMany({
      include: { drug: true, user: true }
    });
    return res.status(200).json(valuations);
  } catch (err) {
    console.warn('Error fetching valuations', err);
    // return empty list if the database is not configured
    return res.status(200).json([]);
  }
}
