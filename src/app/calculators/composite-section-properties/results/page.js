'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { Chevron, InputSummary, fmt, getSavedRun } from '../ui';
import { ExpandedCalculations } from '../expanded-calculations';

function SummaryTable({ regionResult }) {
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
        <tr><td>Non-Composite (Steel Only)</td><td>{fmt(regionResult.steelOnly.i)}</td><td>—</td><td>{fmt(regionResult.steelOnly.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.steelOnly.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.steelOnly.yBar)}</td></tr>
        <tr><td>Composite (n)</td><td>{fmt(regionResult.compositeN.i)}</td><td>{fmt(regionResult.compositeN.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.compositeN.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.compositeN.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.compositeN.yBar)}</td></tr>
        <tr><td>Composite (3n)</td><td>{fmt(regionResult.composite3N.i)}</td><td>{fmt(regionResult.composite3N.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.composite3N.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.composite3N.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.composite3N.yBar)}</td></tr>
        {regionResult.key !== 'positive' ? <tr><td>Composite (Cracked, Negative)</td><td>{fmt(regionResult.crackedNegative.iCracked)}</td><td>—</td><td>{fmt(regionResult.crackedNegative.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.crackedNegative.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.crackedNegative.neutralAxis)}</td></tr> : null}
      </tbody>
    </table>
  );
}

function CalculationsAccordion({ regionResult }) {
  const [open, setOpen] = useState(false);

  return (
    <details className={styles.detailAccordion} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={styles.calcSummaryToggle}>
        <span className={styles.calcSummaryTitle}><Chevron open={open} />{open ? 'Hide calculations' : 'Show calculations'}</span>
      </summary>
      <ExpandedCalculations regionResult={regionResult} />
    </details>
  );
}

export default function CompositeSectionResultsPage() {
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

  if (!run) return null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><h1>Composite Steel Beam + Concrete Deck Section Properties</h1><p>Step 2 of 3 · Results</p></header>
      <article className={styles.sectionCard}>
        <div className={styles.resultsHeader}><h2>Input Summary</h2><div className={styles.headerActions}><Link href="/calculators/composite-section-properties" className={styles.secondaryButton}>Back to Inputs</Link><Link href="/calculators/composite-section-properties/print" className={styles.primaryButton}>Export PDF</Link></div></div>
        <InputSummary input={run.input} />
      </article>
      {run.result.regions.map((regionResult) => (
        <article key={regionResult.key} className={styles.sectionCard}>
          <h2>{regionResult.label}</h2>
          <SummaryTable regionResult={regionResult} />
          <CalculationsAccordion regionResult={regionResult} />
        </article>
      ))}
    </div>
  );
}
