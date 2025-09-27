import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

/*
 * API route to create a single valuation. Expects a JSON body with fields
 * matching the Valuation model. For demonstration purposes, no rigorous
 * validation is performed. In a production deployment you should validate
 * inputs and secure user authentication.
 */

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const data = req.body;
      // Basic type casting to satisfy Prisma; real implementation would validate these
      const valuation = await prisma.valuation.create({ data });
      return res.status(201).json(valuation);
    } catch (err) {
      console.error('Error creating valuation', err);
      return res.status(400).json({ message: 'Failed to create valuation' });
    }
  }
  // For any other method return 405
  res.setHeader('Allow', ['POST']);
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}
