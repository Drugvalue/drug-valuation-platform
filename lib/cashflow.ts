/**
 * Cashflow/DCF helpers
 * Supports OWNER vs LICENSOR roles.
 */

export type DcfInputs = {
  currentYear: number;
  launchYear: number;
  loeYear: number;
  discountRate: number;
  taxRate: number;
  peakSales: number;
  cogs: number;
  commercialSpend: number;
  workingCapital: number;
  royaltyPctAt?: (year: number) => number;
};

export function salesAtYear(year: number, launchYear: number, loeYear: number, peak: number): number {
  if (year < launchYear || year >= loeYear) return 0;
  const ramp = 4;
  const t = year - launchYear;
  if (t <= ramp) return peak * (t / ramp);
  return peak;
}

export function pvOwner(i: DcfInputs): number {
  const net = 1 - i.cogs - i.commercialSpend - i.workingCapital;
  let pv = 0;
  for (let y = i.launchYear; y < i.loeYear; y++) {
    const cf = salesAtYear(y, i.launchYear, i.loeYear, i.peakSales) * net * (1 - i.taxRate);
    pv += cf / Math.pow(1 + i.discountRate, y - i.currentYear);
  }
  return pv;
}

export function pvLicensor(i: DcfInputs): number {
  if (!i.royaltyPctAt) return 0;
  let pv = 0;
  for (let y = i.launchYear; y < i.loeYear; y++) {
    const cf = salesAtYear(y, i.launchYear, i.loeYear, i.peakSales) * (i.royaltyPctAt(y) / 100) * (1 - i.taxRate);
    pv += cf / Math.pow(1 + i.discountRate, y - i.currentYear);
  }
  return pv;
}
