'use client';

import styles from './page.module.css';

export const STORAGE_KEY = 'composite-section-properties:run';
export const DRAFT_STORAGE_KEY = 'composite-section-properties:draft';

export function fmt(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
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
