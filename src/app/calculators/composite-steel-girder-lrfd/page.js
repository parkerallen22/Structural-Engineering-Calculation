'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './page.module.css';

const CALCULATOR_ID = 'composite-steel-girder-lrfd';
const STORAGE_BASE_KEY = `calculator:${CALCULATOR_ID}:latest`;

const TAB_LABELS = [
  'Inputs',
  'Section Properties',
  'Loads',
  'Distribution Factors',
  '+ Moment Region',
  '– Moment Region',
  'Shear Connectors',
  'Field Bolted Splice',
  'Bearing Stiffener',
  'Elastomeric Bearing',
  'Export / Report',
];

const SIGN_CONVENTION_NOTE =
  'Enter undistributed and unfactored moments and shears. At Piers, the maximum -M shall be entered and near midspans, the maximum +M shall be entered.';

const SECTION_CONTIGUITY_TOLERANCE = 1e-3;
const REBAR_BAR_OPTIONS = ['', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11'];

function nowIso() {
  return new Date().toISOString();
}

function createEmptyRangeRow() {
  return { id: crypto.randomUUID(), startX_ft: null, endX_ft: null, label: '' };
}

function createSectionLabel(name = '') {
  return {
    id: crypto.randomUUID(),
    name,
    D_in: null,
    tw_in: null,
    tf_top_in: null,
    bf_top_in: null,
    tf_bot_in: null,
    bf_bot_in: null,
  };
}

function createDiaphragm() {
  return { id: crypto.randomUUID(), x_ft: null };
}

function createSectionLocateSegment(labelId = '', source = {}) {
  return {
    id: source.id ?? crypto.randomUUID(),
    labelId,
    startX: source.startX ?? '',
    endX: source.endX ?? '',
  };
}

function createDeckRebarGroup() {
  return {
    spacing: '',
    primaryBar: '',
    alternating: false,
    secondaryBar: '',
  };
}

function createDeckRebar() {
  return {
    longitudinalTop: createDeckRebarGroup(),
    longitudinalBottom: createDeckRebarGroup(),
    transverseTop: createDeckRebarGroup(),
    transverseBottom: createDeckRebarGroup(),
  };
}

function createStudLayoutRows(numberOfSpans, supportLocations, existingRows = []) {
  const rows = [];

  for (let i = 0; i < numberOfSpans; i += 1) {
    const start = supportLocations[i]?.x_global_ft ?? null;
    const end = supportLocations[i + 1]?.x_global_ft ?? null;
    rows.push({
      id: existingRows[rows.length]?.id ?? crypto.randomUUID(),
      name: `Span ${i + 1}`,
      startX_ft: existingRows[rows.length]?.startX_ft ?? start,
      endX_ft: existingRows[rows.length]?.endX_ft ?? end,
      spacing_in: existingRows[rows.length]?.spacing_in ?? null,
      studsPerRow: existingRows[rows.length]?.studsPerRow ?? null,
      diameter_in: existingRows[rows.length]?.diameter_in ?? null,
      Fy_ksi: existingRows[rows.length]?.Fy_ksi ?? null,
    });

    if (i < numberOfSpans - 1) {
      const pierX = supportLocations[i + 1]?.x_global_ft ?? null;
      rows.push({
        id: existingRows[rows.length]?.id ?? crypto.randomUUID(),
        name: `Pier ${i + 1}`,
        startX_ft: existingRows[rows.length]?.startX_ft ?? pierX,
        endX_ft: existingRows[rows.length]?.endX_ft ?? pierX,
        spacing_in: existingRows[rows.length]?.spacing_in ?? null,
        studsPerRow: existingRows[rows.length]?.studsPerRow ?? null,
        diameter_in: existingRows[rows.length]?.diameter_in ?? null,
        Fy_ksi: existingRows[rows.length]?.Fy_ksi ?? null,
      });
    }
  }

  return rows;
}

function createInitialProject() {
  const created = nowIso();

  return {
    meta: {
      projectName: 'Untitled Composite Girder Check',
      createdAt: created,
      modifiedAt: created,
      signConventionNote: SIGN_CONVENTION_NOTE,
      coordinateNote: 'X is measured from Abutment A (0 ft) along the bridge centerline.',
      liveLoadNote: '',
    },
    settings: {
      allowEditingInputsOnOtherTabs: false,
      allowOverridingFactoredCombinations: false,
    },
    geometry: {
      numberOfSpans: 2,
      spanLengths_ft: [120, 120],
      overhangsVary: false,
      overhangLength_ft: 0,
      overhangLeft_ft: 0,
      overhangRight_ft: 0,
      skew_deg: 0,
      numberOfGirders: 4,
      constantSpacing: true,
      spacing_ft: 10,
      spacingArray_ft: [10, 10, 10],
      spanPoints: [
        { momentAtMid: true, xPrime_ft: 60 },
        { momentAtMid: true, xPrime_ft: 60 },
      ],
    },
    schedules: {
      sectionConstantChoice: null,
      sectionConstant: false,
      sectionLabels: [createSectionLabel('SEC-A')],
      sectionAssignments: [
        { id: crypto.randomUUID(), locationId: 'span-1', labelId: null },
        { id: crypto.randomUUID(), locationId: 'span-2', labelId: null },
      ],
      sectionLocateSegments: [createSectionLocateSegment('')],
      spanStudLayouts: [],
      supportStudLayouts: [],
      studLayout: {
        simpleLayout: true,
        constants: {
          studsPerRow: null,
          diameter_in: null,
          Fy_ksi: null,
        },
        rows: [],
      },
      diaphragmLocations: [createDiaphragm()],
    },
    deckRebar: createDeckRebar(),
    materials: {
      Fy_ksi: 50,
      fc_ksi: 4,
      Es_ksi: 29000,
    },
    autoDeadLoad: {
      deckThickness_in: 8,
      haunchThickness_in: 2,
      wearingSurface_psf: 0,
      parapet_plf: 0,
      steelDensity_pcf: 490,
      concreteDensity_pcf: 150,
    },
    demandByLocation: {},
    comboOverridesByLocation: {},
    selectedLocationByTab: {},
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInputValue(value) {
  return value === null || typeof value === 'undefined' ? '' : String(value);
}

function round(value, digits = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(digits));
}

function cloneFallbackValue(fallbackValue) {
  if (typeof fallbackValue === 'function') {
    return fallbackValue();
  }
  if (Array.isArray(fallbackValue)) {
    return [...fallbackValue];
  }
  if (fallbackValue && typeof fallbackValue === 'object') {
    if (typeof structuredClone === 'function') {
      return structuredClone(fallbackValue);
    }
    return { ...fallbackValue };
  }
  return fallbackValue;
}

function resizeArray(source, targetLength, fallbackValue) {
  const next = [...source];
  while (next.length < targetLength) {
    next.push(cloneFallbackValue(fallbackValue));
  }
  return next.slice(0, targetLength);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max, digits = 1) {
  const value = min + Math.random() * (max - min);
  return round(value, digits);
}

function spanLengthForSketch(spanLengths, index) {
  const current = toNullableNumber(spanLengths[index]);
  if (current !== null && current > 0) {
    return current;
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    const prior = toNullableNumber(spanLengths[i]);
    if (prior !== null && prior > 0) {
      return prior;
    }
  }
  return 1;
}

function normalizeDeckRebar(input = {}) {
  const normalizeGroup = (group = {}) => ({
    spacing: typeof group.spacing === 'string' ? group.spacing : toInputValue(group.spacing),
    primaryBar: group.primaryBar ?? '',
    alternating: Boolean(group.alternating),
    secondaryBar: group.secondaryBar ?? '',
  });

  return {
    longitudinalTop: normalizeGroup(input.longitudinalTop),
    longitudinalBottom: normalizeGroup(input.longitudinalBottom),
    transverseTop: normalizeGroup(input.transverseTop),
    transverseBottom: normalizeGroup(input.transverseBottom),
  };
}

function validateSectionLocateSegments(project) {
  if (project.schedules.sectionConstant) {
    return '';
  }

  const totalLength = project.geometry.spanLengths_ft.reduce((sum, span) => sum + toNumber(span), 0);
  const segments = project.schedules.sectionLocateSegments || [];

  if (!segments.length) {
    return 'Add at least one section location segment.';
  }

  const normalized = [];
  for (const segment of segments) {
    const start = Number(segment.startX);
    const end = Number(segment.endX);

    if (segment.startX === '' || segment.endX === '' || !Number.isFinite(start) || !Number.isFinite(end)) {
      return 'Each section location must have numeric start and end locations.';
    }
    if (start >= end - SECTION_CONTIGUITY_TOLERANCE) {
      return 'Each section location must satisfy start < end.';
    }
    normalized.push({ start, end });
  }

  normalized.sort((a, b) => a.start - b.start);
  if (Math.abs(normalized[0].start) > SECTION_CONTIGUITY_TOLERANCE) {
    return `Section locations must start at 0 ft and cover the full length (${round(totalLength, 3)} ft) with no gaps or overlaps.`;
  }

  const lastEnd = normalized[normalized.length - 1].end;
  if (Math.abs(lastEnd - totalLength) > SECTION_CONTIGUITY_TOLERANCE) {
    return `Section locations must cover the full length (${round(totalLength, 3)} ft) with no gaps or overlaps. Check segment boundaries: expected 0–50, 50–110, 110–160 style contiguity.`;
  }

  for (let i = 0; i < normalized.length - 1; i += 1) {
    if (Math.abs(normalized[i].end - normalized[i + 1].start) > SECTION_CONTIGUITY_TOLERANCE) {
      return `Section locations must cover the full length (${round(totalLength, 3)} ft) with no gaps or overlaps. Check segment boundaries: expected 0–50, 50–110, 110–160 style contiguity.`;
    }
  }

  const coveredLength = normalized.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
  if (Math.abs(coveredLength - totalLength) > SECTION_CONTIGUITY_TOLERANCE) {
    return `Section locations must cover the full length (${round(totalLength, 3)} ft) with no gaps or overlaps. Check segment boundaries: expected 0–50, 50–110, 110–160 style contiguity.`;
  }

  return '';
}

function withLocationsAndDemands(project) {
  const spanLengths = project.geometry.spanLengths_ft;
  const supportLocations = [];
  const spanLocations = [];

  let runningX = 0;
  for (let i = 0; i <= project.geometry.numberOfSpans; i += 1) {
    const isFirst = i === 0;
    const isLast = i === project.geometry.numberOfSpans;
    const name = isFirst ? 'Abutment A' : isLast ? 'Abutment B' : `Pier ${i}`;

    supportLocations.push({
      id: `support-${i}`,
      name,
      type: 'support',
      x_global_ft: round(runningX, 3),
      defaultMomentSign: -1,
    });

    if (!isLast) {
      const length = spanLengths[i] ?? 0;
      const point = project.geometry.spanPoints[i] ?? { momentAtMid: true, xPrime_ft: length / 2 };
      const xInSpan = point.momentAtMid ? length / 2 : point.xPrime_ft;

      spanLocations.push({
        id: `span-${i + 1}`,
        name: `Span ${i + 1}`,
        type: 'span',
        x_global_ft: round(runningX + xInSpan, 3),
        spanIndex: i,
        x_in_span_ft: round(xInSpan, 3),
        defaultMomentSign: 1,
      });

      runningX += length;
    }
  }

  const locations = [];
  supportLocations.forEach((support, index) => {
    locations.push(support);
    if (index < spanLocations.length) {
      locations.push(spanLocations[index]);
    }
  });

  const nextDemand = { ...project.demandByLocation };
  const nextOverrides = { ...project.comboOverridesByLocation };

  locations.forEach((location) => {
    const legacyLiveLoad = nextDemand[location.id]?.LL_IM;
    if (!nextDemand[location.id]) {
      nextDemand[location.id] = {
        DC1: { M_kft: null, V_k: null },
        DC2: { M_kft: null, V_k: null },
        DW: { M_kft: null, V_k: null },
        LL_truck: { M_kft: null, V_k: null },
        LL_tandem: { M_kft: null, V_k: null },
      };
    } else {
      nextDemand[location.id] = {
        ...nextDemand[location.id],
        LL_truck: nextDemand[location.id].LL_truck ?? legacyLiveLoad ?? { M_kft: null, V_k: null },
        LL_tandem: nextDemand[location.id].LL_tandem ?? { M_kft: null, V_k: null },
      };
    }
    if (!nextOverrides[location.id]) {
      nextOverrides[location.id] = {};
    }
  });


  const spanStudLayouts = Array.from({ length: project.geometry.numberOfSpans }, (_, index) => ({
    id: `span-${index + 1}`,
    name: `Span ${index + 1}`,
    studsPerRow: project.schedules?.spanStudLayouts?.[index]?.studsPerRow ?? null,
    numberOfRows: project.schedules?.spanStudLayouts?.[index]?.numberOfRows ?? null,
    spacing_in: project.schedules?.spanStudLayouts?.[index]?.spacing_in ?? null,
    diameter_in: project.schedules?.spanStudLayouts?.[index]?.diameter_in ?? null,
    Fy_ksi: project.schedules?.spanStudLayouts?.[index]?.Fy_ksi ?? null,
  }));

  const supportNames = ['Abutment A', ...Array.from({ length: Math.max(project.geometry.numberOfSpans - 1, 0) }, (_, i) => `P${i + 1}`), 'Abutment B'];
  const supportStudLayouts = supportNames.map((name, index) => ({
    id: `support-${index}`,
    name,
    studsPerRow: project.schedules?.supportStudLayouts?.[index]?.studsPerRow ?? null,
    numberOfRows: project.schedules?.supportStudLayouts?.[index]?.numberOfRows ?? null,
    spacing_in: project.schedules?.supportStudLayouts?.[index]?.spacing_in ?? null,
    diameter_in: project.schedules?.supportStudLayouts?.[index]?.diameter_in ?? null,
    Fy_ksi: project.schedules?.supportStudLayouts?.[index]?.Fy_ksi ?? null,
  }));

  const sectionAssignments = spanLocations.map((location, index) => ({
    id: location.id,
    locationId: location.id,
    labelId: project.schedules?.sectionAssignments?.[index]?.labelId ?? null,
  }));

  const existingRows = project.schedules?.studLayout?.rows || [];
  const defaultRowsFromLegacy = [
    ...(project.schedules?.spanStudLayouts || []).map((row) => ({
      ...row,
      startX_ft: null,
      endX_ft: null,
    })),
    ...(project.schedules?.supportStudLayouts || []).map((row) => ({
      ...row,
      startX_ft: null,
      endX_ft: null,
    })),
  ];
  const sourceRows = existingRows.length ? existingRows : defaultRowsFromLegacy;
  const studRows = createStudLayoutRows(project.geometry.numberOfSpans, supportLocations, sourceRows);
  const constantsFromLegacy = sourceRows[0] || {};

  const sectionLabels =
    project.schedules?.sectionLabels?.length
      ? project.schedules.sectionLabels
      : [createSectionLabel('SEC-A')];
  const sectionConstantChoice = project.schedules?.sectionConstantChoice
    ?? (typeof project.schedules?.sectionConstant === 'boolean' ? (project.schedules.sectionConstant ? 'yes' : 'no') : null);

  const totalLength = spanLengths.reduce((sum, value) => sum + toNumber(value), 0);
  const legacySectionLocations = project.schedules?.sectionLocations || [];
  const defaultLabelId = sectionLabels[0]?.id ?? '';
  const migratedSegments = (project.schedules?.sectionLocateSegments || []).map((segment) =>
    createSectionLocateSegment(segment.labelId || defaultLabelId, {
      id: segment.id,
      startX: segment.startX ?? toInputValue(segment.startX_ft),
      endX: segment.endX ?? toInputValue(segment.endX_ft),
    }),
  );
  const sectionLocateSegments = migratedSegments.length
    ? migratedSegments
    : legacySectionLocations.length
      ? legacySectionLocations.map((row, index) => {
          const fallbackStart = index === 0 ? '0' : '';
          const fallbackEnd = index === 0 && totalLength ? String(totalLength) : '';
          return createSectionLocateSegment(row.sectionId || defaultLabelId, {
            id: row.id,
            startX: toInputValue(row.startX_ft ?? fallbackStart),
            endX: toInputValue(row.endX_ft ?? fallbackEnd),
          });
        })
      : [createSectionLocateSegment(defaultLabelId, { startX: '0', endX: totalLength ? String(totalLength) : '' })];

  const normalizedSegments = sectionLocateSegments.map((segment, index) => ({
    ...segment,
    labelId:
      segment.labelId && sectionLabels.some((section) => section.id === segment.labelId)
        ? segment.labelId
        : sectionLabels[index]?.id || defaultLabelId || '',
  }));

  return {
    ...project,
    geometry: {
      ...project.geometry,
      overhangsVary: Boolean(project.geometry?.overhangsVary),
      overhangLength_ft: project.geometry?.overhangLength_ft ?? 0,
      overhangLeft_ft: project.geometry?.overhangLeft_ft ?? 0,
      overhangRight_ft: project.geometry?.overhangRight_ft ?? 0,
    },
    derived: { locations },
    schedules: {
      ...project.schedules,
      sectionConstantChoice,
      spanStudLayouts,
      supportStudLayouts,
      studLayout: {
        simpleLayout: project.schedules?.studLayout?.simpleLayout ?? true,
        constants: {
          studsPerRow: project.schedules?.studLayout?.constants?.studsPerRow ?? constantsFromLegacy.studsPerRow ?? null,
          diameter_in: project.schedules?.studLayout?.constants?.diameter_in ?? constantsFromLegacy.diameter_in ?? null,
          Fy_ksi: project.schedules?.studLayout?.constants?.Fy_ksi ?? constantsFromLegacy.Fy_ksi ?? null,
        },
        rows: studRows,
      },
      sectionAssignments,
      sectionLabels,
      sectionLocateSegments: normalizedSegments,
      diaphragmLocations: ((project.schedules?.diaphragmLocations || []).length
        ? project.schedules?.diaphragmLocations
        : [createDiaphragm()]
      ),
    },
    deckRebar: normalizeDeckRebar(project.deckRebar || createDeckRebar()),
    demandByLocation: nextDemand,
    comboOverridesByLocation: nextOverrides,
  };
}

function buildFactoredCombinations(demandByLocation) {
  const factors = {
    StrengthI: { DC1: 1.25, DC2: 1.5, DW: 1.5, LL_IM: 1.75 },
    ServiceII: { DC1: 1, DC2: 1, DW: 1, LL_IM: 1.3 },
    Constructability_DCOnly: { DC1: 1.25, DC2: 1.5, DW: 1.5, LL_IM: 0 },
    Constructability_WithLL: { DC1: 1.25, DC2: 1.5, DW: 1.5, LL_IM: 1 },
    Fatigue: { DC1: 0, DC2: 0, DW: 0, LL_IM: 1 },
  };

  const output = {};

  Object.entries(demandByLocation).forEach(([locationId, effects]) => {
    const normalizeMoment = (value) => toNumber(value) * 12;
    const normalizeShear = (value) => toNumber(value);
    const calc = (factorMap, field) =>
      Object.entries(factorMap).reduce((sum, [effectKey, factor]) => {
        let entry = effects[effectKey] || { M_kft: 0, V_k: 0 };
        if (effectKey === 'LL_IM') {
          const truck = effects.LL_truck || { M_kft: 0, V_k: 0 };
          const tandem = effects.LL_tandem || { M_kft: 0, V_k: 0 };
          const truckValue = field === 'M' ? normalizeMoment(truck.M_kft) : normalizeShear(truck.V_k);
          const tandemValue = field === 'M' ? normalizeMoment(tandem.M_kft) : normalizeShear(tandem.V_k);
          return sum + factor * (Math.abs(truckValue) >= Math.abs(tandemValue) ? truckValue : tandemValue);
        }
        const value = field === 'M' ? normalizeMoment(entry.M_kft) : normalizeShear(entry.V_k);
        return sum + factor * value;
      }, 0);

    output[locationId] = {
      StrengthI: { M_u_kipin: calc(factors.StrengthI, 'M'), V_u_k: calc(factors.StrengthI, 'V') },
      ServiceII: { M_s_kipin: calc(factors.ServiceII, 'M'), V_s_k: calc(factors.ServiceII, 'V') },
      Constructability: {
        DCOnly: {
          M_c_kipin: calc(factors.Constructability_DCOnly, 'M'),
          V_c_k: calc(factors.Constructability_DCOnly, 'V'),
        },
        WithLL: {
          M_c_kipin: calc(factors.Constructability_WithLL, 'M'),
          V_c_k: calc(factors.Constructability_WithLL, 'V'),
        },
      },
      Fatigue: { M_f_kipin: calc(factors.Fatigue, 'M'), V_f_k: calc(factors.Fatigue, 'V') },
    };
  });

  return output;
}

function computeAutoDeadLoad(project) {
  const spacing = project.geometry.constantSpacing
    ? project.geometry.spacing_ft
    : project.geometry.spacingArray_ft.reduce((sum, value) => sum + toNumber(value), 0) /
      Math.max(1, project.geometry.spacingArray_ft.length);

  const inputs = project.autoDeadLoad;
  const effectiveWidth = Math.max(spacing, 0);
  const deckAndHaunch_ft = (toNumber(inputs.deckThickness_in) + toNumber(inputs.haunchThickness_in)) / 12;

  const concreteDensity = toNumber(inputs.concreteDensity_pcf, 150);
  const deckLineLoad = effectiveWidth * deckAndHaunch_ft * concreteDensity / 1000;
  const parapet_kft = toNumber(inputs.parapet_plf) / 1000;
  const wearingLineLoad = (toNumber(inputs.wearingSurface_psf) * effectiveWidth) / 1000;

  const DC_line_kft = round(deckLineLoad + parapet_kft, 4);
  const DW_line_kft = round(wearingLineLoad, 4);

  return { DC_line_kft, DW_line_kft };
}

function PlaceholderSketch({ title, children }) {
  return (
    <div className={styles.svgBlock}>
      {children}
      <h4 className={styles.diagramLabel}>{title}</h4>
    </div>
  );
}

function Symbol({ label, sub }) {
  return (
    <span>
      {label}
      <sub>{sub}</sub>
    </span>
  );
}

function NumericInput({ value, onCommit, disabled = false, className = '' }) {
  const [draft, setDraft] = useState(toInputValue(value));

  useEffect(() => {
    setDraft(toInputValue(value));
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = toNullableNumber(draft);
        onCommit(parsed);
        setDraft(toInputValue(parsed));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
          const parsed = toNullableNumber(draft);
          onCommit(parsed);
          setDraft(toInputValue(parsed));
        }
      }}
    />
  );
}


