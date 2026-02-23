'use client';

import { useEffect, useId, useRef, useState } from 'react';

import styles from './page.module.css';

export const STORAGE_KEY = 'composite-section-properties:run';
export const DRAFT_STORAGE_KEY = 'composite-section-properties:draft';

export const FIELD_DEFINITIONS = {
  D: 'Depth of steel beam.',
  Es: 'Modulus of elasticity of steel.',
  fc: 'Concrete compressive strength.',
  Ec: 'Modulus of elasticity of concrete.',
  tw: 'Thickness of the beam web.',
  tfTop: 'Thickness of the top flange.',
  bfTop: 'Width of the top flange.',
  tfBot: 'Thickness of the bottom flange.',
  bfBot: 'Width of the bottom flange.',
  tHaunch: 'Haunch thickness between beam and slab.',
  tSlab: 'Concrete slab thickness.',
  bEff: 'Effective slab width used in composite action.',
  topBarSize: 'Top reinforcement bar size.',
  topBarSpacing: 'Center-to-center spacing of top reinforcement bars.',
  topAltBarSize: 'Alternate top reinforcement bar size when alternating bars are used.',
  topAltBarSpacing: 'Center-to-center spacing of alternate top reinforcement bars.',
  bottomBarSize: 'Bottom reinforcement bar size.',
  bottomBarSpacing: 'Center-to-center spacing of bottom reinforcement bars.',
  bottomAltBarSize: 'Alternate bottom reinforcement bar size when alternating bars are used.',
  bottomAltBarSpacing: 'Center-to-center spacing of alternate bottom reinforcement bars.',
  topClearCover: 'Clear distance from concrete face to top reinforcement.',
  bottomClearCover: 'Clear distance from concrete face to bottom reinforcement.',
  positiveSameAsNegative: 'Use the same geometry and reinforcement for positive and negative regions.',
  topEqualsBottomFlange: 'Bottom flange dimensions mirror the top flange dimensions.',
  autoEc: 'Automatically compute Ec from concrete strength.',
  topAlternatingBars: 'Enable alternating bar sizes in top reinforcement.',
  bottomAlternatingBars: 'Enable alternating bar sizes in bottom reinforcement.',
};

export function fmt(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInput(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const rounded = Math.round(Number(value) * 1000) / 1000;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function VarLabel({ base, sub, unit }) {
  return (
    <span className={styles.varLabel}>
      <span>
        {base}
        {sub ? <sub>{sub}</sub> : null}
      </span>
      {unit ? <em>({unit})</em> : null}
    </span>
  );
}

export function toDraft(value) {
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((entry) => toDraft(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toDraft(v)]));
  }
  return value;
}

function parseNumberLike(raw) {
  if (typeof raw !== 'string') return { ok: false, value: null };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '.') return { ok: false, value: null };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { ok: false, value: null };
  return { ok: true, value: parsed };
}

export function parseDraft(draft) {
  const errors = [];

  const requireNumber = (raw, label, { min = 0, allowZero = false } = {}) => {
    const parsed = parseNumberLike(raw);
    if (!parsed.ok) {
      errors.push(`${label} is required and must be a number.`);
      return null;
    }
    if (allowZero ? parsed.value < min : parsed.value <= min) {
      errors.push(`${label} must be ${allowZero ? `>= ${min}` : `> ${min}`}.`);
      return null;
    }
    return parsed.value;
  };

  const parseMat = (region, prefix) => ({
    barSize: region.barSize,
    spacing: requireNumber(region.spacing, `${prefix} spacing`, { min: 0 }),
    clearDistance: requireNumber(region.clearDistance, `${prefix} clear distance`, {
      min: 0,
      allowZero: true,
    }),
    alternatingBars: Boolean(region.alternatingBars),
    altBarSize: region.altBarSize,
    altSpacing: region.alternatingBars
      ? requireNumber(region.altSpacing, `${prefix} alternate spacing`, { min: 0 })
      : null,
  });

  const parseRegion = (region, label) => ({
    D: requireNumber(region.D, `${label} D`, { min: 0 }),
    tw: requireNumber(region.tw, `${label} t_w`, { min: 0 }),
    tfTop: requireNumber(region.tfTop, `${label} t_f,top`, { min: 0 }),
    bfTop: requireNumber(region.bfTop, `${label} b_f,top`, { min: 0 }),
    tfBot: requireNumber(region.tfBot, `${label} t_f,bot`, { min: 0 }),
    bfBot: requireNumber(region.bfBot, `${label} b_f,bot`, { min: 0 }),
    tHaunch: requireNumber(region.tHaunch, `${label} t_haunch`, { min: 0 }),
    tSlab: requireNumber(region.tSlab, `${label} t_slab`, { min: 0 }),
    bEff: requireNumber(region.bEff, `${label} b_eff`, { min: 0 }),
    rebarTop: parseMat(region.rebarTop, `${label} top reinforcement`),
    rebarBottom: parseMat(region.rebarBottom, `${label} bottom reinforcement`),
  });

  const parsed = {
    positiveSameAsNegative: Boolean(draft.positiveSameAsNegative),
    topEqualsBottomFlange: Boolean(draft.topEqualsBottomFlange),
    materials: {
      Es: requireNumber(draft.materials.Es, 'Es', { min: 0 }),
      fc: requireNumber(draft.materials.fc, "f'c", { min: 0 }),
      autoEc: Boolean(draft.materials.autoEc),
      EcManual: draft.materials.autoEc
        ? null
        : requireNumber(draft.materials.EcManual, 'Ec', { min: 0 }),
    },
    negative: parseRegion(draft.negative, 'Negative Region'),
    positive: parseRegion(draft.positive, 'Positive Region'),
  };

  return { parsed, errors };
}

