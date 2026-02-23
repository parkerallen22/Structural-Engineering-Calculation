'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  computeSectionProps,
  getDefaultInput,
  getRebarOptions,
} from '@/lib/compositeSectionProps';
import styles from './page.module.css';

const rebarOptions = getRebarOptions();

function fmt(value) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function SymbolLabel({ symbol, subscript }) {
  return (
    <>
      {symbol}
      {subscript ? <sub>{subscript}</sub> : null}
    </>
  );
}

function NumberField({ label, value, onChange, min = 0, step = 'any', unit, note }) {
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const handleChange = (event) => {
    const nextDraft = event.target.value;
    setDraft(nextDraft);

    if (nextDraft.trim() === '') {
      return;
    }

    const parsed = Number(nextDraft);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = Number(draft);
    if (draft.trim() === '' || Number.isNaN(parsed)) {
      setDraft(String(value ?? ''));
      return;
    }

    if (parsed < min) {
      onChange(min);
      setDraft(String(min));
      return;
    }

    setDraft(String(parsed));
  };

  return (
    <label className={styles.field}>
      <span>
        {label} {unit ? <em>({unit})</em> : null}
      </span>
      <input
        type="text"
        inputMode="decimal"
        min={min}
        step={step}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function RebarMatEditor({ mat, onChange, title }) {
  return (
    <section className={styles.groupCard}>
      <h5>{title}</h5>
      <div className={styles.stackFields}>
        <label className={styles.field}>
          <span>Bar size</span>
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
          label={<>Bar spacing, <SymbolLabel symbol="s" /> </>}
          unit="in"
          min={0.01}
          value={mat.spacing}
          onChange={(value) => onChange({ ...mat, spacing: value })}
        />
        <NumberField
          label={<>Clear distance, <SymbolLabel symbol="c" /> </>}
          unit="in"
          min={0}
          value={mat.clearDistance}
          onChange={(value) => onChange({ ...mat, clearDistance: value })}
          note="Clear distance is measured from concrete face to bar outside edge."
        />
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={mat.alternatingBars}
          onChange={(event) =>
            onChange({ ...mat, alternatingBars: event.target.checked })
          }
        />
        Alternating bars
      </label>

      {mat.alternatingBars ? (
        <div className={styles.stackFields}>
          <label className={styles.field}>
            <span>Alternate bar size</span>
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
            label={<>Alternate spacing, <SymbolLabel symbol="s" subscript="alt" /> </>}
            unit="in"
            min={0.01}
            value={mat.altSpacing}
            onChange={(value) => onChange({ ...mat, altSpacing: value })}
          />
        </div>
      ) : null}
    </section>
  );
}

function RegionEditor({
  title,
  region,
  onChange,
  topEqualsBottomFlange,
  showSharedControls = false,
  positiveSameAsNegative,
  onPositiveSameAsNegativeChange,
  onTopEqualsBottomFlangeChange,
}) {
  return (
    <section className={styles.sectionCard}>
      <h3>{title}</h3>

      {showSharedControls ? (
        <div className={styles.stackFields}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={positiveSameAsNegative}
              onChange={(event) => onPositiveSameAsNegativeChange(event.target.checked)}
            />
            Positive Region Same As Negative Region
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={topEqualsBottomFlange}
              onChange={(event) => onTopEqualsBottomFlangeChange(event.target.checked)}
            />
            Top Flange Is Identical To The Bottom Flange
          </label>
        </div>
      ) : null}

      <h4>Steel geometry</h4>
      <div className={styles.stackFields}>
        <NumberField label={<>Steel depth, <SymbolLabel symbol="D" /> </>} unit="in" min={0.01} value={region.D} onChange={(value) => onChange({ ...region, D: value })} />
        <NumberField label={<>Web thickness, <SymbolLabel symbol="t" subscript="w" /> </>} unit="in" min={0.01} value={region.tw} onChange={(value) => onChange({ ...region, tw: value })} />
        <NumberField
          label={<>Top flange thickness, <SymbolLabel symbol="t" subscript="f,top" /> </>}
          unit="in"
          min={0.01}
          value={region.tfTop}
          onChange={(value) => onChange({ ...region, tfTop: value })}
        />
        <NumberField
          label={<>Top flange width, <SymbolLabel symbol="b" subscript="f,top" /> </>}
          unit="in"
          min={0.01}
          value={region.bfTop}
          onChange={(value) => onChange({ ...region, bfTop: value })}
        />

        {!topEqualsBottomFlange ? (
          <>
            <NumberField
              label={<>Bottom flange thickness, <SymbolLabel symbol="t" subscript="f,bot" /> </>}
              unit="in"
              min={0.01}
              value={region.tfBot}
              onChange={(value) => onChange({ ...region, tfBot: value })}
            />
            <NumberField
              label={<>Bottom flange width, <SymbolLabel symbol="b" subscript="f,bot" /> </>}
              unit="in"
              min={0.01}
              value={region.bfBot}
              onChange={(value) => onChange({ ...region, bfBot: value })}
            />
          </>
        ) : (
          <p className={styles.inlineNote}>Bottom flange dimensions mirror top flange.</p>
        )}
      </div>

      <h4>Deck and haunch</h4>
      <div className={styles.stackFields}>
        <NumberField
          label={<>Haunch thickness, <SymbolLabel symbol="t" subscript="haunch" /> </>}
          unit="in"
          min={0.01}
          value={region.tHaunch}
          onChange={(value) => onChange({ ...region, tHaunch: value })}
        />
        <NumberField
          label={<>Slab thickness, <SymbolLabel symbol="t" subscript="slab" /> </>}
          unit="in"
          min={0.01}
          value={region.tSlab}
          onChange={(value) => onChange({ ...region, tSlab: value })}
        />
      </div>

      <h4>Effective deck width</h4>
      <div className={styles.stackFields}>
        <NumberField
          label={<>Beam spacing, <SymbolLabel symbol="s" /> </>}
          unit="in"
          min={0.01}
          value={region.beamSpacing}
          onChange={(value) => onChange({ ...region, beamSpacing: value })}
        />
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={region.overrideBEff}
            onChange={(event) =>
              onChange({ ...region, overrideBEff: event.target.checked })
            }
          />
          Override effective width
        </label>
        {region.overrideBEff ? (
          <NumberField
            label={<>Effective width, <SymbolLabel symbol="b" subscript="eff" /> </>}
            unit="in"
            min={0.01}
            value={region.bEff}
            onChange={(value) => onChange({ ...region, bEff: value })}
          />
        ) : (
          <p className={styles.inlineNote}>
            Effective width defaults to beam spacing for this scenario.
          </p>
        )}
      </div>

      <h4>Rebar mats</h4>
      <div className={styles.stackFields}>
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
    </section>
  );
}

function InputSummary({ input }) {
  const createRegionRows = (regionName, region) => ([
    [`${regionName} Steel depth, D (in)`, fmt(region.D)],
    [`${regionName} Web thickness, tw (in)`, fmt(region.tw)],
    [`${regionName} Top flange thickness, tf top (in)`, fmt(region.tfTop)],
    [`${regionName} Top flange width, bf top (in)`, fmt(region.bfTop)],
    [`${regionName} Bottom flange thickness, tf bot (in)`, fmt(region.tfBot)],
    [`${regionName} Bottom flange width, bf bot (in)`, fmt(region.bfBot)],
    [`${regionName} Haunch thickness, t haunch (in)`, fmt(region.tHaunch)],
    [`${regionName} Slab thickness, t slab (in)`, fmt(region.tSlab)],
    [`${regionName} Beam spacing, s (in)`, fmt(region.beamSpacing)],
    [`${regionName} Effective width override`, region.overrideBEff ? 'Yes' : 'No'],
    [`${regionName} Effective width, b eff (in)`, fmt(region.bEff)],
    [`${regionName} Top mat bar size`, region.rebarTop.barSize],
    [`${regionName} Top mat spacing (in)`, fmt(region.rebarTop.spacing)],
    [`${regionName} Top mat clear distance (in)`, fmt(region.rebarTop.clearDistance)],
    [`${regionName} Top mat alternating bars`, region.rebarTop.alternatingBars ? 'Yes' : 'No'],
    [`${regionName} Top mat alternate bar size`, region.rebarTop.altBarSize],
    [`${regionName} Top mat alternate spacing (in)`, fmt(region.rebarTop.altSpacing)],
    [`${regionName} Bottom mat bar size`, region.rebarBottom.barSize],
    [`${regionName} Bottom mat spacing (in)`, fmt(region.rebarBottom.spacing)],
    [`${regionName} Bottom mat clear distance (in)`, fmt(region.rebarBottom.clearDistance)],
    [`${regionName} Bottom mat alternating bars`, region.rebarBottom.alternatingBars ? 'Yes' : 'No'],
    [`${regionName} Bottom mat alternate bar size`, region.rebarBottom.altBarSize],
    [`${regionName} Bottom mat alternate spacing (in)`, fmt(region.rebarBottom.altSpacing)],
  ]);

  const rows = [
    ['Modulus Of Elasticity Of Steel, Es (ksi)', fmt(input.materials.Es)],
    ['Concrete Compressive Strength, f’c (ksi)', fmt(input.materials.fc)],
    ['Modulus Of Elasticity Of Concrete, Ec (ksi)', input.materials.autoEc ? 'Auto' : fmt(input.materials.EcManual)],
    ['Positive Region Same As Negative Region', input.positiveSameAsNegative ? 'Yes' : 'No'],
    ['Top Flange Is Identical To Bottom Flange', input.topEqualsBottomFlange ? 'Yes' : 'No'],
    ...createRegionRows('Negative region', input.negative),
    ...(input.positiveSameAsNegative ? [] : createRegionRows('Positive region', input.positive)),
  ];

  return (
    <section className={styles.sectionCard}>
      <h2>Input summary</h2>
      <div className={styles.summaryGrid}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.summaryItem}>
            <strong>{label}</strong>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultCaseCard({ title, metrics }) {
  return (
    <article className={styles.resultCaseCard}>
      <h4>{title}</h4>
      <div className={styles.metricGrid}>
        {metrics.map((metric) => (
          <div key={metric.key} className={styles.metricItem}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function CompositeSectionPropertiesPage() {
  const defaults = useMemo(() => getDefaultInput(), []);
  const [input, setInput] = useState(defaults);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showResults, setShowResults] = useState(true);

  const result = useMemo(() => computeSectionProps(input), [input]);

  const onRegionChange = (key, regionData) => {
    setInput((previous) => ({ ...previous, [key]: regionData }));
  };

  const resetDefaults = () => {
    setInput(getDefaultInput());
  };

  const exportPdf = async () => {
    setIsPdfLoading(true);
    try {
      const response = await fetch('/api/pdf/composite-section-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'composite-section-properties.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Composite Steel Beam + Concrete Deck Section Properties</h1>
        <p>
          Computes steel-only and transformed composite section properties for n, 3n, and
          cracked negative-region behavior.
        </p>
      </header>

      <section className={styles.sectionCard}>
        <h2>Material properties</h2>
        <div className={styles.stackFields}>
          <NumberField
            label={<>Modulus Of Elasticity Of Steel, <SymbolLabel symbol="E" subscript="s" /> </>}
            unit="ksi"
            min={1}
            value={input.materials.Es}
            onChange={(value) =>
              setInput((previous) => ({
                ...previous,
                materials: { ...previous.materials, Es: value },
              }))
            }
          />
          <NumberField
            label={<>Concrete Compressive Strength, <SymbolLabel symbol="f" subscript="c" /> </>}
            unit="ksi"
            min={0.1}
            value={input.materials.fc}
            onChange={(value) =>
              setInput((previous) => ({
                ...previous,
                materials: { ...previous.materials, fc: value },
              }))
            }
          />
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
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
            />
            Manually specify Ec
          </label>

          {!input.materials.autoEc ? (
            <NumberField
              label={<>Modulus Of Elasticity Of Concrete, <SymbolLabel symbol="E" subscript="c" /> </>}
              unit="ksi"
              min={1}
              value={input.materials.EcManual}
              onChange={(value) =>
                setInput((previous) => ({
                  ...previous,
                  materials: { ...previous.materials, EcManual: value },
                }))
              }
            />
          ) : (
            <p className={styles.inlineNote}>Ec is calculated automatically with Ec = 57,000 × sqrt(f’c [psi]).</p>
          )}
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={resetDefaults}>
            Reset to defaults
          </button>
          <button type="button" className={styles.calculateButton} onClick={() => setShowResults(true)}>
            Calculate Section Properties
          </button>
          <button type="button" onClick={exportPdf} disabled={isPdfLoading || result.errors.length > 0}>
            {isPdfLoading ? 'Generating PDF...' : 'Export PDF'}
          </button>
        </div>
      </section>

      <RegionEditor
        title={input.positiveSameAsNegative ? 'Positive and negative region' : 'Negative region'}
        region={input.negative}
        onChange={(region) => onRegionChange('negative', region)}
        topEqualsBottomFlange={input.topEqualsBottomFlange}
        showSharedControls
        positiveSameAsNegative={input.positiveSameAsNegative}
        onPositiveSameAsNegativeChange={(checked) =>
          setInput((previous) => ({
            ...previous,
            positiveSameAsNegative: checked,
          }))
        }
        onTopEqualsBottomFlangeChange={(checked) =>
          setInput((previous) => ({
            ...previous,
            topEqualsBottomFlange: checked,
          }))
        }
      />

      {!input.positiveSameAsNegative ? (
        <RegionEditor
          title="Positive region"
          region={input.positive}
          onChange={(region) => onRegionChange('positive', region)}
          topEqualsBottomFlange={input.topEqualsBottomFlange}
        />
      ) : null}

      <InputSummary input={input} />

      <section className={styles.sectionCard}>
        <h2>Assumptions</h2>
        <ul>
          {result.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </section>

      {result.errors.length ? (
        <section className={styles.errorBox}>
          <h2>Input validation</h2>
          <ul>
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showResults
        ? result.regions.map((regionResult) => (
          <section key={regionResult.key} className={styles.sectionCard}>
            <h2>{regionResult.label} results</h2>
            <div className={styles.resultCases}>
              <ResultCaseCard
                title="Non-composite (steel only)"
                metrics={[
                  { key: 'steel-i', label: 'I (in⁴)', value: fmt(regionResult.steelOnly.i) },
                  { key: 'steel-s-top', label: 'S top steel (in³)', value: fmt(regionResult.steelOnly.sectionModulus.topOfSteel) },
                  { key: 'steel-s-bottom', label: 'S bottom steel (in³)', value: fmt(regionResult.steelOnly.sectionModulus.bottomOfSteel) },
                  { key: 'steel-na', label: 'NA y from steel bottom (in)', value: fmt(regionResult.steelOnly.yBar) },
                ]}
              />
              <ResultCaseCard
                title="Composite (n)"
                metrics={[
                  { key: 'n-i', label: 'I (in⁴)', value: fmt(regionResult.compositeN.i) },
                  { key: 'n-s-top-slab', label: <>S<sub>top slab</sub> (in³)</>, value: fmt(regionResult.compositeN.sectionModulus.topOfSlab) },
                  { key: 'n-s-top-steel', label: 'S top steel (in³)', value: fmt(regionResult.compositeN.sectionModulus.topOfSteel) },
                  { key: 'n-s-bottom-steel', label: 'S bottom steel (in³)', value: fmt(regionResult.compositeN.sectionModulus.bottomOfSteel) },
                  { key: 'n-na', label: 'NA y from steel bottom (in)', value: fmt(regionResult.compositeN.yBar) },
                ]}
              />
              <ResultCaseCard
                title="Composite (3n)"
                metrics={[
                  { key: '3n-i', label: 'I (in⁴)', value: fmt(regionResult.composite3N.i) },
                  { key: '3n-s-top-slab', label: <>S<sub>top slab</sub> (in³)</>, value: fmt(regionResult.composite3N.sectionModulus.topOfSlab) },
                  { key: '3n-s-top-steel', label: 'S top steel (in³)', value: fmt(regionResult.composite3N.sectionModulus.topOfSteel) },
                  { key: '3n-s-bottom-steel', label: 'S bottom steel (in³)', value: fmt(regionResult.composite3N.sectionModulus.bottomOfSteel) },
                  { key: '3n-na', label: 'NA y from steel bottom (in)', value: fmt(regionResult.composite3N.yBar) },
                ]}
              />
              {regionResult.key !== 'positive' ? (
                <ResultCaseCard
                  title="Composite (cracked, negative)"
                  metrics={[
                    { key: 'cr-i', label: 'I cracked (in⁴)', value: fmt(regionResult.crackedNegative.iCracked) },
                    { key: 'cr-s-top', label: 'S top steel (in³)', value: fmt(regionResult.crackedNegative.sectionModulus.topOfSteel) },
                    { key: 'cr-s-bottom', label: 'S bottom steel (in³)', value: fmt(regionResult.crackedNegative.sectionModulus.bottomOfSteel) },
                    { key: 'cr-na', label: 'NA y from steel bottom (in)', value: fmt(regionResult.crackedNegative.neutralAxis) },
                  ]}
                />
              ) : null}
            </div>

            <details className={styles.detailExpander}>
              <summary>Expand full calculations</summary>
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
          </section>
        ))
        : null}
    </div>
  );
}
