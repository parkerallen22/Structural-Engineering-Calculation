'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeSectionProps, getDefaultInput, getRebarOptions } from '@/lib/compositeSectionProps';
import styles from './page.module.css';
import { Chevron, DRAFT_STORAGE_KEY, FIELD_DEFINITIONS, LabelWithInfo, VarLabel, parseDraft, saveDraft, saveRun } from './ui';

const rebarOptions = getRebarOptions();

function NumberField({ label, info, value, onChange, unit, note, placeholder }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}><LabelWithInfo label={label} info={info} /></span>
      <div className={styles.inputWrap}>
        <input
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit ? <span className={styles.unitSuffix}>{unit}</span> : null}
      </div>
      {note ? <small>{note}</small> : null}
    </label>
  );
}

function Toggle({ checked, onChange, label, helperText, info }) {
  return (
    <div className={styles.toggleRow}>
      <label className={styles.switch}>
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className={styles.slider} />
      </label>
      <div>
        <p><LabelWithInfo label={label} info={info} /></p>
        {helperText ? <small>{helperText}</small> : null}
      </div>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className={styles.accordion} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <Chevron open={open} />
        <span>{title}</span>
      </summary>
      <div className={styles.accordionBody}>{children}</div>
    </details>
  );
}

function RebarBarRow({ label, barSize, spacing, onBarSizeChange, onSpacingChange, sizeInfo, spacingInfo }) {
  return (
    <div className={styles.inputGrid}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}><LabelWithInfo label={`${label} Size`} info={sizeInfo} /></span>
        <select value={barSize} onChange={(event) => onBarSizeChange(event.target.value)}>
          {rebarOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <NumberField label={`${label} Spacing (in)`} info={spacingInfo} value={spacing} onChange={onSpacingChange} />
    </div>
  );
}

function RebarMatEditor({ mat, onChange, title }) {
  return (
    <Collapsible title={title}>
      <RebarBarRow
        label="Bar"
        barSize={mat.barSize}
        spacing={mat.spacing}
        sizeInfo={title.includes('Top') ? FIELD_DEFINITIONS.topBarSize : FIELD_DEFINITIONS.bottomBarSize}
        spacingInfo={title.includes('Top') ? FIELD_DEFINITIONS.topBarSpacing : FIELD_DEFINITIONS.bottomBarSpacing}
        onBarSizeChange={(barSize) => onChange({ ...mat, barSize })}
        onSpacingChange={(spacing) => onChange({ ...mat, spacing })}
      />
      <div className={styles.inputGrid}>
        <NumberField
          label={<span><VarLabel base="c" unit="in" /> clear distance</span>}
          info={title.includes('Top') ? FIELD_DEFINITIONS.topClearCover : FIELD_DEFINITIONS.bottomClearCover}
          value={mat.clearDistance}
          onChange={(clearDistance) => onChange({ ...mat, clearDistance })}
          note="From concrete face to outside of bar."
        />
      </div>
      <div className={styles.toggleInline}>
        <Toggle checked={mat.alternatingBars} onChange={(event) => onChange({ ...mat, alternatingBars: event.target.checked })} label="Alternating Bars" info={title.includes('Top') ? FIELD_DEFINITIONS.topAlternatingBars : FIELD_DEFINITIONS.bottomAlternatingBars} />
      </div>
      {mat.alternatingBars ? (
        <RebarBarRow
          label="Second Bar"
          barSize={mat.altBarSize}
          spacing={mat.altSpacing}
          sizeInfo={title.includes('Top') ? FIELD_DEFINITIONS.topAltBarSize : FIELD_DEFINITIONS.bottomAltBarSize}
          spacingInfo={title.includes('Top') ? FIELD_DEFINITIONS.topAltBarSpacing : FIELD_DEFINITIONS.bottomAltBarSpacing}
          onBarSizeChange={(altBarSize) => onChange({ ...mat, altBarSize })}
          onSpacingChange={(altSpacing) => onChange({ ...mat, altSpacing })}
        />
      ) : null}
    </Collapsible>
  );
}

