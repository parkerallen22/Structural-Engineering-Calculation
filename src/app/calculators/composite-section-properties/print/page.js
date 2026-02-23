'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { fmt, getSavedRun } from '../ui';

export default function CompositeSectionPrintPage() {
  const router = useRouter();
  const [run, setRun] = useState(null);
  const [includeDetails, setIncludeDetails] = useState(true);

  useEffect(() => {
    const stored = getSavedRun();
    if (!stored) {
      router.replace('/calculators/composite-section-properties');
      return;
    }
    setRun(stored);
  }, [router]);

  const stamp = useMemo(() => (run ? new Date(run.calculatedAt).toLocaleString() : ''), [run]);

  if (!run) return null;

  return (
    <div className={styles.printPage}>
      <div className={styles.printControls}>
        <Link href="/calculators/composite-section-properties/results" className={styles.secondaryButton}>Back to Results</Link>
        <label className={styles.printToggle}><input type="checkbox" checked={includeDetails} onChange={(event) => setIncludeDetails(event.target.checked)} />Include detailed calcs in print</label>
        <button type="button" className={styles.primaryButton} onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <article className={styles.paper}>
        <header className={styles.paperHeader}><h1>Composite Steel Beam + Concrete Deck Section Properties</h1><p>Calculated: {stamp}</p></header>
        <section>
          <h2>Input Summary</h2>
          <p>D = {fmt(run.input.negative.D)} in · t<sub>w</sub> = {fmt(run.input.negative.tw)} in · b<sub>eff</sub> = {fmt(run.input.negative.bEff)} in · E<sub>s</sub> = {fmt(run.input.materials.Es)} ksi</p>
        </section>
        {run.result.regions.map((region) => (
          <section key={region.key}>
            <h2>{region.label}</h2>
            <table className={styles.resultTable}>
              <thead><tr><th>Case</th><th>I (in⁴)</th><th>S top steel (in³)</th><th>S bottom steel (in³)</th></tr></thead>
              <tbody>
                <tr><td>Steel Only</td><td>{fmt(region.steelOnly.i)}</td><td>{fmt(region.steelOnly.sectionModulus.topOfSteel)}</td><td>{fmt(region.steelOnly.sectionModulus.bottomOfSteel)}</td></tr>
                <tr><td>Composite (n)</td><td>{fmt(region.compositeN.i)}</td><td>{fmt(region.compositeN.sectionModulus.topOfSteel)}</td><td>{fmt(region.compositeN.sectionModulus.bottomOfSteel)}</td></tr>
                <tr><td>Composite (3n)</td><td>{fmt(region.composite3N.i)}</td><td>{fmt(region.composite3N.sectionModulus.topOfSteel)}</td><td>{fmt(region.composite3N.sectionModulus.bottomOfSteel)}</td></tr>
              </tbody>
            </table>
            {includeDetails ? <p className={styles.eqLine}>NA(n) = {fmt(region.compositeN.yBar)} in, NA(3n) = {fmt(region.composite3N.yBar)} in, NA(cracked) = {fmt(region.crackedNegative.neutralAxis)} in</p> : null}
          </section>
        ))}
      </article>
    </div>
  );
}
