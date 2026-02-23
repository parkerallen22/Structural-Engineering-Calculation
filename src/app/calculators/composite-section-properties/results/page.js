'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { VarLabel, fmt, getSavedRun } from '../ui';

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
          <details className={styles.detailAccordion}>
            <summary>Expanded Calculations</summary>
            <div className={styles.calcBlock}>
              <h4>Neutral Axis and Moment of Inertia</h4>
              <pre>{`ȳ = Σ(Aᵢyᵢ) / ΣAᵢ
I = Σ(Iᵢ + Aᵢdᵢ²)
S = I / c`}</pre>
              <h5>Composite (n) Components</h5>
              {regionResult.compositeN.components.map((component) => <p key={component.name} className={styles.eqLine}>{component.name}: A = {fmt(component.area)} in², y = {fmt(component.y)} in</p>)}
              <h5>Composite (3n) Components</h5>
              {regionResult.composite3N.components.map((component) => <p key={`3-${component.name}`} className={styles.eqLine}>{component.name}: A = {fmt(component.area)} in², y = {fmt(component.y)} in</p>)}
              <h5>Calculated Results</h5>
              <p className={styles.eqLine}>Composite (n): ȳ = {fmt(regionResult.compositeN.yBar)} in, I = {fmt(regionResult.compositeN.i)} in⁴</p>
              <p className={styles.eqLine}>Composite (3n): ȳ = {fmt(regionResult.composite3N.yBar)} in, I = {fmt(regionResult.composite3N.i)} in⁴</p>
              <p className={styles.eqLine}>Cracked Negative NA = {fmt(regionResult.crackedNegative.neutralAxis)} in, I = {fmt(regionResult.crackedNegative.iCracked)} in⁴</p>
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}
