'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeSectionProps, getDefaultInput, getRebarOptions } from '@/lib/compositeSectionProps';
import styles from './page.module.css';
import { Chevron, DRAFT_STORAGE_KEY, FIELD_DEFINITIONS, LabelWithInfo, VarLabel, parseDraft, saveDraft, saveRun } from './ui';

const rebarOptions = getRebarOptions();

function NumberField({ label, info, value, onChange, unit, note, placeholder, readOnly = false }) {
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
          readOnly={readOnly}
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

const formatDim = (value) => {
  const rounded = Math.round(toNumber(value) * 1000) / 1000;
  return `${rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} in`;
};

function DimArrow({ x, y, dx, dy }) {
  const len = 6;
  const half = 2.2;
  const mag = Math.hypot(dx, dy) || 1;
  const ux = dx / mag;
  const uy = dy / mag;
  const px = -uy;
  const py = ux;
  const bx = x - ux * len;
  const by = y - uy * len;

  return (
    <path
      d={`M ${bx + px * half} ${by + py * half} L ${x} ${y} L ${bx - px * half} ${by - py * half}`}
      className={styles.dimStroke}
    />
  );
}

function LinearDimension({
  kind,
  from,
  to,
  dimAt,
  extFrom,
  extTo,
  label,
  inward = false,
  textOffset = 0,
  labelShift = 0,
  withLeader = false,
}) {
  const isHorizontal = kind === 'horizontal';
  const start = isHorizontal ? { x: from, y: dimAt } : { x: dimAt, y: from };
  const end = isHorizontal ? { x: to, y: dimAt } : { x: dimAt, y: to };
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const textX = isHorizontal ? midX + labelShift : midX + textOffset;
  const textY = isHorizontal ? midY - 20 + textOffset : midY + labelShift;
  const extA = isHorizontal
    ? { x1: from, y1: extFrom, x2: from, y2: dimAt }
    : { x1: extFrom, y1: from, x2: dimAt, y2: from };
  const extB = isHorizontal
    ? { x1: to, y1: extTo, x2: to, y2: dimAt }
    : { x1: extTo, y1: to, x2: dimAt, y2: to };

  const startDir = inward ? { dx: end.x - start.x, dy: end.y - start.y } : { dx: start.x - end.x, dy: start.y - end.y };
  const endDir = inward ? { dx: start.x - end.x, dy: start.y - end.y } : { dx: end.x - start.x, dy: end.y - start.y };
  const rotate = !isHorizontal ? `rotate(-90 ${textX} ${textY})` : undefined;

  return (
    <g>
      <line {...extA} className={styles.dimStroke} />
      <line {...extB} className={styles.dimStroke} />
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.dimStroke} />
      <DimArrow x={start.x} y={start.y} {...startDir} />
      <DimArrow x={end.x} y={end.y} {...endDir} />
      {withLeader ? <line x1={midX} y1={midY} x2={textX - 12} y2={textY - 8} className={styles.dimStroke} /> : null}
      <text x={textX} y={textY} transform={rotate} className={styles.dimensionText} textAnchor="middle">{label}</text>
    </g>
  );
}

