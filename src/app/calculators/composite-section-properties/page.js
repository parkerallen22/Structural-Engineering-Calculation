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

function symbolWithSubscript(base, subscript) {
  return (
    <>
      {base}
      <sub>{subscript}</sub>
    </>
  );
}

function NumberField({ label, value, onChange, min, step = 'any', unit, note, placeholder }) {
  const displayValue = value == null ? '' : value;

  return (
    <label className={styles.field}>
      <span>
        {label} {unit ? <em>({unit})</em> : null}
      </span>
      <input
        type="text"
        inputMode="decimal"
        pattern="^-?\\d*\\.?\\d*$"
        step={step}
        min={min}
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => {
          const rawValue = event.target.value;
          if (rawValue === '') {
            onChange(null);
            return;
          }

          if (!/^[-+]?\d*\.?\d*$/.test(rawValue)) {
            return;
          }

          onChange(Number(rawValue));
        }}
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
          <span>Bar Size</span>
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
          placeholder="12"
          onChange={(value) => onChange({ ...mat, spacing: value })}
        />
        <NumberField
          label="Clear Distance"
          unit="in"
          min={0}
          value={mat.clearDistance}
          placeholder="1.5"
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
        Alternating Bars
      </label>

      {mat.alternatingBars ? (
        <div className={styles.gridTwo}>
          <label className={styles.field}>
            <span>Alternate Bar Size</span>
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
            label="Alternate Spacing"
            unit="in"
            min={0.01}
            value={mat.altSpacing}
            placeholder="12"
            onChange={(value) => onChange({ ...mat, altSpacing: value })}
          />
        </div>
      ) : null}
    </section>
  );
}

function RegionEditor({ title, region, onChange, topEqualsBottomFlange, showGlobalToggles, input, setInput }) {
  return (
    <section className={styles.sectionCard}>
      <h3>{title}</h3>

      <h4>Steel Geometry</h4>
      <div className={styles.gridThree}>
        <NumberField label="D" unit="in" min={0.01} value={region.D} placeholder="24" onChange={(value) => onChange({ ...region, D: value })} />
        <NumberField label="t_w" unit="in" min={0.01} value={region.tw} placeholder="0.44" onChange={(value) => onChange({ ...region, tw: value })} />
        <NumberField
          label="t_f,top"
          unit="in"
          min={0.01}
          value={region.tfTop}
          placeholder="0.71"
          onChange={(value) => onChange({ ...region, tfTop: value })}
        />
        <NumberField
          label="b_f,top"
          unit="in"
          min={0.01}
          value={region.bfTop}
          placeholder="8"
          onChange={(value) => onChange({ ...region, bfTop: value })}
        />

        {!topEqualsBottomFlange ? (
          <>
            <NumberField
              label="t_f,bottom"
              unit="in"
              min={0.01}
              value={region.tfBot}
              placeholder="0.71"
              onChange={(value) => onChange({ ...region, tfBot: value })}
            />
            <NumberField
              label="b_f,bottom"
              unit="in"
              min={0.01}
              value={region.bfBot}
              placeholder="8"
              onChange={(value) => onChange({ ...region, bfBot: value })}
            />
          </>
        ) : (
          <p className={styles.inlineNote}>Bottom flange dimensions mirror top flange (W-shape).</p>
        )}
      </div>

      <h4>Deck + Haunch</h4>
      <div className={styles.gridThree}>
        <NumberField
          label="Haunch Thickness t_haunch"
          unit="in"
          min={0.01}
          value={region.tHaunch}
          placeholder="2"
          onChange={(value) => onChange({ ...region, tHaunch: value })}
        />
        <NumberField
          label="Slab Thickness t_slab"
          unit="in"
          min={0.01}
          value={region.tSlab}
          placeholder="5"
          onChange={(value) => onChange({ ...region, tSlab: value })}
        />
      </div>

      <h4>Effective Deck Width</h4>
      <div className={styles.gridThree}>
        <NumberField
          label="b_eff"
          unit="in"
          min={0.01}
          value={region.bEff}
          placeholder="120"
          onChange={(value) => onChange({ ...region, bEff: value })}
        />
      </div>

      {showGlobalToggles ? (
        <div className={styles.movedToggleRow}>
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
            Positive Same As Negative
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
            Top Flange Is Identical To The Bottom Flange
          </label>
        </div>
      ) : null}

      <h4>Reinforcement</h4>
      <div className={styles.gridTwo}>
        <RebarMatEditor
          title="Top Reinforcement"
          mat={region.rebarTop}
          onChange={(rebarTop) => onChange({ ...region, rebarTop })}
        />
        <RebarMatEditor
          title="Bottom Reinforcement"
          mat={region.rebarBottom}
          onChange={(rebarBottom) => onChange({ ...region, rebarBottom })}
        />
      </div>
    </section>
  );
}

function CalculationCard({ title, i, na, sTopSlab, sTopSteel, sBottomSteel }) {
  return (
    <article className={styles.calcCard}>
      <h4>{title}</h4>
      <p>
        <strong>I</strong> = {fmt(i)} in⁴
      </p>
      <p>
        <strong>Neutral Axis</strong> = {fmt(na)} in from steel bottom
      </p>
      <p>
        <strong>S Top Slab</strong> = {fmt(sTopSlab)} in³
      </p>
      <p>
        <strong>S Top Steel</strong> = {fmt(sTopSteel)} in³
      </p>
      <p>
        <strong>S Bottom Steel</strong> = {fmt(sBottomSteel)} in³
      </p>
    </article>
  );
}