function RegionEditor({ title, region, onChange, topEqualsBottomFlange }) {
  return (
    <Collapsible title={title}>
      <h4>Steel Geometry</h4>
      <div className={styles.inputGrid}>
        <NumberField label={<VarLabel base="D" unit="in" />} info={FIELD_DEFINITIONS.D} value={region.D} onChange={(value) => onChange({ ...region, D: value })} />
        <NumberField label={<VarLabel base="t" sub="w" unit="in" />} info={FIELD_DEFINITIONS.tw} value={region.tw} onChange={(value) => onChange({ ...region, tw: value })} />
        <NumberField label={<VarLabel base="t" sub="f,top" unit="in" />} info={FIELD_DEFINITIONS.tfTop} value={region.tfTop} onChange={(value) => onChange({ ...region, tfTop: value })} />
        <NumberField label={<VarLabel base="b" sub="f,top" unit="in" />} info={FIELD_DEFINITIONS.bfTop} value={region.bfTop} onChange={(value) => onChange({ ...region, bfTop: value })} />
        {!topEqualsBottomFlange ? (
          <>
            <NumberField label={<VarLabel base="t" sub="f,bot" unit="in" />} info={FIELD_DEFINITIONS.tfBot} value={region.tfBot} onChange={(value) => onChange({ ...region, tfBot: value })} />
            <NumberField label={<VarLabel base="b" sub="f,bot" unit="in" />} info={FIELD_DEFINITIONS.bfBot} value={region.bfBot} onChange={(value) => onChange({ ...region, bfBot: value })} />
          </>
        ) : (
          <p className={styles.inlineBadge}>Mirroring Enabled</p>
        )}
      </div>
      <h4>Deck + Haunch</h4>
      <div className={styles.inputGrid}>
        <NumberField label={<VarLabel base="t" sub="haunch" unit="in" />} info={FIELD_DEFINITIONS.tHaunch} value={region.tHaunch} onChange={(value) => onChange({ ...region, tHaunch: value })} />
        <NumberField label={<VarLabel base="t" sub="slab" unit="in" />} info={FIELD_DEFINITIONS.tSlab} value={region.tSlab} onChange={(value) => onChange({ ...region, tSlab: value })} />
      </div>
      <h4>Effective Deck Width</h4>
      <div className={styles.inputGrid}>
        <NumberField label={<VarLabel base="b" sub="eff" unit="in" />} info={FIELD_DEFINITIONS.bEff} value={region.bEff} onChange={(value) => onChange({ ...region, bEff: value })} />
      </div>
      <h4>Reinforcement</h4>
      <div className={styles.nestedStack}>
        <RebarMatEditor title="Top Reinforcement" mat={region.rebarTop} onChange={(rebarTop) => onChange({ ...region, rebarTop })} />
        <RebarMatEditor title="Bottom Reinforcement" mat={region.rebarBottom} onChange={(rebarBottom) => onChange({ ...region, rebarBottom })} />
      </div>
    </Collapsible>
  );
}

function buildAutofillRegion() {
  return {
    D: '26.9',
    tw: '0.49',
    tfTop: '0.745',
    bfTop: '10',
    tfBot: '0.745',
    bfBot: '10',
    tHaunch: '0.5',
    tSlab: '8',
    bEff: '88',
    rebarTop: {
      barSize: '#5',
      spacing: '12',
      clearDistance: '2.25',
      alternatingBars: false,
      altBarSize: '#6',
      altSpacing: '12',
    },
    rebarBottom: {
      barSize: '#5',
      spacing: '12',
      clearDistance: '2.25',
      alternatingBars: true,
      altBarSize: '#6',
      altSpacing: '12',
    },
  };
}

