export type OrangeBookRecord = {
  applicationNumber?: string;
  productName?: string;
  patentExpiry?: string;
  exclusivityExpiry?: string;
};

export function computeLoeYearFromOrangeBook(records: OrangeBookRecord[]): number | null {
  if (!records.length) return null;
  let max = 0;
  for (const r of records) {
    for (const d of [r.patentExpiry, r.exclusivityExpiry]) {
      if (!d) continue;
      const y = new Date(d).getUTCFullYear();
      if (!isNaN(y) && y > max) max = y;
    }
  }
  return max || null;
}
