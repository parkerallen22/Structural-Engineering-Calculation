'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { fmt, getSavedRun } from '../ui';

function groupedInputRows(input) {
  const region = input.negative;
  return [
    {
      group: 'Material',
      rows: [
        ['Es', fmt(input.materials.Es), 'ksi'],
        ["f’c", fmt(input.materials.fc), 'ksi'],
        ['Ec Mode', input.materials.autoEc ? 'Auto' : 'Manual', '—'],
        ['Ec (manual)', fmt(input.materials.EcManual), 'ksi'],
      ],
    },
    {
      group: 'Steel Section',
      rows: [
        ['D', fmt(region.D), 'in'],
        ['tw', fmt(region.tw), 'in'],
        ['tf_top', fmt(region.tfTop), 'in'],
        ['bf_top', fmt(region.bfTop), 'in'],
        ['tf_bot', fmt(region.tfBot), 'in'],
        ['bf_bot', fmt(region.bfBot), 'in'],
      ],
    },
    {
      group: 'Slab / Composite',
      rows: [
        ['thaunch', fmt(region.tHaunch), 'in'],
        ['tslab', fmt(region.tSlab), 'in'],
        ['beff', fmt(region.bEff), 'in'],
      ],
    },
    {
      group: 'Reinforcement (Top)',
      rows: [
        ['Bar', region.rebarTop.barSize, '—'],
        ['Spacing', fmt(region.rebarTop.spacing), 'in'],
        ['Clear cover', fmt(region.rebarTop.clearDistance), 'in'],
        ['Alternating', region.rebarTop.alternatingBars ? 'ON' : 'OFF', '—'],
        ['Second Bar', region.rebarTop.altBarSize, '—'],
        ['Second Bar Spacing', fmt(region.rebarTop.altSpacing), 'in'],
      ],
    },
    {
      group: 'Reinforcement (Bottom)',
      rows: [
        ['Bar', region.rebarBottom.barSize, '—'],
        ['Spacing', fmt(region.rebarBottom.spacing), 'in'],
        ['Clear cover', fmt(region.rebarBottom.clearDistance), 'in'],
        ['Alternating', region.rebarBottom.alternatingBars ? 'ON' : 'OFF', '—'],
        ['Second Bar', region.rebarBottom.altBarSize, '—'],
        ['Second Bar Spacing', fmt(region.rebarBottom.altSpacing), 'in'],
      ],
    },
    {
      group: 'Toggles / Assumptions',
      rows: [
        ['Positive Same As Negative', input.positiveSameAsNegative ? 'ON' : 'OFF', '—'],
        ['W-Shape mirror', input.topEqualsBottomFlange ? 'ON' : 'OFF', '—'],
      ],
    },
  ];
}

function CalcRows({ region }) {
  const componentRows = (components) => components.map((component) => (
    <tr key={component.name}>
      <td>{component.name}</td><td>Transformed component</td><td>{`A=${fmt(component.area)}, y=${fmt(component.y)}`}</td><td>in², in</td>
    </tr>
  ));

  return (
    <>
      <h3>Composite (n) Components</h3>
      <table className={styles.calcTable}><thead><tr><th>Item / Symbol</th><th>Expression</th><th>Value</th><th>Units</th></tr></thead><tbody>{componentRows(region.compositeN.components)}</tbody></table>
      <h3>Composite (3n) Components</h3>
      <table className={styles.calcTable}><thead><tr><th>Item / Symbol</th><th>Expression</th><th>Value</th><th>Units</th></tr></thead><tbody>{componentRows(region.composite3N.components)}</tbody></table>
      <h3>Calculated Results</h3>
      <table className={styles.calcTable}>
        <thead><tr><th>Item / Symbol</th><th>Expression</th><th>Value</th><th>Units</th></tr></thead>
        <tbody>
          <tr><td>ȳ (n)</td><td>Σ(Aᵢyᵢ)/ΣAᵢ</td><td>{fmt(region.compositeN.yBar)}</td><td>in</td></tr>
          <tr><td>I (n)</td><td>Σ(Iᵢ + Aᵢdᵢ²)</td><td>{fmt(region.compositeN.i)}</td><td>in⁴</td></tr>
          <tr><td>ȳ (3n)</td><td>Σ(Aᵢyᵢ)/ΣAᵢ</td><td>{fmt(region.composite3N.yBar)}</td><td>in</td></tr>
          <tr><td>I (3n)</td><td>Σ(Iᵢ + Aᵢdᵢ²)</td><td>{fmt(region.composite3N.i)}</td><td>in⁴</td></tr>
          <tr><td>NA (cracked)</td><td>Force equilibrium</td><td>{fmt(region.crackedNegative.neutralAxis)}</td><td>in</td></tr>
          <tr><td>I (cracked)</td><td>Σ(Iᵢ + Aᵢdᵢ²) about NA</td><td>{fmt(region.crackedNegative.iCracked)}</td><td>in⁴</td></tr>
        </tbody>
      </table>
    </>
  );
}

function SummaryTable({ region }) {
  return (
    <table className={styles.resultTable}>
      <thead><tr><th>Case</th><th>I (in⁴)</th><th>S top slab (in³)</th><th>S top steel (in³)</th><th>S bottom steel (in³)</th><th>NA from steel bottom (in)</th></tr></thead>
      <tbody>
        <tr><td>Non-Composite (Steel Only)</td><td>{fmt(region.steelOnly.i)}</td><td>—</td><td>{fmt(region.steelOnly.sectionModulus.topOfSteel)}</td><td>{fmt(region.steelOnly.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.steelOnly.yBar)}</td></tr>
        <tr><td>Composite (n)</td><td>{fmt(region.compositeN.i)}</td><td>{fmt(region.compositeN.sectionModulus.topOfSlab)}</td><td>{fmt(region.compositeN.sectionModulus.topOfSteel)}</td><td>{fmt(region.compositeN.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.compositeN.yBar)}</td></tr>
        <tr><td>Composite (3n)</td><td>{fmt(region.composite3N.i)}</td><td>{fmt(region.composite3N.sectionModulus.topOfSlab)}</td><td>{fmt(region.composite3N.sectionModulus.topOfSteel)}</td><td>{fmt(region.composite3N.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.composite3N.yBar)}</td></tr>
        {region.key !== 'positive' ? <tr><td>Composite (Cracked, Negative)</td><td>{fmt(region.crackedNegative.iCracked)}</td><td>—</td><td>{fmt(region.crackedNegative.sectionModulus.topOfSteel)}</td><td>{fmt(region.crackedNegative.sectionModulus.bottomOfSteel)}</td><td>{fmt(region.crackedNegative.neutralAxis)}</td></tr> : null}
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
          <h2>A) Inputs</h2>
          {groupedInputRows(run.input).map((group) => (
            <div key={group.group} className={styles.printSectionBlock}>
              <h3>{group.group}</h3>
              <table className={styles.calcTable}>
                <thead><tr><th>Item</th><th>Expression</th><th>Value</th><th>Units</th></tr></thead>
                <tbody>
                  {group.rows.map(([item, value, units]) => (
                    <tr key={`${group.group}-${item}`}><td>{item}</td><td>Input</td><td>{value}</td><td>{units}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <section>
          <h2>B) Calculations (Full)</h2>
          {run.result.regions.map((region) => (
            <div key={region.key} className={styles.printSectionBlock}>
              <h3>{region.label}</h3>
              <CalcRows region={region} />
            </div>
          ))}
        </section>

        <section>
          <h2>C) Summary Table</h2>
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
