'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  computeSectionProps,
  getDefaultInput,
  getRebarOptions,
} from '@/lib/compositeSectionProps';
import styles from './page.module.css';

const rebarOptions = getRebarOptions();

function fmt(value, digits = 3) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 'any',
  unit,
  note,
  placeholder,
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label} {unit ? <em>{unit}</em> : null}
      </span>
      <div className={styles.inputWrap}>
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit ? <span className={styles.unitSuffix}>{unit}</span> : null}
      </div>
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function Toggle({ checked, onChange, label, helperText }) {
  return (
    <div className={styles.toggleRow}>
      <label className={styles.switch}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className={styles.slider} />
      </label>
      <div>
        <p>{label}</p>
        {helperText ? <small>{helperText}</small> : null}
      </div>
    </div>
  );
}

function RebarMatEditor({ mat, onChange, title }) {
  return (
    <details className={styles.nestedAccordion} open>
      <summary>{title}</summary>
      <div className={styles.nestedBody}>
        <div className={styles.inputGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Bar size</span>
            <select
              value={mat.barSize}
              onChange={(event) => onChange({ ...mat, barSize: event.target.value })}
            >
              {rebarOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="Spacing"
            unit="in"
            min={0.01}
            value={mat.spacing}
            placeholder="e.g. 12"
            onChange={(value) => onChange({ ...mat, spacing: value })}
          />
          <NumberField
            label="Clear distance"
            unit="in"
            min={0}
            value={mat.clearDistance}
            placeholder="e.g. 2"
            onChange={(value) => onChange({ ...mat, clearDistance: value })}
            note="From concrete face to OUTSIDE of bar."
          />
        </div>

        <div className={styles.toggleInline}>
          <Toggle
            checked={mat.alternatingBars}
            onChange={(event) =>
              onChange({ ...mat, alternatingBars: event.target.checked })
            }
            label="Alternating bars"
          />
        </div>

        {mat.alternatingBars ? (
          <>
            <div className={styles.inputGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Bar A size</span>
                <select
                  value={mat.barSize}
                  onChange={(event) => onChange({ ...mat, barSize: event.target.value })}
                >
                  {rebarOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Bar A spacing"
                unit="in"
                min={0.01}
                value={mat.spacing}
                onChange={(value) => onChange({ ...mat, spacing: value })}
              />
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Bar B size</span>
                <select
                  value={mat.altBarSize}
                  onChange={(event) => onChange({ ...mat, altBarSize: event.target.value })}
                >
                  {rebarOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Bar B spacing"
                unit="in"
                min={0.01}
                value={mat.altSpacing}
                onChange={(value) => onChange({ ...mat, altSpacing: value })}
              />
            </div>
            <p className={styles.assumptionLine}>
              Assumption used: As/in averaged as 0.5*(A1/s1 + A2/s2).
            </p>
          </>
        ) : null}
      </div>
    </details>
  );
}

function RegionEditor({ title, region, onChange, topEqualsBottomFlange, defaultOpen = false }) {
  return (
    <details className={styles.accordion} open={defaultOpen}>
      <summary>{title}</summary>
      <div className={styles.accordionBody}>
        <h4>Steel geometry</h4>
        <div className={styles.inputGrid}>
          <NumberField label="D" unit="in" min={0.01} value={region.D} onChange={(value) => onChange({ ...region, D: value })} />
          <NumberField label="tw" unit="in" min={0.01} value={region.tw} onChange={(value) => onChange({ ...region, tw: value })} />
          <NumberField label="tf_top" unit="in" min={0.01} value={region.tfTop} onChange={(value) => onChange({ ...region, tfTop: value })} />
          <NumberField label="bf_top" unit="in" min={0.01} value={region.bfTop} onChange={(value) => onChange({ ...region, bfTop: value })} />
          {!topEqualsBottomFlange ? (
            <>
              <NumberField label="tf_bot" unit="in" min={0.01} value={region.tfBot} onChange={(value) => onChange({ ...region, tfBot: value })} />
              <NumberField label="bf_bot" unit="in" min={0.01} value={region.bfBot} onChange={(value) => onChange({ ...region, bfBot: value })} />
            </>
          ) : (
            <p className={styles.inlineBadge}>Mirroring enabled</p>
          )}
        </div>

        <h4>Deck + haunch</h4>
        <div className={styles.inputGrid}>
          <NumberField label="t_haunch" unit="in" min={0.01} value={region.tHaunch} onChange={(value) => onChange({ ...region, tHaunch: value })} />
          <NumberField label="t_slab" unit="in" min={0.01} value={region.tSlab} onChange={(value) => onChange({ ...region, tSlab: value })} />
        </div>

        <h4>Effective deck width</h4>
        <div className={styles.inputGrid}>
          <NumberField label="Beam spacing s" unit="in" min={0.01} value={region.beamSpacing} onChange={(value) => onChange({ ...region, beamSpacing: value })} />
          <Toggle
            checked={region.overrideBEff}
            onChange={(event) =>
              onChange({ ...region, overrideBEff: event.target.checked })
            }
            label="Override b_eff"
          />
          {region.overrideBEff ? (
            <NumberField label="b_eff" unit="in" min={0.01} value={region.bEff} onChange={(value) => onChange({ ...region, bEff: value })} />
          ) : (
            <p className={styles.inlineNote}>Auto mode uses beam spacing as b_eff.</p>
          )}
        </div>

        <h4>Rebar mats</h4>
        <div className={styles.nestedStack}>
          <RebarMatEditor
            title="Top mat"
            mat={region.rebarTop}
            onChange={(rebarTop) => onChange({ ...region, rebarTop })}
          />
          <RebarMatEditor
            title="Bottom mat"
            mat={region.rebarBottom}
            onChange={(rebarBottom) => onChange({ ...region, rebarBottom })}
          />
        </div>
      </div>
    </details>
  );
}

function KeyResults({ title, values }) {
  return (
    <article className={styles.keyCard}>
      <h4>{title}</h4>
      <div className={styles.keyGrid}>
        {values.map((value) => (
          <div key={value.label}>
            <small>{value.label}</small>
            <p>{fmt(value.value)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function SummaryTable({ regionResult }) {
  return (
    <table className={styles.resultTable}>
      <thead>
        <tr>
          <th>Case</th>
          <th>I (in⁴)</th>
          <th>S top slab (in³)</th>
          <th>S top steel (in³)</th>
          <th>S bottom steel (in³)</th>
          <th>NA from steel bottom (in)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Non-composite (steel only)</td>
          <td>{fmt(regionResult.steelOnly.i)}</td>
          <td>—</td>
          <td>{fmt(regionResult.steelOnly.sectionModulus.topOfSteel)}</td>
          <td>{fmt(regionResult.steelOnly.sectionModulus.bottomOfSteel)}</td>
          <td>{fmt(regionResult.steelOnly.yBar)}</td>
        </tr>
        <tr>
          <td>Composite (n)</td>
          <td>{fmt(regionResult.compositeN.i)}</td>
          <td>{fmt(regionResult.compositeN.sectionModulus.topOfSlab)}</td>
          <td>{fmt(regionResult.compositeN.sectionModulus.topOfSteel)}</td>
          <td>{fmt(regionResult.compositeN.sectionModulus.bottomOfSteel)}</td>
          <td>{fmt(regionResult.compositeN.yBar)}</td>
        </tr>
        <tr>
          <td>Composite (3n)</td>
          <td>{fmt(regionResult.composite3N.i)}</td>
          <td>{fmt(regionResult.composite3N.sectionModulus.topOfSlab)}</td>
          <td>{fmt(regionResult.composite3N.sectionModulus.topOfSteel)}</td>
          <td>{fmt(regionResult.composite3N.sectionModulus.bottomOfSteel)}</td>
          <td>{fmt(regionResult.composite3N.yBar)}</td>
        </tr>
        {regionResult.key !== 'positive' ? (
          <tr>
            <td>Composite (cracked, negative)</td>
            <td>{fmt(regionResult.crackedNegative.iCracked)}</td>
            <td>—</td>
            <td>{fmt(regionResult.crackedNegative.sectionModulus.topOfSteel)}</td>
            <td>{fmt(regionResult.crackedNegative.sectionModulus.bottomOfSteel)}</td>
            <td>{fmt(regionResult.crackedNegative.neutralAxis)}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function regionSummaryRows(region) {
  return [
    ['D / tw', `${fmt(region.D)} in / ${fmt(region.tw)} in`],
    ['tf_top / bf_top', `${fmt(region.tfTop)} in / ${fmt(region.bfTop)} in`],
    ['tf_bot / bf_bot', `${fmt(region.tfBot)} in / ${fmt(region.bfBot)} in`],
    ['t_haunch / t_slab', `${fmt(region.tHaunch)} in / ${fmt(region.tSlab)} in`],
    ['Beam spacing s', `${fmt(region.beamSpacing)} in`],
    ['b_eff', region.overrideBEff ? `${fmt(region.bEff)} in (override)` : 'Auto (beam spacing)'],
    ['Top mat', `${region.rebarTop.barSize} @ ${fmt(region.rebarTop.spacing)} in${region.rebarTop.alternatingBars ? `, alt ${region.rebarTop.altBarSize} @ ${fmt(region.rebarTop.altSpacing)} in` : ''}`],
    ['Bottom mat', `${region.rebarBottom.barSize} @ ${fmt(region.rebarBottom.spacing)} in${region.rebarBottom.alternatingBars ? `, alt ${region.rebarBottom.altBarSize} @ ${fmt(region.rebarBottom.altSpacing)} in` : ''}`],
  ];
}

export default function CompositeSectionPropertiesPage() {
  const defaults = useMemo(() => getDefaultInput(), []);
  const [input, setInput] = useState(defaults);
  const [debouncedInput, setDebouncedInput] = useState(defaults);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const result = useMemo(() => computeSectionProps(debouncedInput), [debouncedInput]);

  const onRegionChange = (key, regionData) => {
    setInput((previous) => ({ ...previous, [key]: regionData }));
  };

  const resetDefaults = () => {
    setInput(getDefaultInput());
    setPdfError('');
  };

  const fcPsi = input.materials.fc * 1000;
  const ecAuto = (57000 * Math.sqrt(fcPsi)) / 1000;

  const exportPdf = async () => {
    setIsPdfLoading(true);
    setPdfError('');
    try {
      const response = await fetch('/api/pdf/composite-section-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed. Please try again.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'composite-section-properties.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setPdfError(error.message);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Composite Steel Beam + Concrete Deck Section Properties</h1>
        <p>
          Computes steel-only and transformed composite section properties for n, 3n,
          and cracked negative-region behavior.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.inputColumn}>
          <article className={styles.sectionCard}>
            <h2>Global controls</h2>
            <div className={styles.stackMd}>
              <Toggle
                checked={input.positiveSameAsNegative}
                onChange={(event) =>
                  setInput((previous) => ({
                    ...previous,
                    positiveSameAsNegative: event.target.checked,
                  }))
                }
                label="Positive same as Negative"
                helperText="Use one set of inputs for both regions."
              />
              <Toggle
                checked={input.topEqualsBottomFlange}
                onChange={(event) =>
                  setInput((previous) => ({
                    ...previous,
                    topEqualsBottomFlange: event.target.checked,
                  }))
                }
                label="W-shape"
                helperText="Bottom flange mirrors top flange."
              />
            </div>
          </article>

          <article className={styles.sectionCard}>
            <h2>Material properties</h2>
            <div className={styles.inputGrid}>
              <NumberField
                label="Es"
                unit="ksi"
                min={1}
                value={input.materials.Es}
                placeholder="e.g. 29000"
                onChange={(value) =>
                  setInput((previous) => ({
                    ...previous,
                    materials: { ...previous.materials, Es: value },
                  }))
                }
              />
              <NumberField
                label="f'c"
                unit="ksi"
                min={0.1}
                value={input.materials.fc}
                placeholder="e.g. 4"
                onChange={(value) =>
                  setInput((previous) => ({
                    ...previous,
                    materials: { ...previous.materials, fc: value },
                  }))
                }
              />
              <Toggle
                checked={!input.materials.autoEc}
                onChange={(event) =>
                  setInput((previous) => ({
                    ...previous,
                    materials: {
                      ...previous.materials,
                      autoEc: !event.target.checked,
                    },
                  }))
                }
                label="Manual Ec"
              />
              {!input.materials.autoEc ? (
                <NumberField
                  label="Ec"
                  unit="ksi"
                  min={1}
                  value={input.materials.EcManual}
                  placeholder="e.g. 3600"
                  onChange={(value) =>
                    setInput((previous) => ({
                      ...previous,
                      materials: { ...previous.materials, EcManual: value },
                    }))
                  }
                />
              ) : null}
            </div>
            {input.materials.autoEc ? (
              <div className={styles.formulaNote}>
                <p>Ec auto (ksi) = 57,000*sqrt(f’c[psi]) / 1000</p>
                <small>
                  f’c = {fmt(input.materials.fc)} ksi = {fmt(fcPsi, 0)} psi → Ec = {fmt(ecAuto)} ksi
                </small>
              </div>
            ) : null}
          </article>

          <RegionEditor
            title="Negative region"
            region={input.negative}
            onChange={(region) => onRegionChange('negative', region)}
            topEqualsBottomFlange={input.topEqualsBottomFlange}
            defaultOpen
          />

          {!input.positiveSameAsNegative ? (
            <RegionEditor
              title="Positive region"
              region={input.positive}
              onChange={(region) => onRegionChange('positive', region)}
              topEqualsBottomFlange={input.topEqualsBottomFlange}
            />
          ) : null}

          <details className={styles.accordion}>
            <summary>Assumptions</summary>
            <div className={styles.accordionBody}>
              <ul className={styles.compactList}>
                {result.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
          </details>

          <div className={styles.stickyActions}>
            <button type="button" className={styles.secondaryButton} onClick={resetDefaults}>
              Reset defaults
            </button>
          </div>
        </section>

        <section className={styles.resultsColumn}>
          <article className={styles.sectionCard}>
            <div className={styles.resultsHeader}>
              <h2>Results</h2>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={exportPdf}
                disabled={isPdfLoading || result.errors.length > 0}
              >
                {isPdfLoading ? 'Generating PDF…' : 'Export PDF'}
              </button>
            </div>
            {pdfError ? <p className={styles.errorInline}>{pdfError}</p> : null}
            {result.errors.length ? (
              <section className={styles.errorBox}>
                <h3>Input validation</h3>
                <ul>
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.regions.map((regionResult) => (
              <div key={regionResult.key} className={styles.resultRegion}>
                <h3>{regionResult.label}</h3>
                <KeyResults
                  title="Headline values"
                  values={[
                    { label: 'Non-composite I', value: regionResult.steelOnly.i },
                    {
                      label: 'Non-composite S_top_steel',
                      value: regionResult.steelOnly.sectionModulus.topOfSteel,
                    },
                    {
                      label: 'Non-composite S_bottom_steel',
                      value: regionResult.steelOnly.sectionModulus.bottomOfSteel,
                    },
                    { label: 'Composite (n) I', value: regionResult.compositeN.i },
                    {
                      label: 'Composite (n) S_top_slab',
                      value: regionResult.compositeN.sectionModulus.topOfSlab,
                    },
                    {
                      label: 'Composite (n) S_top_steel',
                      value: regionResult.compositeN.sectionModulus.topOfSteel,
                    },
                    {
                      label: 'Composite (n) S_bottom_steel',
                      value: regionResult.compositeN.sectionModulus.bottomOfSteel,
                    },
                    { label: 'Composite (3n) I', value: regionResult.composite3N.i },
                    {
                      label: 'Composite (3n) S_top_slab',
                      value: regionResult.composite3N.sectionModulus.topOfSlab,
                    },
                    {
                      label: 'Composite (3n) S_top_steel',
                      value: regionResult.composite3N.sectionModulus.topOfSteel,
                    },
                    {
                      label: 'Composite (3n) S_bottom_steel',
                      value: regionResult.composite3N.sectionModulus.bottomOfSteel,
                    },
                    ...(regionResult.key !== 'positive'
                      ? [
                          {
                            label: 'Cracked negative I',
                            value: regionResult.crackedNegative.iCracked,
                          },
                          {
                            label: 'Cracked negative S_top_steel',
                            value:
                              regionResult.crackedNegative.sectionModulus.topOfSteel,
                          },
                          {
                            label: 'Cracked negative S_bottom_steel',
                            value:
                              regionResult.crackedNegative.sectionModulus.bottomOfSteel,
                          },
                          {
                            label: 'Cracked negative NA',
                            value: regionResult.crackedNegative.neutralAxis,
                          },
                        ]
                      : []),
                  ]}
                />

                <SummaryTable regionResult={regionResult} />

                <details className={styles.detailAccordion}>
                  <summary>Show detailed calculations</summary>
                  <h4>Transformed components</h4>
                  <div className={styles.detailGrid}>
                    <article>
                      <h5>Composite (n)</h5>
                      <table className={styles.resultTable}>
                        <thead>
                          <tr>
                            <th>Component</th>
                            <th>Area (in²)</th>
                            <th>y (in)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {regionResult.compositeN.components.map((component) => (
                            <tr key={`n-${component.name}`}>
                              <td>{component.name}</td>
                              <td>{fmt(component.area)}</td>
                              <td>{fmt(component.y)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </article>

                    <article>
                      <h5>Composite (3n)</h5>
                      <table className={styles.resultTable}>
                        <thead>
                          <tr>
                            <th>Component</th>
                            <th>Area (in²)</th>
                            <th>y (in)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {regionResult.composite3N.components.map((component) => (
                            <tr key={`3n-${component.name}`}>
                              <td>{component.name}</td>
                              <td>{fmt(component.area)}</td>
                              <td>{fmt(component.y)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </article>
                  </div>
                </details>
              </div>
            ))}
          </article>

          <details className={styles.accordion}>
            <summary>Inputs summary</summary>
            <div className={styles.summaryGrid}>
              <table className={styles.summaryTable}>
                <tbody>
                  <tr><th>Positive = Negative</th><td>{input.positiveSameAsNegative ? 'Yes' : 'No'}</td></tr>
                  <tr><th>W-shape mirror</th><td>{input.topEqualsBottomFlange ? 'Yes' : 'No'}</td></tr>
                  <tr><th>Es</th><td>{fmt(input.materials.Es)} ksi</td></tr>
                  <tr><th>f’c</th><td>{fmt(input.materials.fc)} ksi</td></tr>
                  <tr><th>Ec mode</th><td>{input.materials.autoEc ? `Auto (${fmt(ecAuto)} ksi)` : `Manual (${fmt(input.materials.EcManual)} ksi)`}</td></tr>
                </tbody>
              </table>

              <table className={styles.summaryTable}>
                <thead><tr><th colSpan={2}>Negative region</th></tr></thead>
                <tbody>
                  {regionSummaryRows(input.negative).map(([key, value]) => (
                    <tr key={`neg-${key}`}><th>{key}</th><td>{value}</td></tr>
                  ))}
                </tbody>
              </table>

              {!input.positiveSameAsNegative ? (
                <table className={styles.summaryTable}>
                  <thead><tr><th colSpan={2}>Positive region</th></tr></thead>
                  <tbody>
                    {regionSummaryRows(input.positive).map(([key, value]) => (
                      <tr key={`pos-${key}`}><th>{key}</th><td>{value}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
