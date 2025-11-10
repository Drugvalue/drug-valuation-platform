import { useState, useMemo, useEffect } from 'react';
import { Toast, ToastKind } from '../components/Toast';
import { pvOwner, pvLicensor } from '../lib/cashflow';
import { royaltyAtYear, averageRoyalty } from '../lib/royalty';

type Role = 'OWNER' | 'LICENSOR';

export default function Home() {
  // Core setup
  const [phase, setPhase] = useState('Preclinical');
  const [indication, setIndication] = useState('Oncology');
  const [role, setRole] = useState<Role>('OWNER');

  // Commercial & financials
  const [peakSales, setPeakSales] = useState(500);
  const [launchYear, setLaunchYear] = useState(new Date().getFullYear() + 5);
  const [loeYear, setLoeYear] = useState(launchYear + 10);
  const [discountRate, setDiscountRate] = useState(0.1);
  const [taxRate, setTaxRate] = useState(0.21);
  const [cogs, setCogs] = useState(0.2);
  const [commercialSpend, setCommercialSpend] = useState(0.3);
  const [workingCapital, setWorkingCapital] = useState(0.05);
  const [royaltyMin, setRoyaltyMin] = useState(5);
  const [royaltyMax, setRoyaltyMax] = useState(12);
  const [royaltyRampYears, setRoyaltyRampYears] = useState(3);

  // Mechanistic
  const [potency, setPotency] = useState(50);
  const [selectivity, setSelectivity] = useState(10);
  const [halfLife, setHalfLife] = useState(12);
  const [molecularWeight, setMolecularWeight] = useState(400);
  const [logP, setLogP] = useState(2.0);
  const [bioavailability, setBioavailability] = useState(0.5);
  const [targetValidation, setTargetValidation] = useState(0.5);
  const [targetNovelty, setTargetNovelty] = useState(0.5);

  // Other
  const [nctId, setNctId] = useState('');
  const [trialSponsor, setTrialSponsor] = useState<string | null>(null);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [loeSource, setLoeSource] = useState<string | null>(null);

  const [baselinePos, setBaselinePos] = useState(0);
  const [mechanisticPos, setMechanisticPos] = useState(0);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Toasts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<ToastKind>('info');
  const notify = (msg: string, kind: ToastKind = 'info') => {
    setToastMsg(msg);
    setToastKind(kind);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Tables
  const devCosts: Record<string, number> = {
    Preclinical: 200,
    'Phase I': 50,
    'Phase II': 100,
    'Phase III': 200,
    NDA: 20,
    Approved: 0,
  };
  const baseProbabilities: Record<string, number> = {
    Preclinical: 0.12,
    'Phase I': 0.32,
    'Phase II': 0.14,
    'Phase III': 0.4,
    NDA: 0.85,
    Approved: 1.0,
  };

  // Mechanistic multiplier
  const mechanismBonus = useMemo(() => {
    let bonus = 1.0;
    if (potency < 10) bonus += 0.1;
    else if (potency > 100) bonus -= 0.1;
    if (selectivity > 30) bonus += 0.1;
    else if (selectivity < 5) bonus -= 0.1;
    if (halfLife > 24) bonus -= 0.05;
    else if (halfLife < 2) bonus -= 0.05;
    if (molecularWeight > 500) bonus -= 0.05;
    else if (molecularWeight < 200) bonus += 0.05;
    if (logP >= 1 && logP <= 3) bonus += 0.1;
    else bonus -= 0.05;
    if (bioavailability > 0.5) bonus += 0.1;
    else if (bioavailability < 0.2) bonus -= 0.1;
    if (targetValidation > 0.7) bonus += 0.2;
    else if (targetValidation < 0.3) bonus -= 0.1;
    if (targetNovelty > 0.7) bonus -= 0.1;
    else if (targetNovelty < 0.3) bonus += 0.1;
    return Math.min(2.0, Math.max(0.5, bonus));
  }, [potency, selectivity, halfLife, molecularWeight, logP, bioavailability, targetValidation, targetNovelty]);

  const probability = baseProbabilities[phase] ?? 0;
  const devCost = devCosts[phase] ?? 0;
  const devCostPV = devCost * (1 - taxRate);
  const currentYear = new Date().getFullYear();

  // Auto PoS calculation
  useEffect(() => {
    const base = baseProbabilities[phase] ?? 0;
    setBaselinePos(base);
    setMechanisticPos(base * mechanismBonus);
  }, [phase, mechanismBonus]);

  // DCF
  const ownerPV = useMemo(() =>
    pvOwner({ currentYear, launchYear, loeYear, discountRate, taxRate, peakSales, cogs, commercialSpend, workingCapital }),
    [currentYear, launchYear, loeYear, discountRate, taxRate, peakSales, cogs, commercialSpend, workingCapital]
  );
  const licensorPV = useMemo(() =>
    pvLicensor({
      currentYear,
      launchYear,
      loeYear,
      discountRate,
      taxRate,
      peakSales,
      royaltyPctAt: (y) => royaltyAtYear(y, launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears),
      cogs: 0, commercialSpend: 0, workingCapital: 0,
    }),
    [currentYear, launchYear, loeYear, discountRate, taxRate, peakSales, royaltyMin, royaltyMax, royaltyRampYears]
  );

  const selectedPV = role === 'OWNER' ? ownerPV : licensorPV;
  const ptrs = probability * mechanismBonus;
  const rnpv = selectedPV * ptrs - devCostPV;
  const roi = devCostPV !== 0 ? Math.round((rnpv / devCostPV) * 100) : 0;
  const avgRoyalty = useMemo(
    () => averageRoyalty(launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears),
    [launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears]
  );

  // --- API helpers ---
  const getLoeFromApi = async (name: string) => {
    if (!name?.trim()) return notify('Enter a drug or indication', 'error');
    const res = await fetch(`/api/loe/${encodeURIComponent(name.trim())}`);
    const data = await res.json();
    if (res.ok && data.loeYear) {
      setLoeYear(data.loeYear);
      setLoeSource(data.source || null);
      notify(`LOE set to ${data.loeYear}`, 'success');
    } else notify('LOE lookup failed', 'error');
  };

  const getTrialFromApi = async (id: string) => {
    if (!id?.trim()) return notify('Enter an NCT ID', 'error');
    const res = await fetch(`/api/trial/${encodeURIComponent(id.trim())}`);
    const data = await res.json();
    if (res.ok) {
      setTrialSponsor(data.sponsor);
      setTrialStartDate(data.startDate);
      if (data.phase) setPhase(data.phase);
      notify('Trial data updated', 'success');
    } else notify('Trial lookup failed', 'error');
  };

  const saveValuation = async () => {
    const res = await fetch('/api/valuations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: {
          peakSales, launchYear, loeYear, discountRate, taxRate, cogs,
          commercialSpend, workingCapital, potency, selectivity, halfLife,
          molecularWeight, logP, bioavailability, targetValidation, targetNovelty,
          phase, indication, royaltyMin, royaltyMax, royaltyRampYears, role,
        },
        outputs: { mechanismBonus, ptrs, devCostPV, ownerPV, licensorPV, rnpv, roi, baselinePos, mechanisticPos },
        nctId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShareLink(`${window.location.origin}/api/valuation/share/${data.shareSlug}`);
      notify('Valuation saved', 'success');
    } else notify('Save failed', 'error');
  };

  const loadValuation = async (id: string) => {
    if (!id.trim()) return notify('Enter an ID or slug', 'error');
    const res = await fetch(`/api/valuation/${encodeURIComponent(id.trim())}`);
    const data = await res.json();
    if (!res.ok) return notify('Load failed', 'error');
    const { inputs } = data;
    setPeakSales(inputs.peakSales);
    setLaunchYear(inputs.launchYear);
    setLoeYear(inputs.loeYear);
    setDiscountRate(inputs.discountRate);
    setTaxRate(inputs.taxRate);
    setCogs(inputs.cogs);
    setCommercialSpend(inputs.commercialSpend);
    setWorkingCapital(inputs.workingCapital);
    setPhase(inputs.phase);
    setIndication(inputs.indication);
    setRole(inputs.role || 'OWNER');
    setRoyaltyMin(inputs.royaltyMin);
    setRoyaltyMax(inputs.royaltyMax);
    setRoyaltyRampYears(inputs.royaltyRampYears);
    notify('Valuation loaded', 'success');
  };

  // UI ------------------------------------------------------------------------
  return (
    <main style={{ padding: '2rem', maxWidth: '980px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Drug Valuation Tool</h1>
      {toastMsg && (
        <div style={{ marginBottom: '0.75rem' }}>
          <Toast message={toastMsg} kind={toastKind} />
        </div>
      )}

      <section style={{ marginBottom: '1rem' }}>
        <strong>Mode:</strong>{' '}
        <label><input type="radio" checked={role === 'OWNER'} onChange={() => setRole('OWNER')} /> Owner</label>{' '}
        <label><input type="radio" checked={role === 'LICENSOR'} onChange={() => setRole('LICENSOR')} /> Licensor</label>
      </section>

      <section style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label>Phase</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} style={{ width: '100%' }}>
            {Object.keys(devCosts).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Indication</label>
          <select value={indication} onChange={(e) => setIndication(e.target.value)} style={{ width: '100%' }}>
            <option>Oncology</option>
            <option>Cardiovascular</option>
            <option>Rare Disease</option>
            <option>Neurology</option>
          </select>
        </div>
      </section>

      {/* Financial Inputs */}
      <section style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div><label>Peak sales (M)</label><input type="number" value={peakSales} onChange={(e) => setPeakSales(+e.target.value)} /></div>
        <div><label>Launch year</label><input type="number" value={launchYear} onChange={(e) => setLaunchYear(+e.target.value)} /></div>
        <div><label>LOE year</label><input type="number" value={loeYear} onChange={(e) => setLoeYear(+e.target.value)} /></div>
        <div><button onClick={() => getLoeFromApi(indication)}>Get LOE</button></div>
      </section>

      {/* Outputs */}
      <section style={{ marginBottom: '1rem' }}>
        <h2>Outputs</h2>
        <p>Baseline PoS: {(baselinePos * 100).toFixed(1)}%</p>
        <p>Mechanistic PoS: {(mechanisticPos * 100).toFixed(1)}%</p>
        <p>Mechanism Bonus: {mechanismBonus.toFixed(2)}</p>
        <p>PTRS: {ptrs.toFixed(2)}</p>
        <p>rNPV: ${Math.round(rnpv)}M</p>
        <p>ROI: {roi}%</p>
        <p>Owner PV: ${Math.round(ownerPV)}M</p>
        <p>Licensor PV: ${Math.round(licensorPV)}M</p>
        <p>Avg Royalty: {avgRoyalty.toFixed(2)}%</p>
      </section>

      {/* Actions */}
      <section>
        <h3>Save / Load</h3>
        <button onClick={saveValuation}>Save Valuation</button>
        {shareLink && (
          <p>
            <strong>Share link:</strong>{' '}
            <a href={shareLink} target="_blank">{shareLink}</a>
          </p>
        )}
        <input placeholder="Enter ID or slug" value={nctId} onChange={(e) => setNctId(e.target.value)} />
        <button onClick={() => loadValuation(nctId)}>Load Valuation</button>
      </section>
    </main>
  );
}