function SectionSketch({ region, title }) {
  const D = formatDim(region.D);
  const tw = formatDim(region.tw);
  const tfTop = formatDim(region.tfTop);
  const tfBot = formatDim(region.tfBot);
  const bfTop = formatDim(region.bfTop);
  const bfBot = formatDim(region.bfBot);
  const tHaunch = formatDim(region.tHaunch);
  const tSlab = formatDim(region.tSlab);
  const bEff = formatDim(region.bEff);

  const viewWidth = 920;
  const viewHeight = 560;
  const centerX = 360;
  const slabY = 110;
  const slabW = 460;
  const slabH = 84;
  const haunchW = 150;
  const haunchH = 14;
  const steelTopY = slabY + slabH + haunchH;
  const steelH = 245;
  const topFlangeW = 190;
  const topFlangeH = 22;
  const webW = 30;
  const bottomFlangeW = 210;
  const bottomFlangeH = 24;
  const webH = steelH - topFlangeH - bottomFlangeH;
  const steelBottomY = steelTopY + steelH;

  const leftSlab = centerX - slabW / 2;
  const rightSlab = centerX + slabW / 2;
  const leftTopFlange = centerX - topFlangeW / 2;
  const rightTopFlange = centerX + topFlangeW / 2;
  const leftBottomFlange = centerX - bottomFlangeW / 2;
  const rightBottomFlange = centerX + bottomFlangeW / 2;
  const leftWeb = centerX - webW / 2;
  const rightWeb = centerX + webW / 2;
  const topBarsY = slabY + 22;
  const bottomBarsY = slabY + slabH - 22;
  const barXs = [leftSlab + 54, leftSlab + 125, leftSlab + 196, leftSlab + 267, leftSlab + 338, rightSlab - 54];

  const topCallout = `${region.rebarTop.barSize} @ ${toNumber(region.rebarTop.spacing, 12)}"`;
  const bottomNote = region.rebarBottom.alternatingBars
    ? `${region.rebarBottom.barSize} @ ${toNumber(region.rebarBottom.spacing, 12)}" & ${region.rebarBottom.altBarSize} @ ${toNumber(region.rebarBottom.altSpacing, 12)}" Alternating`
    : `${region.rebarBottom.barSize} @ ${toNumber(region.rebarBottom.spacing, 12)}"`;

  return (
    <article className={styles.diagramCard}>
      {title ? <h4>{title}</h4> : null}
      <div className={styles.sectionSketchWrap}>
        <svg className={styles.sectionSketch} viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`Composite section sketch ${title ?? ''}`}>
          <rect x="1" y="1" width={viewWidth - 2} height={viewHeight - 2} className={styles.diagramBg} />

          <rect x={leftSlab} y={slabY} width={slabW} height={slabH} className={styles.slabShape} />
          <rect x={centerX - haunchW / 2} y={slabY + slabH} width={haunchW} height={haunchH} className={styles.haunchShape} />
          <rect x={leftTopFlange} y={steelTopY} width={topFlangeW} height={topFlangeH} className={styles.steelShape} />
          <rect x={leftWeb} y={steelTopY + topFlangeH} width={webW} height={webH} className={styles.steelShape} />
          <rect x={leftBottomFlange} y={steelBottomY - bottomFlangeH} width={bottomFlangeW} height={bottomFlangeH} className={styles.steelShape} />

          {barXs.map((x) => <circle key={`tb-${x}`} cx={x} cy={topBarsY} r="5" className={styles.rebarDot} />)}
          {barXs.map((x) => <circle key={`bb-${x}`} cx={x} cy={bottomBarsY} r="5" className={styles.rebarDotBottom} />)}

          <LinearDimension kind="horizontal" from={leftSlab} to={rightSlab} dimAt={64} extFrom={slabY - 14} extTo={slabY - 14} label={bEff} />
          <LinearDimension kind="vertical" from={slabY} to={slabY + slabH} dimAt={112} extFrom={leftSlab - 14} extTo={leftSlab - 14} label={tSlab} inward textOffset={-36} />
          <LinearDimension kind="vertical" from={slabY + slabH} to={steelTopY} dimAt={146} extFrom={centerX - haunchW / 2 - 10} extTo={centerX - haunchW / 2 - 10} label={tHaunch} inward textOffset={-34} />
          <LinearDimension kind="vertical" from={steelTopY} to={steelBottomY} dimAt={84} extFrom={leftTopFlange - 16} extTo={leftBottomFlange - 16} label={D} textOffset={-40} />

          <LinearDimension kind="horizontal" from={leftTopFlange} to={rightTopFlange} dimAt={255} extFrom={steelTopY - 10} extTo={steelTopY - 10} label={bfTop} />
          <LinearDimension kind="horizontal" from={leftBottomFlange} to={rightBottomFlange} dimAt={505} extFrom={steelBottomY - bottomFlangeH + 10} extTo={steelBottomY - bottomFlangeH + 10} label={bfBot} />
          <LinearDimension kind="horizontal" from={leftWeb} to={rightWeb} dimAt={378} extFrom={steelTopY + topFlangeH + 10} extTo={steelTopY + topFlangeH + 10} label={tw} inward withLeader labelShift={102} />
          <LinearDimension kind="vertical" from={steelTopY} to={steelTopY + topFlangeH} dimAt={640} extFrom={rightTopFlange + 10} extTo={rightTopFlange + 10} label={tfTop} inward textOffset={32} />
          <LinearDimension kind="vertical" from={steelBottomY - bottomFlangeH} to={steelBottomY} dimAt={640} extFrom={rightBottomFlange + 10} extTo={rightBottomFlange + 10} label={tfBot} inward textOffset={32} />

          <text x="700" y="120" className={styles.calloutText}>{topCallout}</text>
          <polyline points={`686,112 650,112 ${barXs[4]},${topBarsY - 6}`} className={styles.dimStroke} fill="none" />
          <text x="700" y="164" className={styles.calloutText}>{bottomNote}</text>
          <polyline points={`686,156 650,156 ${barXs[4]},${bottomBarsY - 6}`} className={styles.dimStroke} fill="none" />
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

  const autoEcInfo = useMemo(() => {
    const fc = Number(draft.materials.fc);
    if (!draft.materials.autoEc) {
      return FIELD_DEFINITIONS.Ec;
    }
    if (!Number.isFinite(fc) || fc <= 0) {
      return `${FIELD_DEFINITIONS.Ec} Auto-calc equation: Ec = 63,000 * sqrt(f'c [psi]). Enter f'c to see the computed value.`;
    }
    const ecKsi = (63 * Math.sqrt(fc * 1000)) / 1000;
    return `${FIELD_DEFINITIONS.Ec} Auto-calc: Ec = 63,000 * sqrt(f'c [psi]) = ${Math.round(ecKsi * 1000) / 1000} ksi.`;
  }, [draft.materials.autoEc, draft.materials.fc]);


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
            {draft.materials.autoEc ? (
              <NumberField
                label={<VarLabel base="E" sub="c" unit="ksi" />}
                info={autoEcInfo}
                value={(() => {
                  const fc = Number(draft.materials.fc);
                  if (!Number.isFinite(fc) || fc <= 0) return "";
                  return String(Math.round(((63 * Math.sqrt(fc * 1000)) / 1000) * 1000) / 1000);
                })()}
                onChange={() => {}}
                readOnly
              />
            ) : (
              <NumberField label={<VarLabel base="E" sub="c" unit="ksi" />} info={FIELD_DEFINITIONS.Ec} value={draft.materials.EcManual} onChange={(value) => setDraft((previous) => ({ ...previous, materials: { ...previous.materials, EcManual: value } }))} />
            )}
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
