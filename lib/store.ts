import type { Valuation } from './types';

function randomId(len = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const memById = new Map<string, Valuation>();
const memBySlug = new Map<string, Valuation>();

export async function createValuation(v: Omit<Valuation, 'id' | 'shareSlug' | 'createdAt'>): Promise<Valuation> {
  const doc: Valuation = { id: randomId(12), shareSlug: randomId(8), createdAt: new Date().toISOString(), ...v };
  memById.set(doc.id, doc);
  memBySlug.set(doc.shareSlug, doc);
  return doc;
}

export async function getValuationByIdOrSlug(k: string) {
  return memById.get(k) || memBySlug.get(k) || null;
}
export async function getValuationBySlug(s: string) {
  return memBySlug.get(s) || null;
}
