'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { Chevron, InputSummary, fmt, getSavedRun } from '../ui';

function SummaryTable({ regionResult }) {
  return (
    <table className={styles.resultTable}>
      <thead><tr><th>Case</th><th>I (in⁴)</th><th>S top slab (in³)</th><th>S top steel (in³)</th><th>S bottom steel (in³)</th><th>NA from steel bottom (in)</th></tr></thead>
      <tbody>
        <tr><td>Non-Composite (Steel Only)</td><td>{fmt(regionResult.steelOnly.i)}</td><td>—</td><td>{fmt(regionResult.steelOnly.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.steelOnly.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.steelOnly.yBar)}</td></tr>
        <tr><td>Composite (n)</td><td>{fmt(regionResult.compositeN.i)}</td><td>{fmt(regionResult.compositeN.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.compositeN.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.compositeN.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.compositeN.yBar)}</td></tr>
        <tr><td>Composite (3n)</td><td>{fmt(regionResult.composite3N.i)}</td><td>{fmt(regionResult.composite3N.sectionModulus.topOfSlab)}</td><td>{fmt(regionResult.composite3N.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.composite3N.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.composite3N.yBar)}</td></tr>
        {regionResult.key !== 'positive' ? <tr><td>Composite (Cracked, Negative)</td><td>{fmt(regionResult.crackedNegative.iCracked)}</td><td>—</td><td>{fmt(regionResult.crackedNegative.sectionModulus.topOfSteel)}</td><td>{fmt(regionResult.crackedNegative.sectionModulus.bottomOfSteel)}</td><td>{fmt(regionResult.crackedNegative.neutralAxis)}</td></tr> : null}
      </tbody>
    </table>
  );
}

function ExpandedComponentTable({ title, detail, cRows, sRows }) {
  const renderNumber = (value) => fmt(value, 2);

  return (
    <section className={styles.expandedBlock}>
      <h4>{title}</h4>
      <table className={styles.expandedTable}>
        <thead>
          <tr>
            <th>Component</th>
            <th>A (in²)</th>
            <th>Y<sub>b</sub> (in)</th>
            <th>AY<sub>b</sub> (in³)</th>
            <th>I<sub>o</sub> (in⁴)</th>
            <th>d (in)</th>
            <th>I<sub>o</sub> + Ad² (in⁴)</th>
          </tr>
        </thead>
        <tbody>
          {detail.rows.map((row) => (
            <tr key={`${title}-${row.name}`}>
              <td>{row.name}</td>
              <td>{renderNumber(row.area)}</td>
              <td>{renderNumber(row.yb)}</td>
              <td>{renderNumber(row.ayb)}</td>
              <td>{renderNumber(row.io)}</td>
              <td>{renderNumber(row.d)}</td>
              <td>{renderNumber(row.ioPlusAd2)}</td>
            </tr>
          ))}
          <tr className={styles.expandedTotalRow}>
            <td>Total</td>
            <td>{renderNumber(detail.totals.area)}</td>
            <td>—</td>
            <td>{renderNumber(detail.totals.ayb)}</td>
            <td>—</td>
            <td>—</td>
            <td>{renderNumber(detail.totals.i)}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.expandedBoxes}>
        <table className={styles.expandedMiniTable}>
          <tbody>
            {cRows.map((row) => (
              <tr key={`${title}-c-${row.label}`}>
                <th>{row.label}</th>
                <td>{renderNumber(row.value)}</td>
                <td>in</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className={styles.expandedMiniTable}>
          <tbody>
            {sRows.map((row) => (
              <tr key={`${title}-s-${row.label}`}>
                <th>{row.label}</th>
                <td>{renderNumber(row.value)}</td>
                <td>{row.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExpandedCalculations({ regionResult }) {
  const plusMoment = regionResult.plusMoment;

  return (
    <div className={styles.calcGroups}>
      <ExpandedComponentTable
        title="(+M) Non-Composite"
        detail={plusMoment.nonComposite}
        cRows={[
          { label: 'C_b(nc)', value: plusMoment.nonComposite.c.bottom },
          { label: 'C_t(nc)', value: plusMoment.nonComposite.c.topSteel },
          { label: 'h_c', value: plusMoment.nonComposite.c.depth },
        ]}
        sRows={[
          { label: 'S_b(nc)', value: plusMoment.nonComposite.s.bottom, units: 'in³' },
          { label: 'S_t(nc)', value: plusMoment.nonComposite.s.topSteel, units: 'in³' },
          { label: 'I', value: plusMoment.nonComposite.s.i, units: 'in⁴' },
        ]}
      />

      <ExpandedComponentTable
        title="(+M) Composite Properties (n)"
        detail={plusMoment.compositeN}
        cRows={[
          { label: 'C_b(c,n)', value: plusMoment.compositeN.c.bottom },
          { label: 'C_t,slab(c,n)', value: plusMoment.compositeN.c.topSlab },
          { label: 'C_t,beam(c,n)', value: plusMoment.compositeN.c.beam },
          { label: 'h_c', value: plusMoment.compositeN.c.depth },
        ]}
        sRows={[
          { label: 'S_b(c,n)', value: plusMoment.compositeN.s.bottom, units: 'in³' },
          { label: 'S_t,slab(c,n)', value: plusMoment.compositeN.s.topSlab, units: 'in³' },
          { label: 'S_t,beam(c,n)', value: plusMoment.compositeN.s.topSteel, units: 'in³' },
        ]}
      />

      <ExpandedComponentTable
        title="(+M) Composite Properties (3n)"
        detail={plusMoment.composite3N}
        cRows={[
          { label: 'C_b(c,3n)', value: plusMoment.composite3N.c.bottom },
          { label: 'C_t,slab(c,3n)', value: plusMoment.composite3N.c.topSlab },
          { label: 'C_t,beam(c,3n)', value: plusMoment.composite3N.c.beam },
          { label: 'h_c', value: plusMoment.composite3N.c.depth },
        ]}
        sRows={[
          { label: 'S_b(c,3n)', value: plusMoment.composite3N.s.bottom, units: 'in³' },
          { label: 'S_t,slab(c,3n)', value: plusMoment.composite3N.s.topSlab, units: 'in³' },
          { label: 'S_t,beam(c,3n)', value: plusMoment.composite3N.s.topSteel, units: 'in³' },
        ]}
      />
    </div>
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
