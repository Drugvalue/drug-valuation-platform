import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple slug generator for shareable URLs
function generateSlug() {
  return Math.random().toString(36).substring(2, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { userEmail, drug, inputs, outputs, mechanismNote, metadata } = req.body;
      const { nctId, loeYear, royaltyMin, royaltyMax, baselinePos, mechanisticPos } = req.body;


      // Upsert or create user if email provided
      let user = null;
      if (userEmail) {
        user = await prisma.user.upsert({
          where: { email: userEmail },
          create: { email: userEmail },
          update: {},
        });
      }

      // Find or create drug record
      let drugRecord = null;
      if (drug && drug.name && drug.indication && drug.phase) {
        const existing = await prisma.drug.findFirst({
          where: {
            name: drug.name,
            indication: drug.indication,
            phase: drug.phase,
          },
        });
        if (existing) {
          drugRecord = existing;
        } else {
          drugRecord = await prisma.drug.create({
            data: {
              name: drug.name,
              indication: drug.indication,
              phase: drug.phase,
              mechanism: drug.mechanism ?? null,
            },
          });
        }
      }

      const shareSlug = generateSlug();

      const valuation = await prisma.valuation.create({
        data: {
          user: user ? { connect: { id: user.id } } : undefined,
          drug: drugRecord ? { connect: { id: drugRecord.id } } : undefined,
          inputs: inputs || {},
          outputs: outputs || {},
          
              metadata: metadata || {},
            nctId: nctId || null,
  loeYear: loeYear !== undefined ? Number(loeYear) : null,
  royaltyMin: royaltyMin !== undefined ? Number(royaltyMin) : null,
  royaltyMax: royaltyMax !== undefined ? Number(royaltyMax) : null,
  baselinePos: baselinePos !== undefined ? Number(baselinePos) : null,
  mechanisticPos: mechanisticPos !== undefined ? Number(mechanisticPos) : null,

mechanismNote: mechanismNote || null,
            shareSlug: shareSlug,
        },
      });

      return res.status(201).json({ id: valuation.id, shareSlug: valuation.shareSlug });
    }

    if (req.method === 'GET') {
      const { id, slug, userEmail, drugId } = req.query;

      // Get by id
      if (id) {
        const valuation = await prisma.valuation.findUnique({
          where: { id: Number(id) },
        });
        if (!valuation) {
          return res.status(404).json({ error: 'Not found' });
        }
        return res.status(200).json(valuation);
      }

      // Get by shareSlug
      if (slug) {
        const valuation = await prisma.valuation.findUnique({
          where: { shareSlug: String(slug) },
        });
        if (!valuation) {
          return res.status(404).json({ error: 'Not found' });
        }
        return res.status(200).json(valuation);
      }

      // List valuations by userEmail
      if (userEmail) {
        const list = await prisma.valuation.findMany({
          where: {
            user: {
              email: String(userEmail),
            },
          },
          include: { drug: true },
        });
        return res.status(200).json(list);
      }

      // List valuations by drugId
      if (drugId) {
        const list = await prisma.valuation.findMany({
          where: { drugId: Number(drugId) },
          include: { drug: true },
        });
        return res.status(200).json(list);
      }

      // Return all valuations (limited)
      const list = await prisma.valuation.findMany({
        include: { drug: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(list);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Error in /api/valuations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