export function getInputSummaryRows(input) {
  const region = input.negative;
  const formatBarSummary = (mat) => {
    const primary = `${mat.barSize} @ ${fmtInput(mat.spacing)}`;
    if (!mat.alternatingBars) {
      return primary;
    }
    return `${primary}, ${mat.altBarSize} @ ${fmtInput(mat.altSpacing)}`;
  };

  return [
    { key: 'D', label: <VarLabel base="D" />, value: fmtInput(region.D), unit: 'in' },
    { key: 'tw', label: <VarLabel base="t" sub="w" />, value: fmtInput(region.tw), unit: 'in' },
    { key: 'tfTop', label: <VarLabel base="t" sub="f,top" />, value: fmtInput(region.tfTop), unit: 'in' },
    { key: 'bfTop', label: <VarLabel base="b" sub="f,top" />, value: fmtInput(region.bfTop), unit: 'in' },
    { key: 'tfBot', label: <VarLabel base="t" sub="f,bot" />, value: fmtInput(region.tfBot), unit: 'in' },
    { key: 'bfBot', label: <VarLabel base="b" sub="f,bot" />, value: fmtInput(region.bfBot), unit: 'in' },
    { key: 'tHaunch', label: <VarLabel base="t" sub="haunch" />, value: fmtInput(region.tHaunch), unit: 'in' },
    { key: 'tSlab', label: <VarLabel base="t" sub="slab" />, value: fmtInput(region.tSlab), unit: 'in' },
    { key: 'bEff', label: <VarLabel base="b" sub="eff" />, value: fmtInput(region.bEff), unit: 'in' },
    { key: 'Es', label: <VarLabel base="E" sub="s" />, value: fmtInput(input.materials.Es), unit: 'ksi' },
    { key: 'fc', label: <VarLabel base="f'c" />, value: fmtInput(input.materials.fc), unit: 'ksi' },
    { key: 'topBars', label: 'Top bars', value: formatBarSummary(region.rebarTop), unit: 'in' },
    { key: 'bottomBars', label: 'Bottom bars', value: formatBarSummary(region.rebarBottom), unit: 'in' },
    { key: 'topClear', label: 'Top clear cover', value: fmtInput(region.rebarTop.clearDistance), unit: 'in' },
    { key: 'bottomClear', label: 'Bottom clear cover', value: fmtInput(region.rebarBottom.clearDistance), unit: 'in' },
  ];
}

export function InputSummary({ input }) {
  const rows = getInputSummaryRows(input);

  return (
    <div className={styles.inputSummaryGrid}>
      {rows.map((row) => (
        <p key={row.key} className={styles.summaryLine}>
          <span className={styles.summaryItemLabel}>{row.label}</span>
          <span className={styles.summaryEquals}>=</span>
          <strong className={styles.summaryItemValue}>
            {row.value} {row.unit}
          </strong>
        </p>
      ))}
    </div>
  );
}

export function saveRun(payload) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function saveDraft(payload) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

export function getSavedDraft() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getSavedRun() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function Chevron({ open }) {
  return <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>⌄</span>;
}

export function LabelWithInfo({ label, info }) {
  return (
    <span className={styles.labelWithInfo}>
      <span>{label}</span>
      {info ? <InfoTooltip text={info} /> : null}
    </span>
  );
}

export function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onDocumentClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', onDocumentClick);
    window.addEventListener('touchstart', onDocumentClick);
    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('mousedown', onDocumentClick);
      window.removeEventListener('touchstart', onDocumentClick);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <span
      className={styles.infoTooltipWrap}
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={styles.infoIcon}
        aria-label={`Info: ${text}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((previous) => !previous)}
      >
        i
      </button>
      {open ? (
        <span role="tooltip" id={tooltipId} className={styles.infoPopover}>
          {text}
        </span>
      ) : null}
    </span>
  );
}