function ToggleChoice({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) {
  return (
    <div className={styles.toggleButtonGroup}>
      <button
        type="button"
        className={`${styles.toggleButton} ${value ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange(true)}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${!value ? styles.toggleButtonActive : ''}`}
        onClick={() => onChange(false)}
      >
        {noLabel}
      </button>
    </div>
  );
}

function formatDisplay(value, digits = 3) {
  if (value === null || typeof value === 'undefined' || Number.isNaN(Number(value))) {
    return '—';
  }
  return round(Number(value), digits);
}

export default function CompositeSteelGirderLrfdPage() {
  const [project, setProject] = useState(() => withLocationsAndDemands(createInitialProject()));
  const [activeTab, setActiveTab] = useState(TAB_LABELS[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sectionLocateError, setSectionLocateError] = useState('');
  const diaphragmValueMemoryRef = useRef([]);

  const totalBridgeLength = useMemo(
    () => project.geometry.spanLengths_ft.reduce((sum, value) => sum + toNumber(value), 0),
    [project.geometry.spanLengths_ft],
  );

  const buildRandomProject = (current) => {
    const numberOfSpans = randomInt(2, 6);
    const baseSpan = randomDecimal(20, 42, 1);
    const spanLengths = Array.from({ length: numberOfSpans }, (_, i) => {
      if (i === 0) {
        return baseSpan;
      }
      return Math.max(15, Math.min(50, round(baseSpan + randomDecimal(-8, 8, 1), 1)));
    });
    const avgSpan = spanLengths.reduce((sum, value) => sum + value, 0) / spanLengths.length;
    const overhangBase = round(avgSpan * randomDecimal(0.1, 0.2, 2), 1);
    const numberOfGirders = randomInt(4, 12);
    const spacing_ft = randomDecimal(4, 10, 1);
    const depth = randomDecimal(24, 48, 1);
    const topFlange = round(depth * randomDecimal(0.3, 0.45, 2), 1);
    const botFlange = round(depth * randomDecimal(0.3, 0.45, 2), 1);
    const web = round(depth * randomDecimal(0.035, 0.06, 3), 2);
    const totalLength = spanLengths.reduce((sum, value) => sum + value, 0);
    const diaphragmCount = randomInt(2, 8);
    const diaphragms = Array.from({ length: diaphragmCount }, (_, index) => {
      const x = round(((index + 1) / (diaphragmCount + 1)) * totalLength, 1);
      return { id: crypto.randomUUID(), x_ft: x };
    });

    return {
      ...current,
      geometry: {
        ...current.geometry,
        numberOfSpans,
        spanLengths_ft: spanLengths,
        spanPoints: spanLengths.map((length) => ({ momentAtMid: true, xPrime_ft: round(length / 2, 3) })),
        overhangsVary: false,
        overhangLength_ft: overhangBase,
        overhangLeft_ft: overhangBase,
        overhangRight_ft: overhangBase,
        numberOfGirders,
        constantSpacing: true,
        spacing_ft,
        spacingArray_ft: Array.from({ length: Math.max(0, numberOfGirders - 1) }, () => spacing_ft),
        skew_deg: randomDecimal(0, 25, 1),
      },
      schedules: {
        ...current.schedules,
        sectionLabels: current.schedules.sectionLabels.map((section, index) =>
          index === 0
            ? {
                ...section,
                D_in: depth,
                tw_in: web,
                tf_top_in: randomDecimal(0.75, 2.25, 2),
                bf_top_in: topFlange,
                tf_bot_in: randomDecimal(0.75, 2.25, 2),
                bf_bot_in: botFlange,
              }
            : section,
        ),
        studLayout: {
          ...current.schedules.studLayout,
          constants: {
            ...current.schedules.studLayout.constants,
            studsPerRow: randomInt(2, 4),
            diameter_in: randomDecimal(0.75, 1, 2),
            Fy_ksi: randomInt(50, 65),
          },
        },
        diaphragmLocations: diaphragms,
      },
      materials: {
        ...current.materials,
        Fy_ksi: randomInt(50, 70),
        fc_ksi: randomDecimal(4, 6, 1),
      },
      autoDeadLoad: {
        ...current.autoDeadLoad,
        deckThickness_in: randomDecimal(7, 10, 1),
        haunchThickness_in: randomDecimal(1.5, 3, 1),
        wearingSurface_psf: randomInt(0, 30),
        parapet_plf: randomInt(200, 900),
      },
    };
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_BASE_KEY);
    if (!raw) {
      return;
    }

    try {
      const restored = JSON.parse(raw);
      diaphragmValueMemoryRef.current = (restored?.schedules?.diaphragmLocations || []).map((row) => row?.x_ft ?? null);
      setProject(withLocationsAndDemands(restored));
    } catch (error) {
      console.error('Failed to restore project state', error);
    }
  }, []);

  useEffect(() => {
    const modifiedAt = nowIso();
    const toSave = {
      ...project,
      meta: { ...project.meta, modifiedAt },
    };

    const keyByName = `calculator:${CALCULATOR_ID}:${project.meta.projectName || 'untitled'}`;
    window.localStorage.setItem(STORAGE_BASE_KEY, JSON.stringify(toSave));
    window.localStorage.setItem(keyByName, JSON.stringify(toSave));
  }, [project]);

  const combos = useMemo(() => buildFactoredCombinations(project.demandByLocation), [project.demandByLocation]);

  const updateProject = (updater) => {
    setProject((current) => {
      const nextRaw = typeof updater === 'function' ? updater(current) : updater;
      return withLocationsAndDemands({
        ...nextRaw,
        meta: {
          ...nextRaw.meta,
          modifiedAt: nowIso(),
        },
      });
    });
  };

  const setDemand = (locationId, componentKey, field, value) => {
    updateProject((current) => ({
      ...current,
      demandByLocation: {
        ...current.demandByLocation,
        [locationId]: {
          ...current.demandByLocation[locationId],
          [componentKey]: {
            ...current.demandByLocation[locationId][componentKey],
            [field]: value,
          },
        },
      },
    }));
  };

  const allTabsReadOnly = activeTab !== 'Inputs' && !project.settings.allowEditingInputsOnOtherTabs;
  const sectionConstantChoice = project.schedules.sectionConstantChoice;
  const sectionChoiceMade = sectionConstantChoice === 'yes' || sectionConstantChoice === 'no';
  const displayedSectionLabels = project.schedules.sectionConstant
    ? project.schedules.sectionLabels.slice(0, 1)
    : project.schedules.sectionLabels;


  const runSectionLocateValidation = (targetProject = project) => {
    const error = validateSectionLocateSegments(targetProject);
    setSectionLocateError(error);
    return !error;
  };

  const deckRebarSecondaryErrors = useMemo(() => {
    const groups = project.deckRebar || createDeckRebar();
    return {
      longitudinalTop: groups.longitudinalTop.alternating && !groups.longitudinalTop.secondaryBar,
      longitudinalBottom: groups.longitudinalBottom.alternating && !groups.longitudinalBottom.secondaryBar,
      transverseTop: groups.transverseTop.alternating && !groups.transverseTop.secondaryBar,
      transverseBottom: groups.transverseBottom.alternating && !groups.transverseBottom.secondaryBar,
    };
  }, [project.deckRebar]);

  const renderResultsTab = (tabName) => {
    const locations = project.derived.locations;
    const rows = locations.map((location) => ({
      ...location,
      combo: combos[location.id]?.StrengthI || { M_u_kipin: 0, V_u_k: 0 },
    }));

    const governing = rows.reduce((best, row) => {
      const metric = Math.abs(row.combo.M_u_kipin);
      if (!best || metric > best.metric) {
        return { id: row.id, metric };
      }
      return best;
    }, null);

    const selectedLocationId = project.selectedLocationByTab[tabName] || governing?.id;

    const selectedRow = rows.find((entry) => entry.id === selectedLocationId) || rows[0];

    return (
      <>

        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Read-only input summary</h3>
          <div className={styles.grid4}>
            <label className={styles.field}>
              Number of spans
              <input value={project.geometry.numberOfSpans} disabled />
            </label>
            <label className={styles.field}>
              Number of girders
              <input value={project.geometry.numberOfGirders} disabled />
            </label>
            <label className={styles.field}>
              Skew (deg)
              <input value={project.geometry.skew_deg} disabled />
            </label>
            <label className={styles.field}>
              Governing location
              <select
                value={selectedLocationId}
                onChange={(event) =>
                  updateProject((current) => ({
                    ...current,
                    selectedLocationByTab: {
                      ...current.selectedLocationByTab,
                      [tabName]: event.target.value,
                    },
                  }))
                }
              >
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Summary results table placeholder</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Strength I Mu (kip-in)</th>
                  <th>Strength I Vu (k)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.id === governing?.id ? styles.governing : ''}
                    onClick={() =>
                      updateProject((current) => ({
                        ...current,
                        selectedLocationByTab: {
                          ...current.selectedLocationByTab,
                          [tabName]: row.id,
                        },
                      }))
                    }
                  >
                    <td>{row.name}</td>
                    <td>{round(row.combo.M_u_kipin, 2)}</td>
                    <td>{round(row.combo.V_u_k, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Full calculations (Selected location)</h3>
          <div className={styles.placeholderResult}>
            Placeholder for {tabName} detailed calculations at <strong>{selectedRow?.name}</strong>. Full AASHTO LRFD equation
            implementation will be added in the next phase.
          </div>
        </section>
      </>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
        <div>
          <h1>Composite Steel Girder (LRFD)</h1>
          <p className={styles.muted}>
            Multi-span composite steel girder check per AASHTO LRFD (BDS 9th Ed, 2020).
          </p>
          <p className={styles.meta}>
            Created: {new Date(project.meta.createdAt).toLocaleString()} | Modified: {new Date(project.meta.modifiedAt).toLocaleString()}
          </p>
        </div>
        <div className={styles.actions}>
          <label className={styles.field}>
            Project name
            <input
              value={project.meta.projectName}
              onChange={(event) =>
                updateProject((current) => ({
                  ...current,
                  meta: { ...current.meta, projectName: event.target.value },
                }))
              }
            />
          </label>
          <button className={styles.secondaryButton} type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => {
              const fresh = withLocationsAndDemands(createInitialProject());
              diaphragmValueMemoryRef.current = [];
              setProject(fresh);
            }}
          >
            New Project
          </button>
          <button
            className={`${styles.secondaryButton} ${styles.utilityButton}`}
            type="button"
            onClick={() => updateProject((current) => buildRandomProject(current))}
          >
            <span>Random Input</span>
            <small>temporary</small>
          </button>
          <button
            className={`${styles.secondaryButton} ${styles.utilityButton}`}
            type="button"
            onClick={() => window.alert('Example Input coming soon.')}
          >
            <span>Example Input</span>
            <small>temporary</small>
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => {
              if (window.confirm('Reset this project to defaults? This cannot be undone.')) {
                const fresh = withLocationsAndDemands(createInitialProject());
                diaphragmValueMemoryRef.current = [];
                setProject(fresh);
              }
            }}
          >
            Reset Project
          </button>
        </div>
        </header>

        <nav className={styles.tabRow}>
        {TAB_LABELS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => {
              if (tab !== 'Inputs' && !runSectionLocateValidation()) {
                setActiveTab('Inputs');
                return;
              }
              setActiveTab(tab);
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

        {activeTab === 'Inputs' ? (
        <>
          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>General Input</h3>

            <h4>Spans</h4>
            <div className={styles.grid4}>
              <label className={styles.field}>
                # of spans
                <input
                  type="text"
                  inputMode="numeric"
                  value={project.geometry.numberOfSpans}
                  disabled={allTabsReadOnly}
                  onChange={(event) => {
                    const nextCount = Math.max(1, Math.floor(toNumber(event.target.value, 1)));
                    updateProject((current) => {
                      const lastSpanLength = current.geometry.spanLengths_ft[current.geometry.spanLengths_ft.length - 1] ?? null;
                      const nextSpans = resizeArray(current.geometry.spanLengths_ft, nextCount, lastSpanLength).map((value, index) =>
                        index < current.geometry.spanLengths_ft.length ? value : null,
                      );
                      const nextPoints = resizeArray(current.geometry.spanPoints, nextCount, () => ({ momentAtMid: true, xPrime_ft: null })).map((point, index) => {
                        const sketchSpan = spanLengthForSketch(nextSpans, index);
                        return { ...point, xPrime_ft: point.momentAtMid ? sketchSpan / 2 : point.xPrime_ft };
                      });
                      return {
                        ...current,
                        geometry: {
                          ...current.geometry,
                          numberOfSpans: nextCount,
                          spanLengths_ft: nextSpans,
                          spanPoints: nextPoints,
                        },
                      };
                    });
                  }}
                />
              </label>
              {project.geometry.spanLengths_ft.map((span, index) => (
                <label key={`span-${index}`} className={styles.field}>
                  Span {index + 1} (ft)
                  <NumericInput
                    value={span}
                    onCommit={(value) =>
                      updateProject((current) => {
                        const next = [...current.geometry.spanLengths_ft];
                        next[index] = value;
                        const nextPoints = [...current.geometry.spanPoints];
                        const point = nextPoints[index];
                        if (point?.momentAtMid) {
                          nextPoints[index] = { ...point, xPrime_ft: toNumber(value, 0) / 2 };
                        }
                        return { ...current, geometry: { ...current.geometry, spanLengths_ft: next, spanPoints: nextPoints } };
                      })
                    }
                  />
                </label>
              ))}
            </div>

            <h4><strong>Overhang Length</strong></h4>
            <div className={styles.inlineInputsRow}>
              <span>Overhang lengths vary</span>
              <ToggleChoice
                value={Boolean(project.geometry.overhangsVary)}
                onChange={(nextChecked) =>
                  updateProject((current) => ({
                    ...current,
                    geometry: {
                      ...current.geometry,
                      overhangsVary: nextChecked,
                      overhangLeft_ft: nextChecked ? current.geometry.overhangLeft_ft : current.geometry.overhangLength_ft,
                      overhangRight_ft: nextChecked ? current.geometry.overhangRight_ft : current.geometry.overhangLength_ft,
                    },
                  }))
                }
              />
            </div>
            <div className={styles.grid4}>
              {project.geometry.overhangsVary ? (
                <>
                  <label className={styles.field}>
                    Left overhang (ft)
                    <NumericInput value={project.geometry.overhangLeft_ft} onCommit={(value) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, overhangLeft_ft: value } }))} />
                  </label>
                  <label className={styles.field}>
                    Right overhang (ft)
                    <NumericInput value={project.geometry.overhangRight_ft} onCommit={(value) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, overhangRight_ft: value } }))} />
                  </label>
                </>
              ) : (
                <label className={styles.field}>
                  Overhang length (ft)
                  <NumericInput
                    value={project.geometry.overhangLength_ft}
                    onCommit={(value) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, overhangLength_ft: value, overhangLeft_ft: value, overhangRight_ft: value } }))}
                  />
                </label>
              )}
            </div>

            <h4>Girders</h4>
            <div className={styles.grid4}>
              <label className={styles.field}>
                # of girders
                <NumericInput
                  value={project.geometry.numberOfGirders}
                  onCommit={(value) => {
                    const girders = Math.max(1, Math.floor(toNumber(value, 1)));
                    updateProject((current) => ({
                      ...current,
                      geometry: {
                        ...current.geometry,
                        numberOfGirders: girders,
                        spacingArray_ft: resizeArray(current.geometry.spacingArray_ft, Math.max(0, girders - 1), current.geometry.spacing_ft),
                      },
                    }));
                  }}
                />
              </label>
              <label className={styles.field}>
                Skew (deg)
                <NumericInput value={project.geometry.skew_deg} onCommit={(value) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, skew_deg: value } }))} />
              </label>
            </div>
            <div className={styles.inlineInputsRow}>
              <span>Constant spacing</span>
              <ToggleChoice value={project.geometry.constantSpacing} onChange={(nextChecked) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, constantSpacing: nextChecked } }))} />
            </div>
            {project.geometry.constantSpacing ? (
              <label className={styles.field}>
                Spacing (ft)
                <NumericInput
                  value={project.geometry.spacing_ft}
                  onCommit={(value) =>
                    updateProject((current) => {
                      const spacing = value;
                      return {
                        ...current,
                        geometry: {
                          ...current.geometry,
                          spacing_ft: spacing,
                          spacingArray_ft: resizeArray(current.geometry.spacingArray_ft, Math.max(0, current.geometry.numberOfGirders - 1), spacing).map(() => spacing),
                        },
                      };
                    })
                  }
                />
              </label>
            ) : (
              <div className={styles.grid4}>
                {resizeArray(project.geometry.spacingArray_ft, Math.max(0, project.geometry.numberOfGirders - 1), project.geometry.spacing_ft).map((value, index) => (
                  <label className={styles.field} key={`spacing-${index}`}>
                    Girder {index + 1} to {index + 2} (ft)
                    <NumericInput
                      value={value}
                      onCommit={(nextValue) =>
                        updateProject((current) => {
                          const next = resizeArray(current.geometry.spacingArray_ft, Math.max(0, current.geometry.numberOfGirders - 1), current.geometry.spacing_ft);
                          next[index] = nextValue;
                          return { ...current, geometry: { ...current.geometry, spacingArray_ft: next } };
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}

            <PlaceholderSketch title="Elevation">
              <svg viewBox="0 0 900 220" width="100%" height="220" role="img" aria-label="Bridge elevation">
                <rect x="0" y="0" width="900" height="220" fill="white" />
                {(() => {
                  const spanLengthsForSketch = project.geometry.spanLengths_ft.map((_, index) => spanLengthForSketch(project.geometry.spanLengths_ft, index));
                  const spanTotal = spanLengthsForSketch.reduce((sum, value) => sum + toNumber(value), 0);
                  const leftOverhang = toNumber(project.geometry.overhangsVary ? project.geometry.overhangLeft_ft : project.geometry.overhangLength_ft, 0);
                  const rightOverhang = toNumber(project.geometry.overhangsVary ? project.geometry.overhangRight_ft : project.geometry.overhangLength_ft, 0);
                  const total = spanTotal + leftOverhang + rightOverhang || 1;
                  const beamStartX = 40;
                  const beamEndX = 860;
                  const beamBottomY = 145;
                  const beamDepth = 24;
                  const beamTopY = beamBottomY - beamDepth;
                  const flangeThickness = 5;
                  const supportTopY = beamBottomY;
                  const supportHalfBase = 6;
                  const supportHeight = 15;
                  let cursor = beamStartX + (leftOverhang / total) * (beamEndX - beamStartX);

                  const supports = [cursor];
                  return project.geometry.spanLengths_ft.map((span, index) => {
                    const width = (toNumber(spanLengthsForSketch[index]) / total) * (beamEndX - beamStartX);
                    const supportX = cursor;
                    cursor += width;
                    supports.push(cursor);
                    return (
                      <g key={`span-svg-${index}`}>
                        <text x={supportX + width / 2} y="92" textAnchor="middle" fontSize="14" fontWeight="700">
                          L
                          <tspan baselineShift="sub" fontSize="10">{index + 1}</tspan>
                          {toNullableNumber(span) !== null ? `= ${formatDisplay(span)} ft` : ""}
                        </text>
                      </g>
                    );
                  }).concat(
                    <g key="beam-shape">
                      <rect x={beamStartX} y={beamTopY} width={beamEndX - beamStartX} height={beamDepth} fill="#9ca3af" stroke="#111" strokeWidth="1.5" />
                      <rect x={beamStartX} y={beamTopY} width={beamEndX - beamStartX} height={flangeThickness} fill="#6b7280" />
                      <rect x={beamStartX} y={beamBottomY - flangeThickness} width={beamEndX - beamStartX} height={flangeThickness} fill="#6b7280" />
                      {supports.map((supportX, index) => (
                        <polygon
                          key={`support-${index}`}
                          points={`${supportX},${supportTopY} ${supportX - supportHalfBase},${supportTopY + supportHeight} ${supportX + supportHalfBase},${supportTopY + supportHeight}`}
                          fill="#d1d5db"
                          stroke="black"
                        />
                      ))}
                    </g>,
                  );
                })()}
              </svg>
            </PlaceholderSketch>

            <div className={styles.svgBlock}>
              <svg viewBox="0 0 820 230" width="100%" height="230" role="img" aria-label="Bridge cross section">
                <rect width="820" height="230" fill="white" />
                <rect x="60" y="70" width="700" height="20" fill="#e5e7eb" stroke="black" strokeWidth="1.5" />
                {Array.from({ length: Math.max(1, toNumber(project.geometry.numberOfGirders, 1)) }, (_, i) => {
                  const count = Math.max(1, toNumber(project.geometry.numberOfGirders, 1));
                  const x = count === 1 ? 410 : 80 + (i * 680) / (count - 1);
                  return (
                    <g key={`girder-${i}`}>
                      <rect x={x - 24} y="95" width="48" height="10" fill="#9ca3af" stroke="black" strokeWidth="1.5" />
                      <rect x={x - 5} y="105" width="10" height="74" fill="#9ca3af" stroke="black" strokeWidth="1.5" />
                      <rect x={x - 24} y="179" width="48" height="10" fill="#9ca3af" stroke="black" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>
              <h4 className={styles.diagramLabel}>Cross Section</h4>
              <p className={styles.diagramSubLabel}>{formatDisplay(project.geometry.numberOfGirders, 0)} Girders</p>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>The Girder Section is Constant</h3>
            <div className={styles.actions}>
              <button
                type="button"
                className={sectionConstantChoice === 'yes' ? styles.button : styles.secondaryButton}
                onClick={() =>
                  updateProject((current) => ({
                    ...current,
                    schedules: {
                      ...current.schedules,
                      sectionConstantChoice: 'yes',
                      sectionConstant: true,
                      sectionLabels: current.schedules.sectionLabels.length
                        ? current.schedules.sectionLabels
                        : [createSectionLabel('SEC-A')],
                    },
                  }))
                }
              >
                Yes
              </button>
              <button
                type="button"
                className={sectionConstantChoice === 'no' ? styles.button : styles.secondaryButton}
                onClick={() =>
                  updateProject((current) => ({
                    ...current,
                    schedules: {
                      ...current.schedules,
                      sectionConstantChoice: 'no',
                      sectionConstant: false,
                      sectionLabels: current.schedules.sectionLabels.length >= 2
                        ? current.schedules.sectionLabels
                        : [...current.schedules.sectionLabels, createSectionLabel('SEC-B')],
                    },
                  }))
                }
              >
                No
              </button>
            </div>

            {sectionChoiceMade && (
              <>
                <div className={styles.sectionInputsHorizontal}>
                  {displayedSectionLabels.map((section, index) => (
                    <div key={section.id} className={styles.sectionRow}>
                      {!project.schedules.sectionConstant && (
                        <div className={styles.sectionRowTitle}>Section {index + 1}</div>
                      )}
                      <label className={styles.inlineField}>Section label<input value={section.name} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLabels: current.schedules.sectionLabels.map((entry) => entry.id === section.id ? { ...entry, name: event.target.value } : entry) } }))} /></label>
                      {[
                        ['D_in', 'D (in)'],
                        ['tw_in', 'tw (in)'],
                        ['tf_top_in', 'tf_top (in)'],
                        ['bf_top_in', 'bf_top (in)'],
                        ['tf_bot_in', 'tf_bot (in)'],
                        ['bf_bot_in', 'bf_bot (in)'],
                      ].map(([key, title]) => (
                        <label className={styles.inlineField} key={`${section.id}-${key}`}>
                          {title}
                          <NumericInput value={section[key]} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLabels: current.schedules.sectionLabels.map((entry) => entry.id === section.id ? { ...entry, [key]: value } : entry) } }))} />
                        </label>
                      ))}
                      {(!project.schedules.sectionConstant && project.schedules.sectionLabels.length > 1) && (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() =>
                            updateProject((current) => {
                              const nextSectionLabels = current.schedules.sectionLabels.filter((entry) => entry.id !== section.id);
                              const fallbackId = nextSectionLabels[0]?.id || '';
                              const isNowSingleSection = nextSectionLabels.length <= 1;

                              return {
                                ...current,
                                schedules: {
                                  ...current.schedules,
                                  sectionConstantChoice: isNowSingleSection ? 'yes' : current.schedules.sectionConstantChoice,
                                  sectionConstant: isNowSingleSection ? true : current.schedules.sectionConstant,
                                  sectionLabels: nextSectionLabels,
                                  sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((segment) =>
                                    segment.labelId === section.id
                                      ? { ...segment, labelId: fallbackId }
                                      : segment,
                                  ),
                                },
                              };
                            })
                          }
                        >
                          Remove section
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!project.schedules.sectionConstant && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      updateProject((current) => {
                        const nextSection = createSectionLabel(`SEC-${current.schedules.sectionLabels.length + 1}`);
                        return {
                          ...current,
                          schedules: {
                            ...current.schedules,
                            sectionLabels: [...current.schedules.sectionLabels, nextSection],
                          },
                        };
                      })
                    }
                  >
                    Add section
                  </button>
                )}

                {!project.schedules.sectionConstant && (
                  <div>
                    <h4>Locate Sections</h4>
                    {sectionLocateError && <div className={`${styles.callout} ${styles.warning}`}>{sectionLocateError}</div>}
                    <div className={styles.tableWrap}>
                      <table className={`${styles.table} ${styles.compactTable}`}>
                        <thead><tr><th>Section Label</th><th>Start Location</th><th>End Location</th><th /></tr></thead>
                        <tbody>
                          {(project.schedules.sectionLocateSegments || []).map((locationRow) => {
                            const start = Number(locationRow.startX);
                            const end = Number(locationRow.endX);
                            const hasRangeError = Number.isFinite(start) && Number.isFinite(end) && start >= end;
                            return (
                            <tr key={locationRow.id}>
                              <td>
                                <select
                                  className={`${styles.dropdownSelect} ${styles.sectionSelect}`}
                                  value={locationRow.labelId}
                                  onChange={(event) =>
                                    updateProject((current) => ({
                                      ...current,
                                      schedules: {
                                        ...current.schedules,
                                        sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((entry) =>
                                          entry.id === locationRow.id ? { ...entry, labelId: event.target.value } : entry,
                                        ),
                                      },
                                    }))
                                  }
                                >
                                  {!project.schedules.sectionLabels.length && <option value="">No labels defined</option>}
                                  {project.schedules.sectionLabels.map((label) => (
                                    <option key={label.id} value={label.id}>{label.name || 'Untitled section'}</option>
                                  ))}
                                </select>
                              </td>
                              <td><input type="text" inputMode="decimal" value={locationRow.startX} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((entry) => entry.id === locationRow.id ? { ...entry, startX: event.target.value } : entry) } }))} onBlur={() => runSectionLocateValidation()} /></td>
                              <td>
                                <input type="text" inputMode="decimal" value={locationRow.endX} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((entry) => entry.id === locationRow.id ? { ...entry, endX: event.target.value } : entry) } }))} onBlur={() => runSectionLocateValidation()} />
                                {hasRangeError && <div className={styles.muted}>Start location should be less than end location.</div>}
                              </td>
                              <td><button type="button" className={styles.secondaryButton} onClick={() => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLocateSegments: current.schedules.sectionLocateSegments.filter((entry) => entry.id !== locationRow.id) } }))}>Remove</button></td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() =>
                        updateProject((current) => ({
                          ...current,
                          schedules: {
                            ...current.schedules,
                            sectionLocateSegments: [
                              ...(current.schedules.sectionLocateSegments || []),
                              createSectionLocateSegment(current.schedules.sectionLabels[0]?.id || ''),
                            ],
                          },
                        }))
                      }
                    >
                      Add location
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Stud Layouts</h3>
            <div className={`${styles.inlineInputsRow} ${styles.buttonRowSpacing}`}>
              <span>Simple layout</span>
              <ToggleChoice
                value={project.schedules.studLayout?.simpleLayout ?? true}
                onChange={(nextChecked) =>
                  updateProject((current) => ({
                    ...current,
                    schedules: {
                      ...current.schedules,
                      studLayout: {
                        ...current.schedules.studLayout,
                        simpleLayout: nextChecked,
                      },
                    },
                  }))
                }
              />
            </div>

            {(project.schedules.studLayout?.simpleLayout ?? true) && (
              <div className={styles.inlineInputsRow}>
                <label className={styles.inlineField}># of studs per row<NumericInput className={styles.smallInput} value={project.schedules.studLayout?.constants?.studsPerRow} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, studLayout: { ...current.schedules.studLayout, constants: { ...current.schedules.studLayout.constants, studsPerRow: value } } } }))} /></label>
                <label className={styles.inlineField}>Stud Diameter (in)<NumericInput className={styles.smallInput} value={project.schedules.studLayout?.constants?.diameter_in} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, studLayout: { ...current.schedules.studLayout, constants: { ...current.schedules.studLayout.constants, diameter_in: value } } } }))} /></label>
                <label className={styles.inlineField}>F<sub>y</sub> (ksi)<NumericInput className={styles.smallInput} value={project.schedules.studLayout?.constants?.Fy_ksi} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, studLayout: { ...current.schedules.studLayout, constants: { ...current.schedules.studLayout.constants, Fy_ksi: value } } } }))} /></label>
              </div>
            )}

            <div className={styles.studLayoutContent}>
              <div className={`${styles.tableWrap} ${styles.studLayoutTable}`}><table className={`${styles.table} ${styles.compactTable}`}><thead><tr><th>Name</th><th>Start Location</th><th>End Location</th><th>Spacing</th>{!(project.schedules.studLayout?.simpleLayout ?? true) && <><th># of studs per row</th><th>Stud Diameter (in)</th><th>F<sub>y</sub> (ksi)</th></>}</tr></thead><tbody>
              {(project.schedules.studLayout?.rows || []).map((row, idx) => (
                <tr key={row.id}><td>{row.name}</td>
                  <td><NumericInput value={row.startX_ft} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, studLayout:{...current.schedules.studLayout, rows: current.schedules.studLayout.rows.map((entry, i)=> i===idx ? {...entry,startX_ft: value}:entry)}}}))} /></td>
                  <td><NumericInput value={row.endX_ft} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, studLayout:{...current.schedules.studLayout, rows: current.schedules.studLayout.rows.map((entry, i)=> i===idx ? {...entry,endX_ft: value}:entry)}}}))} /></td>
                  <td><NumericInput value={row.spacing_in} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, studLayout:{...current.schedules.studLayout, rows: current.schedules.studLayout.rows.map((entry, i)=> i===idx ? {...entry,spacing_in: value}:entry)}}}))} /></td>
                  {!(project.schedules.studLayout?.simpleLayout ?? true) && (
                    <>
                      <td><NumericInput value={row.studsPerRow} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, studLayout:{...current.schedules.studLayout, rows: current.schedules.studLayout.rows.map((entry, i)=> i===idx ? {...entry,studsPerRow: value}:entry)}}}))} /></td>
                      <td><NumericInput value={row.diameter_in} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, studLayout:{...current.schedules.studLayout, rows: current.schedules.studLayout.rows.map((entry, i)=> i===idx ? {...entry,diameter_in: value}:entry)}}}))} /></td>
                      <td><NumericInput value={row.Fy_ksi} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, studLayout:{...current.schedules.studLayout, rows: current.schedules.studLayout.rows.map((entry, i)=> i===idx ? {...entry,Fy_ksi: value}:entry)}}}))} /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody></table></div>
            <div className={styles.studLayoutSketch}>
            <PlaceholderSketch title="Stud Layout">
              <svg viewBox="0 0 340 250" width="100%" height="250">
                <rect width="340" height="250" fill="white" />
                <rect x="86" y="68" width="168" height="14" fill="#9ca3af" stroke="black" strokeWidth="1.5" />
                <rect x="166" y="82" width="8" height="124" fill="#9ca3af" stroke="black" strokeWidth="1.5" />
                <rect x="86" y="206" width="168" height="14" fill="#9ca3af" stroke="black" strokeWidth="1.5" />
                {(() => {
                  const studCount = Math.max(0, Math.floor(toNumber(project.schedules.studLayout?.constants?.studsPerRow, 0)));
                  const spacing = studCount <= 1 ? 0 : 140 / (studCount - 1);
                  const flangeCenterX = 170;
                  const firstX = flangeCenterX - (spacing * (studCount - 1)) / 2;
                  return Array.from({ length: studCount }, (_, idx) => {
                    const x = firstX + idx * spacing;
                    return (
                      <g key={`stud-${idx}`}>
                        <rect x={x - 3} y="38" width="6" height="30" fill="#374151" />
                        <rect x={x - 5} y="32" width="10" height="6" fill="#6b7280" />
                      </g>
                    );
                  });
                })()}
              </svg>
            </PlaceholderSketch>
            </div>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Diaphragm Location</h3>
            <div className={`${styles.inlineInputsRow} ${styles.buttonRowSpacing}`}>
              <label className={styles.inlineField}>
                Number of diaphragms
                <NumericInput
                  className={styles.smallInput}
                  value={project.schedules.diaphragmLocations.length}
                  onCommit={(value) => {
                    const count = Math.max(1, Math.floor(toNumber(value, 1)));
                    updateProject((current) => {
                      current.schedules.diaphragmLocations.forEach((entry, index) => {
                        diaphragmValueMemoryRef.current[index] = entry.x_ft;
                      });
                      const next = resizeArray(current.schedules.diaphragmLocations, count, () => createDiaphragm()).map((entry, index) => {
                        if (index >= current.schedules.diaphragmLocations.length && (diaphragmValueMemoryRef.current[index] ?? null) !== null) {
                          return { ...entry, x_ft: diaphragmValueMemoryRef.current[index] };
                        }
                        return entry;
                      });
                      return {
                        ...current,
                        schedules: {
                          ...current.schedules,
                          diaphragmLocations: next,
                        },
                      };
                    });
                  }}
                />
              </label>
              <button type="button" className={styles.secondaryButton} onClick={() => updateProject((current) => ({ ...current, schedules: { ...current.schedules, diaphragmLocations: [...current.schedules.diaphragmLocations, createDiaphragm()] } }))}>Add</button>
              <button type="button" className={styles.secondaryButton} onClick={() => updateProject((current) => ({ ...current, schedules: { ...current.schedules, diaphragmLocations: current.schedules.diaphragmLocations.length > 1 ? current.schedules.diaphragmLocations.slice(0, -1) : current.schedules.diaphragmLocations } }))}>Remove</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.diaphragmTable}`}><thead><tr><th>Diaphragm</th><th>Location (ft) <span className={styles.infoIcon}>i<span className={styles.tooltipBox}>Distance from Abutment 1</span></span></th></tr></thead><tbody>
                {project.schedules.diaphragmLocations.map((row, index) => (
                  <tr key={row.id}>
                    <td>D{index + 1}</td>
                    <td><NumericInput value={row.x_ft} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, diaphragmLocations: current.schedules.diaphragmLocations.map((entry, idx)=>{ if (entry.id!==row.id) return entry; const clamped = value===null ? null : Math.max(0, Math.min(totalBridgeLength, value)); diaphragmValueMemoryRef.current[idx] = clamped; return {...entry,x_ft:clamped}; })}}))} /></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <div className={styles.svgBlock}>
              <svg viewBox="0 0 900 260" width="100%" height="260" role="img" aria-label="Structural steel plan with girders and diaphragms">
                <rect x="0" y="0" width="900" height="260" fill="white" />
                {Array.from({ length: Math.max(1, toNumber(project.geometry.numberOfGirders, 5)) }, (_, i) => {
                  const count = Math.max(1, toNumber(project.geometry.numberOfGirders, 5));
                  const y = count === 1 ? 130 : 40 + (i * 180) / (count - 1);
                  return <line key={`plan-girder-${i}`} x1="70" y1={y} x2="860" y2={y} stroke="#1f2937" strokeWidth="2" />;
                })}
                {(() => {
                  const girderYs = Array.from({ length: Math.max(1, toNumber(project.geometry.numberOfGirders, 5)) }, (_, i) => {
                    const count = Math.max(1, toNumber(project.geometry.numberOfGirders, 5));
                    return count === 1 ? 130 : 40 + (i * 180) / (count - 1);
                  });
                  const totalLength = project.geometry.spanLengths_ft.reduce((sum, value) => sum + toNumber(value), 0) || 1;
                  const cumulativePierMarkers = [];
                  let running = 0;
                  for (let i = 0; i < project.geometry.spanLengths_ft.length - 1; i += 1) {
                    running += toNumber(project.geometry.spanLengths_ft[i]);
                    cumulativePierMarkers.push({ label: `Pier ${i + 1}`, xValue: running });
                  }

                  const diaphragmGroups = (project.schedules.diaphragmLocations || []).map((row, idx) => {
                    if (row.x_ft === null || row.x_ft === "" || typeof row.x_ft === "undefined") {
                      return null;
                    }
                    const clampedValue = Math.max(0, Math.min(totalLength, toNumber(row.x_ft, 0)));
                    const x = 70 + (clampedValue / totalLength) * 790;
                    return (
                      <g key={`dia-line-${row.id}`}>
                        {girderYs.slice(0, -1).map((y, yIdx) => (
                          <line key={`dia-seg-${row.id}-${yIdx}`} x1={x} y1={y + 4} x2={x} y2={girderYs[yIdx + 1] - 4} stroke="#2563eb" strokeWidth="2" />
                        ))}
                        <text x={x} y="246" textAnchor="middle" fontSize="12" fill="#1d4ed8" fontWeight="700">D{idx + 1}</text>
                      </g>
                    );
                  });

                  const supportGroups = [{ label: 'Abutment 1', xValue: 0 }, ...cumulativePierMarkers, { label: 'Abutment 2', xValue: totalLength }].map((marker) => {
                    const x = 70 + (Math.max(0, marker.xValue) / totalLength) * 790;
                    return (
                      <g key={`support-marker-${marker.label}`}>
                        <line x1={x} y1="28" x2={x} y2="232" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="2 8" />
                        <text x={x} y="20" textAnchor="middle" fontSize="12" fill="#111" fontWeight="600">{marker.label}</text>
                      </g>
                    );
                  });

                  return [...supportGroups, ...diaphragmGroups.filter(Boolean)];
                })()}
              </svg>
              <h4 className={styles.diagramLabel}>Structural Steel Plan</h4>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Deck Reinforcement</h3>
            {[
              { key: 'longitudinal', title: 'Longitudinal reinforcement', groups: [['longitudinalTop', 'Top'], ['longitudinalBottom', 'Bottom']] },
              { key: 'transverse', title: 'Transverse reinforcement', groups: [['transverseTop', 'Top'], ['transverseBottom', 'Bottom']] },
            ].map((category) => (
              <div className={styles.svgBlock} key={category.key}>
                <h4>{category.title}</h4>
                <div className={styles.deckRebarPairGrid}>
                  {category.groups.map(([groupKey, label]) => {
                    const group = project.deckRebar[groupKey];
                    const showSecondaryError = deckRebarSecondaryErrors[groupKey];
                    return (
                      <div key={groupKey} className={styles.deckRebarPanel}>
                        <h5 className={styles.deckRebarPanelTitle}>{label}</h5>
                        <div className={styles.deckRebarInputsCompact}>
                          <label className={styles.field}>
                            Bar size (primary)
                            <select className={styles.dropdownSelect}
                              value={group.primaryBar}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  deckRebar: {
                                    ...current.deckRebar,
                                    [groupKey]: { ...current.deckRebar[groupKey], primaryBar: event.target.value },
                                  },
                                }))
                              }
                            >
                              <option value="">Select bar size</option>
                              {REBAR_BAR_OPTIONS.filter(Boolean).map((option) => <option key={`${groupKey}-primary-${option}`} value={option}>{option}</option>)}
                            </select>
                          </label>
                          <label className={styles.field}>
                            Spacing (primary) (in)
                            <input
                              type="text"
                              inputMode="decimal"
                              value={group.spacing}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  deckRebar: {
                                    ...current.deckRebar,
                                    [groupKey]: { ...current.deckRebar[groupKey], spacing: event.target.value },
                                  },
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className={styles.inlineInputsRow}>
                          <span>Alternating bars</span>
                          <ToggleChoice
                            value={group.alternating}
                            onChange={(nextChecked) =>
                              updateProject((current) => ({
                                ...current,
                                deckRebar: {
                                  ...current.deckRebar,
                                  [groupKey]: { ...current.deckRebar[groupKey], alternating: nextChecked },
                                },
                              }))
                            }
                          />
                        </div>
                        {group.alternating && (
                          <>
                            <div className={styles.deckRebarInputsCompact}>
                              <label className={styles.field}>
                                Bar size (secondary)
                                <select className={styles.dropdownSelect}
                                  value={group.secondaryBar || ''}
                                  onChange={(event) =>
                                    updateProject((current) => ({
                                      ...current,
                                      deckRebar: {
                                        ...current.deckRebar,
                                        [groupKey]: { ...current.deckRebar[groupKey], secondaryBar: event.target.value },
                                      },
                                    }))
                                  }
                                >
                                  <option value="">Select bar size</option>
                                  {REBAR_BAR_OPTIONS.filter(Boolean).map((option) => <option key={`${groupKey}-secondary-${option}`} value={option}>{option}</option>)}
                                </select>
                              </label>
                            </div>
                            <div className={styles.muted}>
                              {`${group.primaryBar || '#5'} @ ${group.spacing || '12'} in alternating with ${group.secondaryBar || '#6'} @ ${group.spacing || '12'} in → bar every ${group.spacing ? round(toNumber(group.spacing) / 2, 3) : '6'} in, alternating sizes`}
                            </div>
                            {showSecondaryError && <div className={styles.inlineError}>Secondary bar size is required when alternating bars is enabled.</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Materials</h3>
            <div className={styles.grid3}>
              <label className={styles.field}>Steel F<sub>y</sub> (ksi)<NumericInput value={project.materials.Fy_ksi} onCommit={(value) => updateProject((current) => ({ ...current, materials: { ...current.materials, Fy_ksi: value } }))} /></label>
              <label className={styles.field}>Concrete f'<sub>c</sub> (ksi)<NumericInput value={project.materials.fc_ksi} onCommit={(value) => updateProject((current) => ({ ...current, materials: { ...current.materials, fc_ksi: value } }))} /></label>
              <label className={styles.field}>E<sub>s</sub> (ksi)<NumericInput value={project.materials.Es_ksi} onCommit={(value) => updateProject((current) => ({ ...current, materials: { ...current.materials, Es_ksi: value } }))} /></label>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Dead Loads</h3>
            <div className={styles.grid3}>
              <label className={styles.field}>Deck thickness (in)<NumericInput value={project.autoDeadLoad.deckThickness_in} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, deckThickness_in: value } }))} /></label>
              <label className={styles.field}>Haunch thickness (in)<NumericInput value={project.autoDeadLoad.haunchThickness_in} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, haunchThickness_in: value } }))} /></label>
              <label className={styles.field}>Wearing Surface (psf)<NumericInput value={project.autoDeadLoad.wearingSurface_psf} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, wearingSurface_psf: value } }))} /></label>
              <label className={styles.field}>Parapet (plf)<NumericInput value={project.autoDeadLoad.parapet_plf} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, parapet_plf: value } }))} /></label>
              <label className={styles.field}>Steel Density (pcf)<NumericInput value={project.autoDeadLoad.steelDensity_pcf} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, steelDensity_pcf: value } }))} /></label>
              <label className={styles.field}>Concrete Density (pcf)<NumericInput value={project.autoDeadLoad.concreteDensity_pcf} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, concreteDensity_pcf: value } }))} /></label>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Live Loads from STAAD</h3>
            <p className={styles.muted}>Enter undistributed and unfactored moments and shears. At Piers, the maximum -M shall be entered and near midspans, the maximum +M shall be entered.</p>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.narrowTable}`}>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th className={styles.xGlobalCell}>X global (ft)</th>
                    {['DC1', 'DC2', 'DW', 'LL_truck', 'LL_tandem'].map((effect) => <th key={`${effect}-m`}><Symbol label="M" sub={effect === 'LL_truck' ? 'truck' : effect === 'LL_tandem' ? 'tandem' : effect} /> (k-ft)</th>)}
                    {['DC1', 'DC2', 'DW', 'LL_truck', 'LL_tandem'].map((effect) => <th key={`${effect}-v`}><Symbol label="V" sub={effect === 'LL_truck' ? 'truck' : effect === 'LL_tandem' ? 'tandem' : effect} /> (k)</th>)}
                  </tr>
                </thead>
                <tbody>
                  {project.derived.locations.map((location) => (
                    <tr key={location.id}>
                      <td>{location.name}</td>
                      <td className={styles.xGlobalCell}>
                        {location.type === 'span' ? (
                          <div className={styles.xGlobalInputCell}>
                            <NumericInput
                              className={styles.narrowXInput}
                              value={location.x_global_ft}
                              onCommit={(value) =>
                                updateProject((current) => {
                                  const spanStart = current.geometry.spanLengths_ft
                                    .slice(0, location.spanIndex)
                                    .reduce((sum, length) => sum + toNumber(length, 0), 0);
                                  const spanLength = toNumber(current.geometry.spanLengths_ft[location.spanIndex], 0);
                                  const normalized = value === null ? null : Math.max(0, Math.min(spanLength, value - spanStart));
                                  const nextPoints = [...current.geometry.spanPoints];
                                  nextPoints[location.spanIndex] = { ...nextPoints[location.spanIndex], xPrime_ft: normalized };
                                  return { ...current, geometry: { ...current.geometry, spanPoints: nextPoints } };
                                })
                              }
                              disabled={project.geometry.spanPoints[location.spanIndex]?.momentAtMid}
                            />
                            <div className={styles.compactToggleRow}>
                              <span>midspan</span>
                              <ToggleChoice
                                value={Boolean(project.geometry.spanPoints[location.spanIndex]?.momentAtMid)}
                                onChange={(nextChecked) =>
                                  updateProject((current) => {
                                    const nextPoints = [...current.geometry.spanPoints];
                                    const spanLength = toNumber(current.geometry.spanLengths_ft[location.spanIndex], 0);
                                    nextPoints[location.spanIndex] = {
                                      ...nextPoints[location.spanIndex],
                                      momentAtMid: nextChecked,
                                      xPrime_ft: nextChecked ? spanLength / 2 : nextPoints[location.spanIndex]?.xPrime_ft,
                                    };
                                    return { ...current, geometry: { ...current.geometry, spanPoints: nextPoints } };
                                  })
                                }
                              />
                            </div>
                          </div>
                        ) : location.name.startsWith('Pier') ? (
                          'At Pier'
                        ) : (
                          formatDisplay(location.x_global_ft)
                        )}
                      </td>
                      {['DC1', 'DC2', 'DW', 'LL_truck', 'LL_tandem'].map((effect) => (
                        <td key={`${location.id}-${effect}-m`}><NumericInput value={project.demandByLocation[location.id]?.[effect]?.M_kft} onCommit={(value) => setDemand(location.id, effect, 'M_kft', value)} /></td>
                      ))}
                      {['DC1', 'DC2', 'DW', 'LL_truck', 'LL_tandem'].map((effect) => (
                        <td key={`${location.id}-${effect}-v`}><NumericInput value={project.demandByLocation[location.id]?.[effect]?.V_k} onCommit={(value) => setDemand(location.id, effect, 'V_k', value)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </>
        ) : (
          renderResultsTab(activeTab)
        )}
      </div>

      {settingsOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>Calculator settings</h3>
            <div className={styles.inlineInputsRow}>
              <span>Allow editing inputs on other tabs</span>
              <ToggleChoice value={project.settings.allowEditingInputsOnOtherTabs} onChange={(nextChecked) => updateProject((current) => ({ ...current, settings: { ...current.settings, allowEditingInputsOnOtherTabs: nextChecked } }))} />
            </div>
            <div className={styles.inlineInputsRow}>
              <span>Allow overriding factored combinations</span>
              <ToggleChoice value={project.settings.allowOverridingFactoredCombinations} onChange={(nextChecked) => updateProject((current) => ({ ...current, settings: { ...current.settings, allowOverridingFactoredCombinations: nextChecked } }))} />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.button} type="button" onClick={() => setSettingsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