function ResultsPage({ input, result, onBack, onExportPdf, isPdfLoading }) {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>Composite Section Property Results</h1>
        <p>Key values are shown below in a concise, calculation-style layout.</p>
      </header>

      <section className={styles.sectionCard}>
        <h2>Input Summary</h2>
        <p className={styles.conciseText}>
          D = {fmt(input.negative.D)} in, f&apos;<sub>c</sub> = {fmt(input.materials.fc)} ksi, {symbolWithSubscript('E', 's')} = {fmt(input.materials.Es)} ksi, {symbolWithSubscript('E', 'c')} = {fmt(result.materials.Ec)} ksi,
          b<sub>eff</sub> = {fmt(input.negative.bEff)} in.
        </p>
      </section>

      {result.regions.map((regionResult) => (
        <section key={regionResult.key} className={styles.sectionCard}>
          <h2>{regionResult.label} Results</h2>
          <div className={styles.calcGrid}>
            <CalculationCard
              title="Non-Composite (Steel Only)"
              i={regionResult.steelOnly.i}
              na={regionResult.steelOnly.yBar}
              sTopSteel={regionResult.steelOnly.sectionModulus.topOfSteel}
              sBottomSteel={regionResult.steelOnly.sectionModulus.bottomOfSteel}
            />
            <CalculationCard
              title="Composite (n)"
              i={regionResult.compositeN.i}
              na={regionResult.compositeN.yBar}
              sTopSlab={regionResult.compositeN.sectionModulus.topOfSlab}
              sTopSteel={regionResult.compositeN.sectionModulus.topOfSteel}
              sBottomSteel={regionResult.compositeN.sectionModulus.bottomOfSteel}
            />
            <CalculationCard
              title="Composite (3n)"
              i={regionResult.composite3N.i}
              na={regionResult.composite3N.yBar}
              sTopSlab={regionResult.composite3N.sectionModulus.topOfSlab}
              sTopSteel={regionResult.composite3N.sectionModulus.topOfSteel}
              sBottomSteel={regionResult.composite3N.sectionModulus.bottomOfSteel}
            />
            {regionResult.key !== 'positive' ? (
              <CalculationCard
                title="Composite (Cracked Negative)"
                i={regionResult.crackedNegative.iCracked}
                na={regionResult.crackedNegative.neutralAxis}
                sTopSteel={regionResult.crackedNegative.sectionModulus.topOfSteel}
                sBottomSteel={regionResult.crackedNegative.sectionModulus.bottomOfSteel}
              />
            ) : null}
          </div>
        </section>
      ))}

      <div className={styles.actionRow}>
        <button type="button" onClick={onBack} className={styles.secondaryButton}>Back To Inputs</button>
        <button type="button" onClick={onExportPdf} disabled={isPdfLoading || result.errors.length > 0}>
          {isPdfLoading ? 'Generating PDF...' : 'Export PDF'}
        </button>
      </div>
    </div>
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

  if (showResultsPage) {
    return (
      <ResultsPage
        input={input}
        result={result}
        onBack={() => setShowResultsPage(false)}
        onExportPdf={exportPdf}
        isPdfLoading={isPdfLoading}
      />
    );
  }

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
        <h2>Material Properties</h2>
        <div className={styles.gridFour}>
          <NumberField
            label={<>{symbolWithSubscript('E', 's')} (Modulus Of Elasticity Of Steel)</>}
            unit="ksi"
            min={1}
            value={input.materials.Es}
            placeholder="29000"
            onChange={(value) =>
              setInput((previous) => ({
                ...previous,
                materials: { ...previous.materials, Es: value },
              }))
            }
          />
          <NumberField
            label={<>{symbolWithSubscript("f'", 'c')} (Concrete Compressive Strength)</>}
            unit="ksi"
            min={0.1}
            value={input.materials.fc}
            placeholder="4"
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
            Manual {symbolWithSubscript('E', 'c')} (Modulus Of Elasticity Of Concrete)
          </label>

          {!input.materials.autoEc ? (
            <NumberField
              label={<>{symbolWithSubscript('E', 'c')} (Modulus Of Elasticity Of Concrete)</>}
              unit="ksi"
              min={1}
              value={input.materials.EcManual}
              placeholder="3600"
              onChange={(value) =>
                setInput((previous) => ({
                  ...previous,
                  materials: { ...previous.materials, EcManual: value },
                }))
              }
            />
          ) : (
            <p className={styles.inlineNote}>Automatic formula: E<sub>c</sub> = 57,000 √(f&apos;<sub>c</sub> [psi]).</p>
          )}
        </div>
      </section>

      <RegionEditor
        title={input.positiveSameAsNegative ? 'Positive And Negative Region' : 'Negative Region'}
        region={input.negative}
        onChange={(region) => onRegionChange('negative', region)}
        topEqualsBottomFlange={input.topEqualsBottomFlange}
        showGlobalToggles
        input={input}
        setInput={setInput}
      />

      {!input.positiveSameAsNegative ? (
        <RegionEditor
          title="Positive Region"
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
          <h2>Input Validation</h2>
          <ul>
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.actionRow}>
        <button type="button" onClick={() => setShowResultsPage(true)} disabled={result.errors.length > 0}>
          Calculate
        </button>
      </div>
    </div>
  );
}
