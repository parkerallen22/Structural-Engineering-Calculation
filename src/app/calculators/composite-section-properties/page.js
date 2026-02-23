'use client';

import { useMemo, useState } from 'react';
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

function NumberField({ label, value, onChange, min = 0, step = 'any', unit, note }) {
  return (
    <label className={styles.field}>
      <span>
        {label} {unit ? <em>({unit})</em> : null}
      </span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function RebarMatEditor({ mat, onChange, title }) {
  return (
    <section className={styles.groupCard}>
      <h5>{title}</h5>
      <div className={styles.gridThree}>
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
          label="Spacing"
          unit="in"
          min={0.01}
          value={mat.spacing}
          onChange={(value) => onChange({ ...mat, spacing: value })}
        />
        <NumberField
          label="Clear distance"
          unit="in"
          min={0}
          value={mat.clearDistance}
          onChange={(value) => onChange({ ...mat, clearDistance: value })}
          note="Clear distance is measured from concrete face to bar OUTSIDE edge."
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
        <div className={styles.gridTwo}>
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
            label="Alternate spacing"
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

function RegionEditor({ title, region, onChange, topEqualsBottomFlange }) {
  return (
    <section className={styles.sectionCard}>
      <h3>{title}</h3>

      <h4>Steel geometry</h4>
      <div className={styles.gridThree}>
        <NumberField label="D" unit="in" min={0.01} value={region.D} onChange={(value) => onChange({ ...region, D: value })} />
        <NumberField label="tw" unit="in" min={0.01} value={region.tw} onChange={(value) => onChange({ ...region, tw: value })} />
        <NumberField
          label="tf_top"
          unit="in"
          min={0.01}
          value={region.tfTop}
          onChange={(value) => onChange({ ...region, tfTop: value })}
        />
        <NumberField
          label="bf_top"
          unit="in"
          min={0.01}
          value={region.bfTop}
          onChange={(value) => onChange({ ...region, bfTop: value })}
        />

        {!topEqualsBottomFlange ? (
          <>
            <NumberField
              label="tf_bot"
              unit="in"
              min={0.01}
              value={region.tfBot}
              onChange={(value) => onChange({ ...region, tfBot: value })}
            />
            <NumberField
              label="bf_bot"
              unit="in"
              min={0.01}
              value={region.bfBot}
              onChange={(value) => onChange({ ...region, bfBot: value })}
            />
          </>
        ) : (
          <p className={styles.inlineNote}>Bottom flange dimensions mirror top flange (W-shape).</p>
        )}
      </div>

      <h4>Deck + haunch</h4>
      <div className={styles.gridThree}>
        <NumberField
          label="Haunch thickness t_haunch"
          unit="in"
          min={0.01}
          value={region.tHaunch}
          onChange={(value) => onChange({ ...region, tHaunch: value })}
        />
        <NumberField
          label="Slab thickness t_slab"
          unit="in"
          min={0.01}
          value={region.tSlab}
          onChange={(value) => onChange({ ...region, tSlab: value })}
        />
      </div>

      <h4>Effective deck width</h4>
      <div className={styles.gridThree}>
        <NumberField
          label="Beam spacing s"
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
          Override b_eff
        </label>
        {region.overrideBEff ? (
          <NumberField
            label="b_eff"
            unit="in"
            min={0.01}
            value={region.bEff}
            onChange={(value) => onChange({ ...region, bEff: value })}
          />
        ) : (
          <p className={styles.inlineNote}>
            b_eff defaults to beam spacing for this scenario; effective width is code-dependent.
          </p>
        )}
      </div>

      <h4>Rebar mats</h4>
      <div className={styles.gridTwo}>
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
          <th>NA y from steel bottom (in)</th>
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

export default function CompositeSectionPropertiesPage() {
  const defaults = useMemo(() => getDefaultInput(), []);
  const [input, setInput] = useState(defaults);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showResultsPage, setShowResultsPage] = useState(false);

  const result = useMemo(() => computeSectionProps(input), [input]);

  const onRegionChange = (key, regionData) => {
    setInput((previous) => ({ ...previous, [key]: regionData }));
  };

  const resetDefaults = () => {
    setInput(getDefaultInput());
    setShowResultsPage(false);
  };

  const inputSummary = useMemo(() => {
    const lines = [
      `Positive same as Negative = ${input.positiveSameAsNegative ? 'Yes' : 'No'}`,
      `Top flange = Bottom flange = ${input.topEqualsBottomFlange ? 'Yes' : 'No'}`,
      `Es = ${fmt(input.materials.Es)} ksi`,
      `f'c = ${fmt(input.materials.fc)} ksi`,
      `Ec = ${input.materials.autoEc ? 'Auto' : `${fmt(input.materials.EcManual)} ksi`}`,
    ];

    const getRegionLines = (region, regionLabel) => {
      const regionLines = [
        `${regionLabel}: D = ${fmt(region.D)} in`,
        `${regionLabel}: tw = ${fmt(region.tw)} in`,
        `${regionLabel}: tf_top = ${fmt(region.tfTop)} in`,
        `${regionLabel}: bf_top = ${fmt(region.bfTop)} in`,
        `${regionLabel}: tf_bot = ${fmt(region.tfBot)} in`,
        `${regionLabel}: bf_bot = ${fmt(region.bfBot)} in`,
        `${regionLabel}: t_haunch = ${fmt(region.tHaunch)} in`,
        `${regionLabel}: t_slab = ${fmt(region.tSlab)} in`,
        `${regionLabel}: s = ${fmt(region.beamSpacing)} in`,
        `${regionLabel}: b_eff = ${region.overrideBEff ? `${fmt(region.bEff)} in` : 'Auto (beam spacing)'}`,
        `${regionLabel} top mat: bar size = ${region.rebarTop.barSize}`,
        `${regionLabel} top mat: spacing = ${fmt(region.rebarTop.spacing)} in`,
        `${regionLabel} top mat: clear distance = ${fmt(region.rebarTop.clearDistance)} in`,
        `${regionLabel} top mat: alternating bars = ${region.rebarTop.alternatingBars ? 'Yes' : 'No'}`,
        `${regionLabel} top mat: alternate bar size = ${region.rebarTop.altBarSize}`,
        `${regionLabel} top mat: alternate spacing = ${fmt(region.rebarTop.altSpacing)} in`,
        `${regionLabel} bottom mat: bar size = ${region.rebarBottom.barSize}`,
        `${regionLabel} bottom mat: spacing = ${fmt(region.rebarBottom.spacing)} in`,
        `${regionLabel} bottom mat: clear distance = ${fmt(region.rebarBottom.clearDistance)} in`,
        `${regionLabel} bottom mat: alternating bars = ${region.rebarBottom.alternatingBars ? 'Yes' : 'No'}`,
        `${regionLabel} bottom mat: alternate bar size = ${region.rebarBottom.altBarSize}`,
        `${regionLabel} bottom mat: alternate spacing = ${fmt(region.rebarBottom.altSpacing)} in`,
      ];

      return regionLines;
    };

    return [
      ...lines,
      ...getRegionLines(input.negative, 'Negative region'),
      ...(input.positiveSameAsNegative ? [] : getRegionLines(input.positive, 'Positive region')),
    ];
  }, [input]);

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

      {!showResultsPage ? (
      <>
      <section className={styles.sectionCard}>
        <h2>Global controls</h2>
        <div className={styles.gridTwo}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={input.positiveSameAsNegative}
              onChange={(event) =>
                setInput((previous) => ({
                  ...previous,
                  positiveSameAsNegative: event.target.checked,
                }))
              }
            />
            Positive same as Negative
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={input.topEqualsBottomFlange}
              onChange={(event) =>
                setInput((previous) => ({
                  ...previous,
                  topEqualsBottomFlange: event.target.checked,
                }))
              }
            />
            Top flange = Bottom flange (W-shape)
          </label>
        </div>

        <h3>Material properties</h3>
        <div className={styles.gridFour}>
          <NumberField
            label="Es"
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
            label="f'c"
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
            Manual Ec
          </label>

          {!input.materials.autoEc ? (
            <NumberField
              label="Ec"
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
            <p className={styles.inlineNote}>Ec auto formula: Ec = 57,000*sqrt(f'c [psi]).</p>
          )}
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={resetDefaults}>
            Reset to defaults
          </button>
          <button type="button" onClick={() => setShowResultsPage(true)} disabled={result.errors.length > 0}>
            Calculate
          </button>
        </div>
      </section>

      <RegionEditor
        title="Negative region"
        region={input.negative}
        onChange={(region) => onRegionChange('negative', region)}
        topEqualsBottomFlange={input.topEqualsBottomFlange}
      />

      {!input.positiveSameAsNegative ? (
        <RegionEditor
          title="Positive region"
          region={input.positive}
          onChange={(region) => onRegionChange('positive', region)}
          topEqualsBottomFlange={input.topEqualsBottomFlange}
        />
      ) : null}

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

      </>
      ) : (
      <>
      <section className={styles.sectionCard}>
        <h2>Input summary</h2>
        <ul className={styles.summaryList}>
          {inputSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.sectionCard}>
        <h2>Assumptions</h2>
        <ul>
          {result.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </section>

      <section className={styles.actionRow}>
        <button type="button" onClick={() => setShowResultsPage(false)}>
          Back to inputs
        </button>
        <button type="button" onClick={exportPdf} disabled={isPdfLoading || result.errors.length > 0}>
          {isPdfLoading ? 'Generating PDF...' : 'Export PDF'}
        </button>
      </section>
      {result.regions.map((regionResult) => (
        <section key={regionResult.key} className={styles.sectionCard}>
          <h2>{regionResult.label} results</h2>
          <SummaryTable regionResult={regionResult} />

          <details>
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

            <h4>Neutral axis + inertia</h4>
            <ul>
              <li>Composite (n) NA = {fmt(regionResult.compositeN.yBar)} in from bottom of steel.</li>
              <li>Composite (n) I = {fmt(regionResult.compositeN.i)} in⁴ via parallel-axis summation.</li>
              <li>Composite (3n) NA = {fmt(regionResult.composite3N.yBar)} in from bottom of steel.</li>
              <li>Composite (3n) I = {fmt(regionResult.composite3N.i)} in⁴ via parallel-axis summation.</li>
              {regionResult.key !== 'positive' ? (
                <>
                  <li>
                    Cracked negative NA solved by binary search = {fmt(regionResult.crackedNegative.neutralAxis)} in.
                  </li>
                  <li>Cracked negative I = {fmt(regionResult.crackedNegative.iCracked)} in⁴.</li>
                </>
              ) : null}
            </ul>
          </details>
        </section>
      ))}
      </>
      )}
    </div>
  );
}
