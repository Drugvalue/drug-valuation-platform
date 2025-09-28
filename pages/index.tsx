import { useState, useMemo } from 'react';

/**
 * Home page for the Drug Valuation Platform.
 *
 * This component implements a complete risk‑adjusted valuation model that updates
 * in real time as the user adjusts inputs. It estimates the probability of
 * success based on clinical phase and a simple mechanism score derived from
 * preclinical properties such as potency, selectivity, half‑life and target
 * validation. Commercial parameters including peak sales, launch year,
 * loss‑of‑exclusivity (LOE) and cost assumptions feed a discounted cash flow
 * model. The result is a set of outputs: PTRS (probability × mechanism
 * multiplier), present value of development costs after tax, commercial PV
 * (given success), rNPV and ROI. All currency outputs are rounded to
 * whole numbers for clarity.
 */
export default function Home() {
  // Core drug properties
  const [phase, setPhase] = useState<string>('Preclinical');
  const [indication, setIndication] = useState<string>('Oncology');
  const [peakSales, setPeakSales] = useState<number>(500); // in millions
  const [launchYear, setLaunchYear] = useState<number>(new Date().getFullYear() + 5);
  const [loeYear, setLoeYear] = useState<number>(launchYear + 10);

  // Financial assumptions
  const [discountRate, setDiscountRate] = useState<number>(0.1); // 10%
  const [taxRate, setTaxRate] = useState<number>(0.21); // 21%
  const [cogs, setCogs] = useState<number>(0.2); // 20% cost of goods
  const [commercialSpend, setCommercialSpend] = useState<number>(0.3); // 30% SG&A
  const [workingCapital, setWorkingCapital] = useState<number>(0.05); // 5% working capital burden

  // Mechanistic properties
  const [potency, setPotency] = useState<number>(50); // IC50 in nM
  const [selectivity, setSelectivity] = useState<number>(10); // fold selectivity over off targets
  const [halfLife, setHalfLife] = useState<number>(12); // in hours
  const [molecularWeight, setMolecularWeight] = useState<number>(400); // in Daltons
  const [logP, setLogP] = useState<number>(2.0); // lipophilicity
  const [bioavailability, setBioavailability] = useState<number>(0.5); // fraction absorbed (0–1)
  const [targetValidation, setTargetValidation] = useState<number>(0.5); // evidence strength (0–1)
  const [targetNovelty, setTargetNovelty] = useState<number>(0.5); // novelty (0–1, higher = riskier)

  // Lookup tables for development costs and base approval probabilities by phase
  const devCosts: Record<string, number> = {
    Preclinical: 200,
    'Phase I': 50,
    'Phase II': 100,
    'Phase III': 200,
    NDA: 20,
    Approved: 0
  };
  const baseProbabilities: Record<string, number> = {
    Preclinical: 0.12,
    'Phase I': 0.32,
    'Phase II': 0.14,
    'Phase III': 0.4,
    NDA: 0.85,
    Approved: 1.0
  };

  // Mechanism bonus computation encapsulated in a memoized function
  const mechanismBonus = useMemo(() => {
    let bonus = 1.0;
    // potency: lower is better
    if (potency < 10) bonus += 0.1;
    else if (potency > 100) bonus -= 0.1;

    // selectivity: higher fold selectivity is better
    if (selectivity > 30) bonus += 0.1;
    else if (selectivity < 5) bonus -= 0.1;

    // half‑life: extreme half‑lives are undesirable
    if (halfLife > 24) bonus -= 0.05;
    else if (halfLife < 2) bonus -= 0.05;

    // molecular weight: values above ~500 Da often reduce oral bioavailability
    if (molecularWeight > 500) bonus -= 0.05;
    else if (molecularWeight < 200) bonus += 0.05;

    // logP: ideal lipophilicity between 1 and 3
    if (logP >= 1 && logP <= 3) bonus += 0.1;
    else bonus -= 0.05;

    // bioavailability: higher is better
    if (bioavailability > 0.5) bonus += 0.1;
    else if (bioavailability < 0.2) bonus -= 0.1;

    // target validation: strong evidence boosts likelihood
    if (targetValidation > 0.7) bonus += 0.2;
    else if (targetValidation < 0.3) bonus -= 0.1;

    // target novelty: high novelty penalised; familiarity rewarded
    if (targetNovelty > 0.7) bonus -= 0.1;
    else if (targetNovelty < 0.3) bonus += 0.1;

    // Clamp the bonus between 0.5× and 2.0× to avoid extreme effects
    return Math.min(2.0, Math.max(0.5, bonus));
  }, [potency, selectivity, halfLife, molecularWeight, logP, bioavailability, targetValidation, targetNovelty]);

  // Derived values
  const probability = baseProbabilities[phase] ?? 0;
  const devCost = devCosts[phase] ?? 0;
  const devCostPV = devCost * (1 - taxRate);
  const currentYear = new Date().getFullYear();

  // Compute the present value of net commercial cash flows assuming success
  const commercialPV = useMemo(() => {
    // treat each year from launch to LOE as constant peak sales
    if (launchYear >= loeYear) return 0;
    let pv = 0;
    const netMargin = 1 - cogs - commercialSpend - workingCapital; // pre‑tax operating margin
    for (let year = launchYear; year < loeYear; year++) {
      const t = year - currentYear;
      const cashFlow = peakSales * netMargin * (1 - taxRate);
      pv += cashFlow / Math.pow(1 + discountRate, t);
    }
    return pv;
  }, [launchYear, loeYear, cogs, commercialSpend, workingCapital, peakSales, taxRate, discountRate]);

  // Risk adjusted outputs
  const ptrs = probability * mechanismBonus;
  const rnpv = commercialPV * probability * mechanismBonus - devCostPV;
  const roi = devCostPV !== 0 ? Math.round((rnpv / devCostPV) * 100) : 0;

  // Handlers to keep LOE consistent when changing launch year or vice versa
  const handleLaunchYearChange = (year: number) => {
    setLaunchYear(year);
    if (year >= loeYear) setLoeYear(year + 1);
  };
  const handleLoeYearChange = (year: number) => {
    setLoeYear(year);
    if (year <= launchYear) setLaunchYear(year - 1);
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Drug Valuation Tool</h1>
      <p style={{ marginBottom: '1rem' }}>
        Adjust the inputs below to see how phase, commercial assumptions and mechanistic
        properties impact the risk‑adjusted net present value (rNPV), probability ×
        mechanism score (PTRS), ROI and other metrics. All monetary values are in
        millions.
      </p>

      {/* Phase and indication */}
      <section style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="phase">Phase</label>
          <select id="phase" value={phase} onChange={(e) => setPhase(e.target.value)} style={{ width: '100%', padding: '0.4rem' }}>
            {Object.keys(devCosts).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="indication">Indication</label>
          <select id="indication" value={indication} onChange={(e) => setIndication(e.target.value)} style={{ width: '100%', padding: '0.4rem' }}>
            <option value="Oncology">Oncology</option>
            <option value="Rare Disease">Rare Disease</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Neurology">Neurology</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </section>

      {/* Financial inputs */}
      <section style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="peakSales">Peak annual sales (M)</label>
          <input
            id="peakSales"
            type="number"
            min="0"
            value={peakSales}
            onChange={(e) => setPeakSales(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="launchYear">Launch year</label>
          <input
            id="launchYear"
            type="number"
            min={currentYear}
            value={launchYear}
            onChange={(e) => handleLaunchYearChange(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="loeYear">LOE year</label>
          <input
            id="loeYear"
            type="number"
            min={launchYear + 1}
            value={loeYear}
            onChange={(e) => handleLoeYearChange(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="discountRate">Discount rate</label>
          <input
            id="discountRate"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={discountRate}
            onChange={(e) => setDiscountRate(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="taxRate">Tax rate</label>
          <input
            id="taxRate"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="cogs">COGS (as fraction of sales)</label>
          <input
            id="cogs"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={cogs}
            onChange={(e) => setCogs(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="commercialSpend">Commercial spend (fraction of sales)</label>
          <input
            id="commercialSpend"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={commercialSpend}
            onChange={(e) => setCommercialSpend(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="workingCapital">Working capital burden</label>
          <input
            id="workingCapital"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={workingCapital}
            onChange={(e) => setWorkingCapital(Number(e.target.value))}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
      </section>

      {/* Mechanistic inputs */}
      <section style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Mechanistic Properties</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <label htmlFor="potency">Potency (IC50 nM)</label>
            <input
              id="potency"
              type="number"
              min="1"
              value={potency}
              onChange={(e) => setPotency(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="selectivity">Selectivity (fold)</label>
            <input
              id="selectivity"
              type="number"
              min="1"
              value={selectivity}
              onChange={(e) => setSelectivity(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="halfLife">Half‑life (hr)</label>
            <input
              id="halfLife"
              type="number"
              min="0"
              value={halfLife}
              onChange={(e) => setHalfLife(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="molecularWeight">Molecular weight (Da)</label>
            <input
              id="molecularWeight"
              type="number"
              min="0"
              value={molecularWeight}
              onChange={(e) => setMolecularWeight(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="logP">LogP</label>
            <input
              id="logP"
              type="number"
              step="0.1"
              value={logP}
              onChange={(e) => setLogP(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="bioavailability">Bioavailability (0–1)</label>
            <input
              id="bioavailability"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={bioavailability}
              onChange={(e) => setBioavailability(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="targetValidation">Target validation (0–1)</label>
            <input
              id="targetValidation"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={targetValidation}
              onChange={(e) => setTargetValidation(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
          <div>
            <label htmlFor="targetNovelty">Target novelty (0–1)</label>
            <input
              id="targetNovelty"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={targetNovelty}
              onChange={(e) => setTargetNovelty(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </div>
        </div>
      </section>

      {/* Results */}
      <section style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Outputs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div><strong>Mechanism Bonus:</strong> {mechanismBonus.toFixed(2)}</div>
          <div><strong>PTRS:</strong> {ptrs.toFixed(2)}</div>
          <div><strong>Dev cost PV (after tax):</strong> ${Math.round(devCostPV)}M</div>
          <div><strong>Commercial PV (given success):</strong> ${Math.round(commercialPV)}M</div>
          <div><strong>rNPV:</strong> ${Math.round(rnpv)}M</div>
          <div><strong>ROI:</strong> {roi}%</div>
        </div>
      </section>

      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Note: All numbers are illustrative and simplified. Users should adjust assumptions
        to reflect specific assets. ROI is calculated as rNPV divided by the present
        value of development costs.
      </p>
    </main>
  );
}
