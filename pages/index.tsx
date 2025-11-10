import { useState, useMemo, useEffect } from 'react';
import { Toast, ToastKind } from '../components/Toast';
import { pvOwner, pvLicensor } from '../lib/cashflow';
import { royaltyAtYear, averageRoyalty } from '../lib/royalty';

type Role = 'OWNER' | 'LICENSOR';

export default function Home() {
  // Core state
  const [phase, setPhase] = useState<string>('Preclinical');
  const [indication, setIndication] = useState<string>('Oncology');
  const [role, setRole] = useState<Role>('OWNER');

  // Commercial/financial inputs
  const [peakSales, setPeakSales] = useState<number>(500); // M
  const [launchYear, setLaunchYear] = useState<number>(new Date().getFullYear() + 5);
  const [loeYear, setLoeYear] = useState<number>(launchYear + 10);
  const [discountRate, setDiscountRate] = useState<number>(0.10);
  const [taxRate, setTaxRate] = useState<number>(0.21);
  const [cogs, setCogs] = useState<number>(0.20);
  const [commercialSpend, setCommercialSpend] = useState<number>(0.30);
  const [workingCapital, setWorkingCapital] = useState<number>(0.05);

  // Licensing inputs
  const [royaltyMin, setRoyaltyMin] = useState<number>(5);
  const [royaltyMax, setRoyaltyMax] = useState<number>(12);
  const [royaltyRampYears, setRoyaltyRampYears] = useState<number>(3);

  // Mechanistic inputs
  const [potency, setPotency] = useState<number>(50); // nM
  const [selectivity, setSelectivity] = useState<number>(10); // fold
  const [halfLife, setHalfLife] = useState<number>(12); // hr
  const [molecularWeight, setMolecularWeight] = useState<number>(400); // Da
  const [logP, setLogP] = useState<number>(2.0);
  const [bioavailability, setBioavailability] = useState<number>(0.5); // 0-1
  const [targetValidation, setTargetValidation] = useState<number>(0.5); // 0-1
  const [targetNovelty, setTargetNovelty] = useState<number>(0.5); // 0-1

  // Trial/LOE helpers
  const [nctId, setNctId] = useState<string>('');
  const [trialSponsor, setTrialSponsor] = useState<string | null>(null);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [loeSource, setLoeSource] = useState<string | null>(null);

  // PoS tracking (for display/exports)
  const [baselinePos, setBaselinePos] = useState<number>(0);
  const [mechanisticPos, setMechanisticPos] = useState<number>(0);

  // Save/Load/Share
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loadId, setLoadId] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Toasts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<ToastKind>('info');
  const notify = (message: string, kind: ToastKind = 'info') => {
    setToastMsg(message);
    setToastKind(kind);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Lookups
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
    'Phase III': 0.40,
    NDA: 0.85,
    Approved: 1.0,
  };

  // Mechanism bonus (bounded 0.5x..2.0x)
  const mechanismBonus = useMemo(() => {
    let b = 1.0;
    if (potency < 10) b += 0.10; else if (potency > 100) b -= 0.10;
    if (selectivity > 30) b += 0.10; else if (selectivity < 5) b -= 0.10;
    if (halfLife > 24) b -= 0.05; else if (halfLife < 2) b -= 0.05;
    if (molecularWeight > 500) b -= 0.05; else if (molecularWeight < 200) b += 0.05;
    if (logP >= 1 && logP <= 3) b += 0.10; else b -= 0.05;
    if (bioavailability > 0.5) b += 0.10; else if (bioavailability < 0.2) b -= 0.10;
    if (targetValidation > 0.7) b += 0.20; else if (targetValidation < 0.3) b -= 0.10;
    if (targetNovelty > 0.7) b -= 0.10; else if (targetNovelty < 0.3) b += 0.10;
    return Math.min(2.0, Math.max(0.5, b));
  }, [potency, selectivity, halfLife, molecularWeight, logP, bioavailability, targetValidation, targetNovelty]);

  // Derived basics
  const probability = baseProbabilities[phase] ?? 0;
  const devCostPV = (devCosts[phase] ?? 0) * (1 - taxRate);
  const currentYear = new Date().getFullYear();

  // Auto-derive PoS display
  useEffect(() => {
    const base = baseProbabilities[phase] ?? 0;
    setBaselinePos(base);
    setMechanisticPos(base * mechanismBonus);
  }, [phase, mechanismBonus]);

  // PVs
  const ownerPV = useMemo(() => pvOwner({
    currentYear, launchYear, loeYear, discountRate, taxRate,
    peakSales, cogs, commercialSpend, workingCapital
  }), [currentYear, launchYear, loeYear, discountRate, taxRate, peakSales, cogs, commercialSpend, workingCapital]);

  const licensorPV = useMemo(() => pvLicensor({
    currentYear, launchYear, loeYear, discountRate, taxRate, peakSales,
    royaltyPctAt: (y) => royaltyAtYear(y, launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears),
    cogs: 0, commercialSpend: 0, workingCapital: 0
  }), [currentYear, launchYear, loeYear, discountRate, taxRate, peakSales, royaltyMin, royaltyMax, royaltyRampYears]);

  // Risk-adjusted outputs
  const selectedPV = role === 'OWNER' ? ownerPV : licensorPV;
  const ptrs = probability * mechanismBonus;
  const rnpv = selectedPV * ptrs - devCostPV;
  const roi = devCostPV !== 0 ? Math.round((rnpv / devCostPV) * 100) : 0;
  const avgRoyalty = useMemo(
    () => averageRoyalty(launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears),
    [launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears]
  );

  // Launch/LOE coupling
  const handleLaunchYearChange = (y: number) => {
    setLaunchYear(y);
    if (y >= loeYear) setLoeYear(y + 1);
  };
  const handleLoeYearChange = (y: number) => {
    setLoeYear(y);
    if (y <= launchYear) setLaunchYear(y - 1);
  };

  // Helpers to gather payloads
  const getInputs = () => ({
    peakSales, launchYear, loeYear, discountRate, taxRate, cogs, commercialSpend, workingCapital,
    potency, selectivity, halfLife, molecularWeight, logP, bioavailability, targetValidation, targetNovelty,
    phase, indication, royaltyMin, royaltyMax, royaltyRampYears, role
  });
  const getOutputs = () => ({
    mechanismBonus, ptrs, devCostPV, ownerPV, licensorPV, rnpv, roi, baselinePos, mechanisticPos
  });

  // API calls
  const getLoeFromApi = async (drugOrIndication: string) => {
    const key = (drugOrIndication || indication || '').trim();
    if (!key) return notify('Enter a drug or choose an indication', 'error');
    try {
      const res = await fetch(`/api/loe/${encodeURIComponent(key)}`);
      const data = await res.json();
      if (res.ok && typeof data.loeYear === 'number') {
        setLoeYear(data.loeYear);
        setLoeSource(data.source || 'placeholder');
        notify(`LOE set to ${data.loeYear}`, 'success');
      } else notify('LOE lookup returned no year.', 'error');
    } catch { notify('LOE lookup failed.', 'error'); }
  };

  const normalizePhase = (p?: string) => {
    if (!p) return;
    const t = p.toLowerCase();
    if (t.includes('phase 1') || t.includes('phase i')) return 'Phase I';
    if (t.includes('phase 2') || t.includes('phase ii')) return 'Phase II';
    if (t.includes('phase 3') || t.includes('phase iii')) return 'Phase III';
    if (t.includes('nda') || t.includes('bla')) return 'NDA';
    if (t.includes('approved')) return 'Approved';
    if (t.includes('pre') || t.includes('nonclinical')) return 'Preclinical';
    if (t.includes('2/3')) return 'Phase III';
    if (t.includes('1/2')) return 'Phase II';
    return;
    // (If none match, leave as-is; user can adjust)
  };

  const getTrialFromApi = async (id: string) => {
    const key = id?.trim();
    if (!key) return notify('Enter an NCT ID first.', 'error');
    try {
      const res = await fetch(`/api/trial/${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) return notify(data?.error ?? 'Trial lookup failed.', 'error');
      const mapped = normalizePhase(data.phase);
      if (mapped) setPhase(mapped);
      setTrialSponsor(data.sponsor ?? null);
      setTrialStartDate(data.startDate ?? null);
      notify('Trial fetched.', 'success');
    } catch { notify('Trial lookup failed.', 'error'); }
  };

  const saveValuation = async () => {
    setSaveError(null);
    try {
      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: getInputs(), outputs: getOutputs(), nctId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed: ${res.status}`);
      setShareLink(`${window.location.origin}/api/valuation/share/${data.shareSlug}`);
      notify('Valuation saved.', 'success');
    } catch (e: any) {
      setSaveError(e.message || 'Error saving valuation');
      notify('Save failed.', 'error');
    }
  };

  const loadValuation = async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/valuation/${encodeURIComponent(loadId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed: ${res.status}`);

      const i = data.inputs || {};
      setPeakSales(i.peakSales); setLaunchYear(i.launchYear); setLoeYear(i.loeYear);
      setDiscountRate(i.discountRate); setTaxRate(i.taxRate); setCogs(i.cogs);
      setCommercialSpend(i.commercialSpend); setWorkingCapital(i.workingCapital);
      setPotency(i.potency); setSelectivity(i.selectivity); setHalfLife(i.halfLife);
      setMolecularWeight(i.molecularWeight); setLogP(i.logP); setBioavailability(i.bioavailability);
      setTargetValidation(i.targetValidation); setTargetNovelty(i.targetNovelty);
      setPhase(i.phase); setIndication(i.indication);
      setRoyaltyMin(i.royaltyMin ?? 5); setRoyaltyMax(i.royaltyMax ?? 12);
      setRoyaltyRampYears(i.royaltyRampYears ?? 3);
      setRole((i.role as Role) ?? 'OWNER');

      if (data.outputs?.baselinePos != null) setBaselinePos(data.outputs.baselinePos);
      if (data.outputs?.mechanisticPos != null) setMechanisticPos(data.outputs.mechanisticPos);

      setShareLink(`${window.location.origin}/api/valuation/share/${data.shareSlug}`);
      notify('Valuation loaded.', 'success');
    } catch (e: any) {
      setLoadError(e.message || 'Error loading valuation');
      notify('Load failed.', 'error');
    }
  };

  // Exports
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ inputs: getInputs(), outputs: getOutputs() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `valuation_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const i = getInputs(); const o = getOutputs();
    const header = [
      'timestamp','role','phase','indication','peakSales','launchYear','loeYear','discountRate','taxRate','cogs','commercialSpend','workingCapital',
      'potency','selectivity','halfLife','molecularWeight','logP','bioavailability','targetValidation','targetNovelty',
      'mechanismBonus','ptrs','devCostPV','ownerPV','licensorPV','rnpv','roi','baselinePos','mechanisticPos','avgRoyaltyPct','royaltyMin','royaltyMax','royaltyRampYears'
    ];
    const row = [
      new Date().toISOString(), i.role, i.phase, i.indication, i.peakSales, i.launchYear, i.loeYear, i.discountRate, i.taxRate, i.cogs, i.commercialSpend, i.workingCapital,
      i.potency, i.selectivity, i.halfLife, i.molecularWeight, i.logP, i.bioavailability, i.targetValidation, i.targetNovelty,
      o.mechanismBonus, o.ptrs, o.devCostPV, o.ownerPV, o.licensorPV, o.rnpv, o.roi, o.baselinePos, o.mechanisticPos,
      averageRoyalty(launchYear, loeYear, royaltyMin, royaltyMax, royaltyRampYears).toFixed(2), i.royaltyMin, i.royaltyMax, i.royaltyRampYears
    ];
    const csv = [header.join(','), row.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `valuation_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // UI
  return (
    <main style={{ padding: '2rem', maxWidth: '980px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Drug Valuation Tool</h1>
      {toastMsg && <div style={{ marginBottom: '0.75rem' }}><Toast message={toastMsg} kind={toastKind} /></div>}

      {/* Mode */}
      <section style={{ marginBottom: '1rem' }}>
        <strong>Mode:</strong>{' '}
        <label><input type="radio" checked={role==='OWNER'} onChange={() => setRole('OWNER')} /> Owner</label>{' '}
        <label><input type="radio" checked={role==='LICENSOR'} onChange={() => setRole('LICENSOR')} /> Licensor</label>
      </section>

      {/* Phase & Indication */}
      <section style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label>Phase</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} style={{ width: '100%', padding: '0.4rem' }}>
            {Object.keys(devCosts).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label>Indication</label>
          <select value={indication} onChange={(e) => setIndication(e.target.value)} style={{ width: '100%', padding: '0.4rem' }}>
            <option>Oncology</option>
            <option>Rare Disease</option>
            <option>Cardiovascular</option>
            <option>Neurology</option>
            <option>Other</option>
          </select>
        </div>
      </section>

      {/* Financial & Licensing Inputs */}
      <section style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div><label>Peak annual sales (M)</label><input type="number" min={0} value={peakSales} onChange={(e) => setPeakSales(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>Launch year</label><input type="number" min={currentYear} value={launchYear} onChange={(e) => handleLaunchYearChange(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div>
          <label>LOE year</label>
          <input type="number" min={launchYear + 1} value={loeYear} onChange={(e) => handleLoeYearChange(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} />
          <button type="button" onClick={() => getLoeFromApi(indication)} style={{ marginTop: '0.5rem', padding: '0.4rem' }}>Get LOE</button>
          {loeSource && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 4 }}>Source: {loeSource}</div>}
        </div>
        <div><label>Discount rate</label><input type="number" min={0} max={1} step="0.01" value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>Tax rate</label><input type="number" min={0} max={1} step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>COGS (fraction of sales)</label><input type="number" min={0} max={1} step="0.01" value={cogs} onChange={(e) => setCogs(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>Commercial spend (fraction)</label><input type="number" min={0} max={1} step="0.01" value={commercialSpend} onChange={(e) => setCommercialSpend(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>Working capital (fraction)</label><input type="number" min={0} max={1} step="0.01" value={workingCapital} onChange={(e) => setWorkingCapital(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>

        {/* Licensing */}
        <div><label>Royalty Min (%)</label><input type="number" value={royaltyMin} onChange={(e) => setRoyaltyMin(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>Royalty Max (%)</label><input type="number" value={royaltyMax} onChange={(e) => setRoyaltyMax(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        <div><label>Royalty Ramp Years</label><input type="number" min={0} max={10} value={royaltyRampYears} onChange={(e) => setRoyaltyRampYears(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>

        {/* Trial */}
        <div>
          <label>NCT ID</label>
          <input type="text" value={nctId} onChange={(e) => setNctId(e.target.value)} style={{ width: '100%', padding: '0.4rem' }} />
          <button type="button" onClick={() => getTrialFromApi(nctId)} style={{ marginTop: '0.5rem', padding: '0.4rem' }}>Fetch Trial</button>
          {(trialSponsor || trialStartDate) && (
            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 4 }}>
              {trialSponsor && <div><strong>Sponsor:</strong> {trialSponsor}</div>}
              {trialStartDate && <div><strong>Start:</strong> {trialStartDate}</div>}
            </div>
          )}
        </div>
      </section>

      {/* Mechanistic */}
      <section style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Mechanistic Properties</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div><label>Potency (IC50 nM)</label><input type="number" min={1} value={potency} onChange={(e) => setPotency(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>Selectivity (fold)</label><input type="number" min={1} value={selectivity} onChange={(e) => setSelectivity(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>Half-life (hr)</label><input type="number" min={0} value={halfLife} onChange={(e) => setHalfLife(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>Molecular weight (Da)</label><input type="number" min={0} value={molecularWeight} onChange={(e) => setMolecularWeight(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>LogP</label><input type="number" step="0.1" value={logP} onChange={(e) => setLogP(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>Bioavailability (0–1)</label><input type="number" min={0} max={1} step="0.01" value={bioavailability} onChange={(e) => setBioavailability(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>Target validation (0–1)</label><input type="number" min={0} max={1} step="0.01" value={targetValidation} onChange={(e) => setTargetValidation(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
          <div><label>Target novelty (0–1)</label><input type="number" min={0} max={1} step="0.01" value={targetNovelty} onChange={(e) => setTargetNovelty(Number(e.target.value))} style={{ width: '100%', padding: '0.4rem' }} /></div>
        </div>
      </section>

      {/* Outputs */}
      <section style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Outputs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div><strong>Mechanism Bonus:</strong> {mechanismBonus.toFixed(2)}</div>
          <div><strong>PTRS:</strong> {ptrs.toFixed(2)}</div>
          <div><strong>Baseline PoS:</strong> {(baselinePos * 100).toFixed(1)}%</div>
          <div><strong>Mechanistic PoS:</strong> {(mechanisticPos * 100).toFixed(1)}%</div>
          <div><strong>Owner PV (success):</strong> ${Math.round(ownerPV)}M</div>
          <div><strong>Licensor PV (success):</strong> ${Math.round(licensorPV)}M</div>
          <div><strong>Selected PV (mode):</strong> ${Math.round(selectedPV)}M</div>
          <div><strong>rNPV:</strong> ${Math.round(rnpv)}M</div>
          <div><strong>ROI:</strong> {roi}%</div>
          <div><strong>Avg Royalty (est.):</strong> {avgRoyalty.toFixed(2)}%</div>
        </div>
      </section>

      {/* Save, Load, Export */}
      <section style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Save, Load, Share & Export</h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <button onClick={saveValuation} style={{ padding: '0.4rem', marginRight: '0.5rem' }}>Save Valuation</button>
          {saveError && <span style={{ color: 'red' }}>{saveError}</span>}
        </div>
        {shareLink && (
          <div style={{ marginBottom: '0.5rem' }}>
            <span><strong>Share URL:</strong> </span>
            <a href={shareLink} target="_blank" rel="noopener noreferrer">{shareLink}</a>
          </div>
        )}
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            type="text"
            placeholder="Enter ID or slug"
            value={loadId}
            onChange={(e) => setLoadId(e.target.value)}
            style={{ padding: '0.4rem', marginRight: '0.5rem' }}
          />
          <button onClick={loadValuation} style={{ padding: '0.4rem' }}>Load Valuation</button>
          {loadError && <span style={{ color: 'red' }}>{loadError}</span>}
        </div>
        <div>
          <button onClick={exportJSON} style={{ padding: '0.4rem', marginRight: '0.5rem' }}>Export JSON</button>
          <button onClick={exportCSV} style={{ padding: '0.4rem' }}>Export CSV</button>
        </div>
      </section>

      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Toggle mode to value the asset as an OWNER vs a LICENSOR. rNPV/ROI use the selected mode’s PV.
      </p>
    </main>
  );
}
