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

function inchesToPx(value, scale, minPx, maxPx) {
  const raw = Math.max(0, value) * scale;
  return Math.min(maxPx, Math.max(minPx, raw));
}

function clampInchesToPx(value, scale, minPx, maxPx) {
  return inchesToPx(value, scale, minPx, maxPx);
}

function computeBarRadius(barSize) {
  const parsed = Number(String(barSize ?? '').replace('#', ''));
  return Math.min(6, Math.max(3, (Number.isFinite(parsed) ? parsed : 5) * 0.52));
}

function computeBarLayout(widthPx, spacingIn, effectiveWidthIn) {
  const spacing = Math.max(1, toNumber(spacingIn, 12));
  const width = Math.max(1, toNumber(effectiveWidthIn, 24));
  const estimatedCount = Math.floor(width / spacing) + 1;
  const count = Math.min(10, Math.max(2, estimatedCount));
  const left = -widthPx / 2;
  const interval = count > 1 ? widthPx / (count - 1) : 0;
  return Array.from({ length: count }, (_, index) => left + index * interval);
}

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
  rotateLabel = true,
  markerStart = true,
  markerEnd = true,
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const resolvedX = labelX ?? midX;
  const resolvedY = labelY ?? midY;
  const labelTransform = orientation === 'vertical' && rotateLabel ? `rotate(-90 ${resolvedX} ${resolvedY})` : undefined;
  const textDy = orientation === 'vertical' && rotateLabel ? -3 : -6;

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

