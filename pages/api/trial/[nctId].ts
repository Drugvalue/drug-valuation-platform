
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Trial helper route
 *
 * Fetches basic trial metadata from ClinicalTrials.gov for a given NCT ID. The
 * endpoint queries the classic study_fields API to retrieve selected fields
 * such as Phase, LeadSponsorName and StartDate. It then returns these values
 * to the caller. If no study is found or an error occurs, a descriptive
 * error message is returned instead.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { nctId } = req.query
  if (!nctId || Array.isArray(nctId)) {
    return res.status(400).json({ error: 'Invalid NCT ID' })
  }
  try {
    const id = String(nctId).trim()
    // Use the classic study_fields API to fetch minimal fields. See:
    // https://clinicaltrials.gov/api/gui/ref/api_urls#query-study-fields
    const apiUrl = `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(
      id
    )}&fields=NCTId,Phase,LeadSponsorName,StartDate&min_rnk=1&max_rnk=1&fmt=json`
    const response = await fetch(apiUrl)
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch trial data' })
    }
    const result = await response.json()
    const study =
      result?.StudyFieldsResponse?.StudyFields &&
      result.StudyFieldsResponse.StudyFields[0]
    if (!study) {
      return res.status(404).json({ error: 'Study not found' })
    }
    const phase = study.Phase?.[0] ?? null
    const sponsor = study.LeadSponsorName?.[0] ?? null
    const startDate = study.StartDate?.[0] ?? null
    return res.status(200).json({ phase, sponsor, startDate })
  } catch (error) {
    console.error('Error in trial API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}