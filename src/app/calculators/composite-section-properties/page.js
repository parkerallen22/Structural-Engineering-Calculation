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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fmtSketch = (value) => {
  const rounded = Math.round(toNumber(value) * 1000) / 1000;
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

function Dimension({
  markerId,
  orientation,
  x1,
  y1,
  x2,
  y2,
  extA,
  extB,
  label,
  className,
  textClassName,
  labelX,
  labelY,
  textAnchor = 'middle',
  rotateLabel = false,
  markerStart = true,
  markerEnd = true,
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const resolvedX = labelX ?? midX;
  const resolvedY = labelY ?? midY;
  const labelTransform = orientation === 'vertical' && rotateLabel ? `rotate(-90 ${resolvedX} ${resolvedY})` : undefined;
  const textDy = -8;

  return (
    <g>
      {extA ? <line x1={extA.x1} y1={extA.y1} x2={extA.x2} y2={extA.y2} className={className} /> : null}
      {extB ? <line x1={extB.x1} y1={extB.y1} x2={extB.x2} y2={extB.y2} className={className} /> : null}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={className}
        markerStart={markerStart ? `url(#${markerId})` : undefined}
        markerEnd={markerEnd ? `url(#${markerId})` : undefined}
      />
      <text x={resolvedX} y={resolvedY + textDy} transform={labelTransform} textAnchor={textAnchor} className={textClassName}>{label}</text>
    </g>
  );
}

function SectionSketch({ region, title }) {
  const D = toNumber(region.D, 30);
  const tw = toNumber(region.tw, 0.75);
  const tfTop = toNumber(region.tfTop, 1);
  const tfBot = toNumber(region.tfBot, 1);
  const bfTop = toNumber(region.bfTop, 12);
  const bfBot = toNumber(region.bfBot, 12);
  const tHaunch = toNumber(region.tHaunch, 1);
  const tSlab = toNumber(region.tSlab, 8);
  const bEff = toNumber(region.bEff, 60);
  const viewWidth = 1100;
  const viewHeight = 650;
  const centerX = 550;
  const topMargin = 80;

  const slabW = 600;
  const slabH = 80;
  const haunchH = 10;
  const steelH = 300;
  const topFlangeW = 120;
  const topFlangeH = 10;
  const webW = 8;
  const bottomFlangeW = 120;
  const bottomFlangeH = 10;
  const webH = steelH - topFlangeH - bottomFlangeH;
  const slabY = topMargin;
  const haunchY = slabY + slabH;
  const steelTopY = haunchY + haunchH;
  const baseY = steelTopY + steelH;

  const markerId = `arrow-${title ?? 'single'}`;
  const dimensionTextClass = styles.dimensionText;
  const topBarsY = slabY + 24;
  const bottomBarsY = slabY + slabH - 24;
  const barXs = [centerX - 250, centerX - 150, centerX - 50, centerX + 50, centerX + 150, centerX + 250];
  const leftSteelEdge = centerX - topFlangeW / 2;
  const leftSlabEdge = centerX - slabW / 2;
  const rightSteelEdge = centerX + topFlangeW / 2;
  const rightSlabEdge = centerX + slabW / 2;
  const bottomNote = region.rebarBottom.alternatingBars
    ? 'Bottom: #5 @ 12 in, #6 @ 12 in; clear = 1 in'
    : 'Bottom: #5 @ 12 in; clear = 1 in';

  return (
    <article className={styles.diagramCard}>
      {title ? <h4>{title}</h4> : null}
      <div className={styles.sectionSketchScroller}>
        <svg className={styles.sectionSketch} viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`Composite section sketch ${title ?? ''}`}>
        <defs>
          <marker id={markerId} markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto-start-reverse">
            <path d="M0,0 L12,6 L0,12 z" fill="#111827" />
          </marker>
        </defs>

        <rect x="8" y="8" width="984" height="604" rx="14" className={styles.diagramBg} />

        <rect x={centerX - slabW / 2} y={slabY} width={slabW} height={slabH} className={styles.slabShape} />
        <rect x={centerX - topFlangeW / 2} y={haunchY} width={topFlangeW} height={haunchH} className={styles.haunchShape} />

        <rect x={centerX - topFlangeW / 2} y={steelTopY} width={topFlangeW} height={topFlangeH} className={styles.steelShape} />
        <rect x={centerX - webW / 2} y={steelTopY + topFlangeH} width={webW} height={webH} className={styles.steelShape} />
        <rect x={centerX - bottomFlangeW / 2} y={baseY - bottomFlangeH} width={bottomFlangeW} height={bottomFlangeH} className={styles.steelShape} />

        {barXs.map((x) => <circle key={`top-${x}`} cx={x} cy={topBarsY} r="7" className={styles.rebarDot} />)}
        {barXs.map((x) => <circle key={`bottom-${x}`} cx={x} cy={bottomBarsY} r="7" className={styles.rebarDotBottom} />)}

        <Dimension markerId={markerId} orientation="horizontal" x1={leftSlabEdge} y1={40} x2={rightSlabEdge} y2={40} extA={{ x1: leftSlabEdge, y1: slabY, x2: leftSlabEdge, y2: 40 }} extB={{ x1: rightSlabEdge, y1: slabY, x2: rightSlabEdge, y2: 40 }} label={`beff = ${fmtSketch(bEff)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelY={30} />

        <Dimension markerId={markerId} orientation="vertical" x1={90} y1={baseY} x2={90} y2={steelTopY} extA={{ x1: leftSteelEdge, y1: baseY, x2: 90, y2: baseY }} extB={{ x1: leftSteelEdge, y1: steelTopY, x2: 90, y2: steelTopY }} label={`D = ${fmtSketch(D)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} rotateLabel labelX={68} labelY={(baseY + steelTopY) / 2} />
        <Dimension markerId={markerId} orientation="vertical" x1={150} y1={haunchY} x2={150} y2={steelTopY} extA={{ x1: leftSteelEdge, y1: haunchY, x2: 150, y2: haunchY }} extB={{ x1: leftSteelEdge, y1: steelTopY, x2: 150, y2: steelTopY }} label={`thaunch = ${fmtSketch(tHaunch)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} rotateLabel labelX={130} labelY={(haunchY + steelTopY) / 2} />
        <Dimension markerId={markerId} orientation="vertical" x1={210} y1={slabY} x2={210} y2={haunchY} extA={{ x1: leftSlabEdge, y1: slabY, x2: 210, y2: slabY }} extB={{ x1: leftSlabEdge, y1: haunchY, x2: 210, y2: haunchY }} label={`tslab = ${fmtSketch(tSlab)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} rotateLabel labelX={190} labelY={(slabY + haunchY) / 2} />

        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - topFlangeW / 2} y1={250} x2={centerX + topFlangeW / 2} y2={250} extA={{ x1: centerX - topFlangeW / 2, y1: steelTopY, x2: centerX - topFlangeW / 2, y2: 250 }} extB={{ x1: centerX + topFlangeW / 2, y1: steelTopY, x2: centerX + topFlangeW / 2, y2: 250 }} label={`bf_top = ${fmtSketch(bfTop)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelY={240} />
        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - bottomFlangeW / 2} y1={618} x2={centerX + bottomFlangeW / 2} y2={618} extA={{ x1: centerX - bottomFlangeW / 2, y1: baseY - bottomFlangeH, x2: centerX - bottomFlangeW / 2, y2: 618 }} extB={{ x1: centerX + bottomFlangeW / 2, y1: baseY - bottomFlangeH, x2: centerX + bottomFlangeW / 2, y2: 618 }} label={`bf_bottom = ${fmtSketch(bfBot)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelY={608} />
        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - webW / 2} y1={400} x2={centerX + webW / 2} y2={400} label={`tw = ${fmtSketch(tw)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelX={625} textAnchor="start" markerStart markerEnd />
        <Dimension markerId={markerId} orientation="vertical" x1={915} y1={steelTopY} x2={915} y2={steelTopY + topFlangeH} extA={{ x1: rightSteelEdge, y1: steelTopY, x2: 915, y2: steelTopY }} extB={{ x1: rightSteelEdge, y1: steelTopY + topFlangeH, x2: 915, y2: steelTopY + topFlangeH }} label={`tf_top = ${fmtSketch(tfTop)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} rotateLabel labelX={940} labelY={steelTopY + topFlangeH / 2} />
        <Dimension markerId={markerId} orientation="vertical" x1={915} y1={baseY - bottomFlangeH} x2={915} y2={baseY} extA={{ x1: rightSteelEdge, y1: baseY - bottomFlangeH, x2: 915, y2: baseY - bottomFlangeH }} extB={{ x1: rightSteelEdge, y1: baseY, x2: 915, y2: baseY }} label={`tf_bottom = ${fmtSketch(tfBot)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} rotateLabel labelX={940} labelY={baseY - bottomFlangeH / 2} />

        <text x="820" y="132" className={dimensionTextClass}>Top: #5 @ 12 in; clear = 2.25 in</text>
        <text x="820" y="168" className={dimensionTextClass}>{bottomNote}</text>

        <polyline points={`812,126 785,126 ${barXs[5] + 12},${topBarsY - 6}`} className={styles.dimensionLine} fill="none" markerEnd={`url(#${markerId})`} />
        <polyline points={`812,162 785,162 ${barXs[5] + 12},${bottomBarsY - 6}`} className={styles.dimensionLine} fill="none" markerEnd={`url(#${markerId})`} />
        </svg>
      </div>
    </article>
  );
}

function DiagramPanel({ draft }) {
  if (draft.positiveSameAsNegative) {
    return <SectionSketch title="Positive and Negative Region" region={draft.negative} />;
  }

  return (
    <div className={styles.diagramStack}>
      <SectionSketch title="Positive Region" region={draft.positive} />
      <SectionSketch title="Negative Region" region={draft.negative} />
    </div>
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
      clearDistance: '1.0',
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
          <article className={`${styles.sectionCard} ${styles.diagramPanel}`}>
            <DiagramPanel draft={draft} />
          </article>
        </section>
      </div>
    </div>
  );
}
