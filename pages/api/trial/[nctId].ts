import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { nctId } = req.query;

  // Validate nctId parameter
  if (!nctId || Array.isArray(nctId)) {
    return res.status(400).json({ error: 'Invalid NCT ID' });
  }

  try {
    // Fetch trial details from ClinicalTrials.gov v2 API
    const response = await fetch(`https://clinicaltrials.gov/api/v2/studies/${nctId}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch trial data' });
    }
    const data = await response.json() as any;

    // Attempt to extract key details from the response
    const study = (data as any).study || (data as any).studies?.[0];
    let phase: string | null = null;
    let sponsor: string | null = null;
    let startDate: string | null = null;
    let status: string | null = null;
    if (study) {
      const section = (study as any).protocolSection || study;
      phase = section.designModule?.phase?.phase || section.phase || null;
      sponsor = section.sponsorCollaboratorsModule?.leadSponsor?.name || null;
      startDate = section.statusModule?.startDateStruct?.date || null;
      status = section.statusModule?.overallStatus || null;
    }

    return res.status(200).json({
      nctId,
      phase,
      sponsor,
      startDate,
      status,
      raw: data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch trial data' });
  }
}
