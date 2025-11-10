export type Inputs = {
  peakSales: number;
  launchYear: number;
  loeYear: number;
  discountRate: number;
  taxRate: number;
  cogs: number;
  commercialSpend: number;
  workingCapital: number;
  potency: number;
  selectivity: number;
  halfLife: number;
  molecularWeight: number;
  logP: number;
  bioavailability: number;
  targetValidation: number;
  targetNovelty: number;
  phase: string;
  indication: string;
  royaltyMin?: number;
  royaltyMax?: number;
  royaltyRampYears?: number;
  role?: 'OWNER' | 'LICENSOR';
};

export type Outputs = {
  mechanismBonus: number;
  ptrs: number;
  devCostPV: number;
  ownerPV?: number;
  licensorPV?: number;
  rnpv: number;
  roi: number;
  baselinePos?: number;
  mechanisticPos?: number;
};

export type Valuation = {
  id: string;
  shareSlug: string;
  createdAt: string;
  inputs: Inputs;
  outputs: Outputs;
  nctId?: string;
  loeYear?: number;
  royaltyMin?: number;
  royaltyMax?: number;
  trialSponsor?: string | null;
  trialStartDate?: string | null;
};
