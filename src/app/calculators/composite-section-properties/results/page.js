'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { InputSummary, fmt, getSavedRun } from '../ui';
import { ExpandedCalculations } from '../expanded-calculations';

function SummaryTable({ regionResult }) {
  const regionSuffix = regionResult.key === 'both' ? ' Positive and Negative Region' : '';
  const steelSummary = regionResult.useAiscManual && regionResult.steelOnlyDisplay
    ? {
      i: regionResult.steelOnlyDisplay.i,
      topOfSteel: regionResult.steelOnlyDisplay.topOfSteel,
      bottomOfSteel: regionResult.steelOnlyDisplay.bottomOfSteel,
      yBar: regionResult.steelOnly.yBar,
    }
    : {
      i: regionResult.steelOnly.i,
      topOfSteel: regionResult.steelOnly.sectionModulus.topOfSteel,
      bottomOfSteel: regionResult.steelOnly.sectionModulus.bottomOfSteel,
      yBar: regionResult.steelOnly.yBar,
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
        <tr><td>{`Composite (n)${regionSuffix}`}</td><td>{fmt(regionResult.compositeN.i)}</td><td>{fmt(regionResult.compositeN.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.compositeN.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.compositeN.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.compositeN.yBar)}</td></tr>
        <tr><td>{`Composite (3n)${regionSuffix}`}</td><td>{fmt(regionResult.composite3N.i)}</td><td>{fmt(regionResult.composite3N.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.composite3N.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.composite3N.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.composite3N.yBar)}</td></tr>
        <tr><td>{`Composite (cr)${regionSuffix}`}</td><td>{fmt(regionResult.compositeCr.i)}</td><td>{fmt(regionResult.compositeCr.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.compositeCr.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.compositeCr.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.compositeCr.yBar)}</td></tr>
      </tbody>
    </table>
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
        </article>
      ))}
      <article className={styles.sectionCard}>
        <h2>Section Property Calculations Summary</h2>
        <div className={styles.stackMd}>
          {run.result.regions.map((regionResult, index) => (
            <Fragment key={`calc-${regionResult.key}`}>
              <section className={styles.printSectionBlock}>
                <h3>{regionResult.label}</h3>
                <ExpandedCalculations regionResult={regionResult} />
              </section>
              {index < run.result.regions.length - 1 ? <hr /> : null}
            </Fragment>
          ))}
        </div>
      </article>
    </div>
  );
}