export default function CompositeSectionPropertiesPage() {
  const router = useRouter();
  const defaults = useMemo(() => getDefaultInput(), []);
  const [draft, setDraft] = useState(defaults);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setDraft(parsed);
    } catch {
      setDraft(defaults);
    }
  }, [defaults]);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const onRegionChange = (key, regionData) => setDraft((previous) => ({ ...previous, [key]: regionData }));

  const onCalculate = () => {
    const { parsed, errors: parseErrors } = parseDraft(draft);
    if (parseErrors.length > 0) {
      setErrors(parseErrors);
      return;
    }
    const result = computeSectionProps(parsed);
    if (result.errors.length > 0) {
      setErrors(result.errors);
      return;
    }
    saveRun({ input: parsed, result, calculatedAt: new Date().toISOString() });
    router.push('/calculators/composite-section-properties/results');
  };

  const handleAutoFillTemp = () => {
    const region = buildAutofillRegion();
    setErrors([]);
    setDraft((previous) => ({
      ...previous,
      materials: {
        ...previous.materials,
        Es: '29000',
        fc: '4',
      },
      negative: region,
      positive: region,
    }));
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><h1>Composite Steel Beam + Concrete Deck Section Properties</h1><p>Step 1 of 3 · Inputs</p></header>
      <div className={styles.layout}>
        <section className={styles.inputColumn}>
          <article className={styles.sectionCard}>
            <h2>Global Controls</h2>
            <div className={styles.stackMd}>
              <Toggle checked={draft.positiveSameAsNegative} onChange={(event) => setDraft((previous) => ({ ...previous, positiveSameAsNegative: event.target.checked }))} label="Positive Same As Negative" info={FIELD_DEFINITIONS.positiveSameAsNegative} helperText="Use one set of inputs for both regions." />
              <Toggle checked={draft.topEqualsBottomFlange} onChange={(event) => setDraft((previous) => ({ ...previous, topEqualsBottomFlange: event.target.checked }))} label="W-Shape" info={FIELD_DEFINITIONS.topEqualsBottomFlange} helperText="Bottom flange mirrors top flange." />
            </div>
          </article>
          <article className={styles.sectionCard}><h2>Material Properties</h2><div className={styles.inputGrid}>
            <NumberField label={<VarLabel base="E" sub="s" unit="ksi" />} info={FIELD_DEFINITIONS.Es} value={draft.materials.Es} onChange={(value) => setDraft((previous) => ({ ...previous, materials: { ...previous.materials, Es: value } }))} />
            <NumberField label={<span><VarLabel base="f'c" unit="ksi" /></span>} info={FIELD_DEFINITIONS.fc} value={draft.materials.fc} onChange={(value) => setDraft((previous) => ({ ...previous, materials: { ...previous.materials, fc: value } }))} />
            <Toggle checked={draft.materials.autoEc} onChange={(event) => setDraft((previous) => ({ ...previous, materials: { ...previous.materials, autoEc: event.target.checked } }))} label="Auto-calculate Ec" info={FIELD_DEFINITIONS.autoEc} />
            {!draft.materials.autoEc ? <NumberField label={<VarLabel base="E" sub="c" unit="ksi" />} info={FIELD_DEFINITIONS.Ec} value={draft.materials.EcManual} onChange={(value) => setDraft((previous) => ({ ...previous, materials: { ...previous.materials, EcManual: value } }))} /> : null}
          </div></article>
          <div className={styles.tempActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleAutoFillTemp}>Auto Fill (TEMP)</button>
          </div>
          <RegionEditor title="Negative Region" region={draft.negative} onChange={(region) => onRegionChange('negative', region)} topEqualsBottomFlange={draft.topEqualsBottomFlange} />
          {!draft.positiveSameAsNegative ? <RegionEditor title="Positive Region" region={draft.positive} onChange={(region) => onRegionChange('positive', region)} topEqualsBottomFlange={draft.topEqualsBottomFlange} /> : null}
          {errors.length ? <section className={styles.errorBox}><h3>Input Validation</h3><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></section> : null}
          <div className={styles.stickyActions}><button type="button" className={styles.primaryButton} onClick={onCalculate}>Calculate</button></div>
        </section>
        <section className={styles.resultsColumn}>
          <article className={`${styles.sectionCard} ${styles.placeholderCard}`}>
            <h3>Diagram Placeholder</h3>
            <p>Reserved for section diagram and visual checks.</p>
          </article>
        </section>
      </div>
    </div>
  );
}
