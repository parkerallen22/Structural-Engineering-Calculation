'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { Chevron, VarLabel, fmt, getSavedRun } from '../ui';

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

function InputSummary({ input }) {
  const rows = [
    { label: <VarLabel base="D" />, value: `${fmt(input.negative.D)} in` },
    { label: <VarLabel base="t" sub="w" />, value: `${fmt(input.negative.tw)} in` },
    { label: <VarLabel base="t" sub="f,top" />, value: `${fmt(input.negative.tfTop)} in` },
    { label: <VarLabel base="b" sub="f,top" />, value: `${fmt(input.negative.bfTop)} in` },
    { label: <VarLabel base="t" sub="haunch" />, value: `${fmt(input.negative.tHaunch)} in` },
    { label: <VarLabel base="t" sub="slab" />, value: `${fmt(input.negative.tSlab)} in` },
    { label: <VarLabel base="b" sub="eff" />, value: `${fmt(input.negative.bEff)} in` },
    { label: <VarLabel base="E" sub="s" />, value: `${fmt(input.materials.Es)} ksi` },
    { label: <VarLabel base="f'c" />, value: `${fmt(input.materials.fc)} ksi` },
  ];

  return <div className={styles.inputSummaryGrid}>{rows.map((row, idx) => <p key={idx} className={styles.summaryLine}><span>{row.label}</span><strong>= {row.value}</strong></p>)}</div>;
}

function DetailTable({ rows }) {
  return (
    <table className={styles.calcTable}>
      <thead>
        <tr><th>Item / Symbol</th><th>Expression</th><th>Value</th><th>Units</th></tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.item}>
            <td>{row.item}</td>
            <td>{row.expression}</td>
            <td>{row.value}</td>
            <td>{row.units}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpandedCalculations({ regionResult }) {
  const compositeNRows = regionResult.compositeN.components.map((component) => ({
    item: component.name,
    expression: 'Transformed component',
    value: `A=${fmt(component.area)}, y=${fmt(component.y)}`,
    units: 'in², in',
  }));

  const composite3NRows = regionResult.composite3N.components.map((component) => ({
    item: component.name,
    expression: 'Transformed component',
    value: `A=${fmt(component.area)}, y=${fmt(component.y)}`,
    units: 'in², in',
  }));

  const summaryRows = [
    { item: 'ȳ (n)', expression: 'Σ(Aᵢyᵢ)/ΣAᵢ', value: fmt(regionResult.compositeN.yBar), units: 'in' },
    { item: 'I (n)', expression: 'Σ(Iᵢ + Aᵢdᵢ²)', value: fmt(regionResult.compositeN.i), units: 'in⁴' },
    { item: 'ȳ (3n)', expression: 'Σ(Aᵢyᵢ)/ΣAᵢ', value: fmt(regionResult.composite3N.yBar), units: 'in' },
    { item: 'I (3n)', expression: 'Σ(Iᵢ + Aᵢdᵢ²)', value: fmt(regionResult.composite3N.i), units: 'in⁴' },
    { item: 'NA (cracked)', expression: 'Force equilibrium', value: fmt(regionResult.crackedNegative.neutralAxis), units: 'in' },
    { item: 'I (cracked)', expression: 'Σ(Iᵢ + Aᵢdᵢ²) about NA', value: fmt(regionResult.crackedNegative.iCracked), units: 'in⁴' },
  ];

  return (
    <div className={styles.calcGroups}>
      <section>
        <h4>Composite (n) Components</h4>
        <DetailTable rows={compositeNRows} />
      </section>
      <section>
        <h4>Composite (3n) Components</h4>
        <DetailTable rows={composite3NRows} />
      </section>
      <section>
        <h4>Calculated Results</h4>
        <DetailTable rows={summaryRows} />
      </section>
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
