
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * LOE helper route
 *
 * Given a drug name or active ingredient in the path, this endpoint returns a
 * simple loss‑of‑exclusivity (LOE) year suggestion. At present the LOE year is
 * hard‑coded (2035) as a placeholder. In a future iteration you can replace
 * the static year with logic that queries the FDA Orange Book or another
 * database of patent and exclusivity expiry dates.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { drugName } = req.query
  if (!drugName || Array.isArray(drugName)) {
    return res.status(400).json({ error: 'Invalid drug name' })
  }
  try {
    // Normalise the name; you could use this to look up a real LOE year.
    const name = String(drugName).trim().toLowerCase()
    // Placeholder: return a fixed year regardless of the drug name.
    const loeYear = 2035
    return res.status(200).json({ loeYear })
  } catch (error) {
    console.error('Error in LOE API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}