function SectionSketch({ region, title, compact = false }) {
  const D = toNumber(region.D, 24);
  const tw = toNumber(region.tw, 0.5);
  const tfTop = toNumber(region.tfTop, 0.75);
  const tfBot = toNumber(region.tfBot, 0.75);
  const bfTop = toNumber(region.bfTop, 10);
  const bfBot = toNumber(region.bfBot, 10);
  const tHaunch = toNumber(region.tHaunch, 0.5);
  const tSlab = toNumber(region.tSlab, 8);
  const bEff = toNumber(region.bEff, Math.max(bfTop, bfBot));

  const viewWidth = 1180;
  const viewHeight = compact ? 700 : 760;
  const viewPadding = 44;
  const centerX = 430;
  const baseY = compact ? 570 : 620;
  const availableHeight = compact ? 500 : 540;

  const verticalScale = availableHeight / Math.max(D + tHaunch + tSlab, 1);
  const horizontalScale = 500 / Math.max(bEff, bfTop, bfBot, 1);

  const slabH = clampInchesToPx(tSlab, verticalScale, 42, compact ? 170 : 190);
  const haunchH = clampInchesToPx(tHaunch, verticalScale, 14, 64);
  const steelH = clampInchesToPx(D, verticalScale, 190, compact ? 360 : 390);

  const topFlangeH = clampInchesToPx(tfTop, verticalScale, 16, 46);
  const bottomFlangeH = clampInchesToPx(tfBot, verticalScale, 16, 46);
  const webH = Math.max(28, steelH - topFlangeH - bottomFlangeH);

  const slabW = clampInchesToPx(bEff, horizontalScale, 340, 620);
  const topFlangeW = clampInchesToPx(bfTop, horizontalScale, 140, 440);
  const bottomFlangeW = clampInchesToPx(bfBot, horizontalScale, 140, 440);
  const webW = clampInchesToPx(tw, horizontalScale, 20, 64);

  const steelTopY = baseY - steelH;
  const haunchY = steelTopY - haunchH;
  const slabY = haunchY - slabH;

  const topBarY = slabY + clampInchesToPx(region.rebarTop.clearDistance, verticalScale, 14, slabH * 0.45);
  const bottomBarY = slabY + slabH - clampInchesToPx(region.rebarBottom.clearDistance, verticalScale, 14, slabH * 0.45);
  const topBars = computeBarLayout(slabW - 28, region.rebarTop.spacing, bEff);
  const bottomBars = computeBarLayout(slabW - 28, region.rebarBottom.spacing, bEff);
  const topBarR = computeBarRadius(region.rebarTop.barSize);
  const bottomBarR = computeBarRadius(region.rebarBottom.barSize);

  const markerId = `arrow-${title ?? 'single'}`;
  const dimensionTextClass = styles.dimensionText;
  const smallDimX = centerX + Math.max(topFlangeW, bottomFlangeW) / 2 + 84;
  const twDimY = steelTopY + topFlangeH + webH / 2 - 26;
  const topNoteY = compact ? 124 : 146;
  const bottomNoteY = compact ? 176 : 202;
  const noteX = 884;

  const topBarText = region.rebarTop.alternatingBars
    ? `${region.rebarTop.barSize} @ ${fmtSketch(region.rebarTop.spacing)} in, ${region.rebarTop.altBarSize} @ ${fmtSketch(region.rebarTop.altSpacing)} in`
    : `${region.rebarTop.barSize} @ ${fmtSketch(region.rebarTop.spacing)} in`;

  const bottomBarText = region.rebarBottom.alternatingBars
    ? `${region.rebarBottom.barSize} @ ${fmtSketch(region.rebarBottom.spacing)} in, ${region.rebarBottom.altBarSize} @ ${fmtSketch(region.rebarBottom.altSpacing)} in`
    : `${region.rebarBottom.barSize} @ ${fmtSketch(region.rebarBottom.spacing)} in`;

  return (
    <article className={styles.diagramCard}>
      {title ? <h4>{title}</h4> : null}
      <svg className={`${styles.sectionSketch} ${compact ? styles.sectionSketchCompact : ''}`} viewBox={`${-viewPadding} ${-viewPadding} ${viewWidth + viewPadding * 2} ${viewHeight + viewPadding * 2}`} role="img" aria-label={`Composite section sketch ${title ?? ''}`}>
        <defs>
          <marker id={markerId} markerWidth="12" markerHeight="12" refX="2" refY="6" markerUnits="strokeWidth" orient="auto-start-reverse">
            <path d="M0,6 L12,0 L12,12 z" fill="#64748b" />
          </marker>
        </defs>

        <rect x={centerX - slabW / 2} y={slabY} width={slabW} height={slabH} fill="#e2e8f0" stroke="#475569" />
        <rect x={centerX - topFlangeW / 2} y={haunchY} width={topFlangeW} height={haunchH} fill="#dbeafe" stroke="#475569" />

        <rect x={centerX - topFlangeW / 2} y={steelTopY} width={topFlangeW} height={topFlangeH} fill="#cbd5e1" stroke="#334155" />
        <rect x={centerX - webW / 2} y={steelTopY + topFlangeH} width={webW} height={webH} fill="#cbd5e1" stroke="#334155" />
        <rect x={centerX - bottomFlangeW / 2} y={baseY - bottomFlangeH} width={bottomFlangeW} height={bottomFlangeH} fill="#cbd5e1" stroke="#334155" />

        {topBars.map((offset) => <circle key={`top-${offset}`} cx={centerX + offset} cy={topBarY} r={topBarR} fill="#2563eb" />)}
        {bottomBars.map((offset) => <circle key={`bot-${offset}`} cx={centerX + offset} cy={bottomBarY} r={bottomBarR} fill="#ea580c" />)}

        <Dimension markerId={markerId} orientation="vertical" x1={88} y1={baseY} x2={88} y2={steelTopY} extA={{ x1: centerX - bottomFlangeW / 2 - 4, y1: baseY, x2: 88, y2: baseY }} extB={{ x1: centerX - topFlangeW / 2 - 4, y1: steelTopY, x2: 88, y2: steelTopY }} label={`D = ${fmtSketch(D)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} />
        <Dimension markerId={markerId} orientation="vertical" x1={126} y1={haunchY} x2={126} y2={steelTopY} extA={{ x1: centerX - topFlangeW / 2 - 4, y1: steelTopY, x2: 126, y2: steelTopY }} extB={{ x1: centerX - topFlangeW / 2 - 4, y1: haunchY, x2: 126, y2: haunchY }} label={`t_haunch = ${fmtSketch(tHaunch)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelX={138} textAnchor="start" rotateLabel={false} />
        <Dimension markerId={markerId} orientation="vertical" x1={164} y1={slabY} x2={164} y2={haunchY} extA={{ x1: centerX - slabW / 2 - 4, y1: slabY, x2: 164, y2: slabY }} extB={{ x1: centerX - slabW / 2 - 4, y1: haunchY, x2: 164, y2: haunchY }} label={`t_slab = ${fmtSketch(tSlab)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} />

        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - slabW / 2} y1={slabY - 30} x2={centerX + slabW / 2} y2={slabY - 30} extA={{ x1: centerX - slabW / 2, y1: slabY, x2: centerX - slabW / 2, y2: slabY - 30 }} extB={{ x1: centerX + slabW / 2, y1: slabY, x2: centerX + slabW / 2, y2: slabY - 30 }} label={`b_eff = ${fmtSketch(bEff)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} />
        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - topFlangeW / 2} y1={steelTopY - 22} x2={centerX + topFlangeW / 2} y2={steelTopY - 22} extA={{ x1: centerX - topFlangeW / 2, y1: steelTopY, x2: centerX - topFlangeW / 2, y2: steelTopY - 22 }} extB={{ x1: centerX + topFlangeW / 2, y1: steelTopY, x2: centerX + topFlangeW / 2, y2: steelTopY - 22 }} label={`b_f,top = ${fmtSketch(bfTop)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} />
        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - bottomFlangeW / 2} y1={baseY + 74} x2={centerX + bottomFlangeW / 2} y2={baseY + 74} extA={{ x1: centerX - bottomFlangeW / 2, y1: baseY - bottomFlangeH, x2: centerX - bottomFlangeW / 2, y2: baseY + 74 }} extB={{ x1: centerX + bottomFlangeW / 2, y1: baseY - bottomFlangeH, x2: centerX + bottomFlangeW / 2, y2: baseY + 74 }} label={`b_f,bot = ${fmtSketch(bfBot)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} />
        <Dimension markerId={markerId} orientation="vertical" x1={smallDimX} y1={steelTopY} x2={smallDimX} y2={steelTopY + topFlangeH} extA={{ x1: centerX + topFlangeW / 2, y1: steelTopY, x2: smallDimX, y2: steelTopY }} extB={{ x1: centerX + topFlangeW / 2, y1: steelTopY + topFlangeH, x2: smallDimX, y2: steelTopY + topFlangeH }} label={`t_f,top = ${fmtSketch(tfTop)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelX={smallDimX + 12} textAnchor="start" rotateLabel={false} />
        <Dimension markerId={markerId} orientation="vertical" x1={smallDimX} y1={baseY - bottomFlangeH} x2={smallDimX} y2={baseY} extA={{ x1: centerX + bottomFlangeW / 2, y1: baseY - bottomFlangeH, x2: smallDimX, y2: baseY - bottomFlangeH }} extB={{ x1: centerX + bottomFlangeW / 2, y1: baseY, x2: smallDimX, y2: baseY }} label={`t_f,bot = ${fmtSketch(tfBot)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelX={smallDimX + 12} textAnchor="start" rotateLabel={false} />
        <Dimension markerId={markerId} orientation="horizontal" x1={centerX - webW / 2} y1={twDimY} x2={centerX + webW / 2} y2={twDimY} extA={{ x1: centerX - webW / 2, y1: twDimY - 10, x2: centerX - webW / 2, y2: twDimY }} extB={{ x1: centerX + webW / 2, y1: twDimY - 10, x2: centerX + webW / 2, y2: twDimY }} label={`t_w = ${fmtSketch(tw)} in`} className={styles.dimensionLine} textClassName={dimensionTextClass} labelX={centerX + webW / 2 + 16} labelY={twDimY} textAnchor="start" rotateLabel={false} />

        <text x={noteX} y={topNoteY} className={dimensionTextClass}>Top: {topBarText}; clear = {fmtSketch(region.rebarTop.clearDistance)} in</text>
        <text x={noteX} y={bottomNoteY} className={dimensionTextClass}>Bottom: {bottomBarText}; clear = {fmtSketch(region.rebarBottom.clearDistance)} in</text>

        <polyline points={`${noteX - 18},${topNoteY - 6} ${noteX - 4},${topNoteY - 6} ${centerX + topBars[topBars.length - 1]},${topBarY}`} className={styles.dimensionLine} fill="none" markerEnd={`url(#${markerId})`} />
        <polyline points={`${noteX - 18},${bottomNoteY - 6} ${noteX - 4},${bottomNoteY - 6} ${centerX + bottomBars[bottomBars.length - 2]},${bottomBarY}`} className={styles.dimensionLine} fill="none" markerEnd={`url(#${markerId})`} />
      </svg>
    </article>
  );
}

function DiagramPanel({ draft }) {
  if (draft.positiveSameAsNegative) {
    return <SectionSketch title="Positive and Negative Region" region={draft.negative} compact={false} />;
  }

  return (
    <div className={styles.diagramStack}>
      <SectionSketch title="Positive Region" region={draft.positive} compact />
      <SectionSketch title="Negative Region" region={draft.negative} compact />
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
