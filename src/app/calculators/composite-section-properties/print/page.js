'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { InputSummary, fmt, getSavedRun } from '../ui';
import { ExpandedCalculations } from '../expanded-calculations';

function SummaryTable({ region }) {
  const regionSuffix = region.key === 'both' ? ' Positive and Negative Region' : '';
  const steelSummary = region.useAiscManual && region.steelOnlyDisplay
    ? {
      i: region.steelOnlyDisplay.i,
      topOfSteel: region.steelOnlyDisplay.topOfSteel,
      bottomOfSteel: region.steelOnlyDisplay.bottomOfSteel,
      yBar: region.steelOnly.yBar,
    }
    : {
      i: region.steelOnly.i,
      topOfSteel: region.steelOnly.sectionModulus.topOfSteel,
      bottomOfSteel: region.steelOnly.sectionModulus.bottomOfSteel,
      yBar: region.steelOnly.yBar,
    };
  return (
    <table className={styles.resultTable}>
      <thead>
        <tr>
          <th>Case</th>
          <th>I (in⁴)</th>
          <th>S<sub>top slab</sub> (in³)</th>
          <th>S<sub>top steel</sub> (in³)</th>
          <th>S<sub>bottom steel</sub> (in³)</th>
          <th>NA from steel bottom (in)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Non-Composite (Steel Only)</td><td>{fmt(steelSummary.i)}</td><td>—</td><td>{fmt(steelSummary.topOfSteel)}</td><td>{fmt(steelSummary.bottomOfSteel)}</td><td>{fmt(steelSummary.yBar)}</td></tr>
        <tr><td>{`Composite (n)${regionSuffix}`}</td><td>{fmt(region.compositeN.i)}</td><td>{fmt(region.compositeN.sectionModulus.topOfSlab)}</td><td>{fmt(region.compositeN.sectionModulus.topOfSteel)}</td><td>{fmt(region.compositeN.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.compositeN.yBar)}</td></tr>
        <tr><td>{`Composite (3n)${regionSuffix}`}</td><td>{fmt(region.composite3N.i)}</td><td>{fmt(region.composite3N.sectionModulus.topOfSlab)}</td><td>{fmt(region.composite3N.sectionModulus.topOfSteel)}</td><td>{fmt(region.composite3N.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.composite3N.yBar)}</td></tr>
        <tr><td>{`Composite (cr)${regionSuffix}`}</td><td>{fmt(region.compositeCr.i)}</td><td>{fmt(region.compositeCr.sectionModulus.topOfSlab)}</td><td>{fmt(region.compositeCr.sectionModulus.topOfSteel)}</td><td>{fmt(region.compositeCr.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.compositeCr.yBar)}</td></tr>
      </tbody>
    </table>
  );
}

export default function CompositeSectionPrintPage() {
  const router = useRouter();
  const [run, setRun] = useState(null);

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
        <button type="button" className={styles.primaryButton} onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <article className={styles.paper}>
        <header className={styles.paperHeader}><h1>Composite Steel Beam + Concrete Deck Section Properties</h1><p>Step 3 of 3 · Final Calculation Sheet</p><p>Calculated: {stamp}</p></header>

        <section>
          <h2>Inputs</h2>
          <div className={styles.printSectionBlock}>
            <InputSummary input={run.input} />
          </div>
        </section>

        <section>
          <h2>Calculations</h2>
          {run.result.regions.map((region) => (
            <div key={region.key} className={styles.printSectionBlock}>
              <h3>{region.label}</h3>
              <ExpandedCalculations regionResult={region} />
            </div>
          ))}
        </section>

        <section>
          <h2>Summary</h2>
          {run.result.regions.map((region) => (
            <div key={`summary-${region.key}`} className={styles.printSectionBlock}>
              <h3>{region.label}</h3>
              <SummaryTable region={region} />
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
