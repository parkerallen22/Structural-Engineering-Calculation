'use client';

import { useEffect, useMemo, useState } from 'react';
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
      liveLoadNote:
        'Live Load is assumed identical for all girders; design typically governed by the girder with higher dead load (commonly interior).',
    },
    settings: {
      allowEditingInputsOnOtherTabs: false,
      allowOverridingFactoredCombinations: false,
    },
    geometry: {
      numberOfSpans: 2,
      spanLengths_ft: [120, 120],
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
      wearingSurfaceThickness_in: 0,
      parapetRailLineLoad_kft: 0,
      sipForms_psf: 0,
      steelUnitWeight_pcf: 490,
      verifiedByUser: false,
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

function resizeArray(source, targetLength, fallbackValue) {
  const next = [...source];
  while (next.length < targetLength) {
    next.push(fallbackValue);
  }
  return next.slice(0, targetLength);
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
    if (!nextDemand[location.id]) {
      nextDemand[location.id] = {
        DC1: { M_kft: null, V_k: null },
        DC2: { M_kft: null, V_k: null },
        DW: { M_kft: null, V_k: null },
        LL_IM: { M_kft: null, V_k: null },
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
      ? (project.schedules.sectionConstant ? [project.schedules.sectionLabels[0]] : project.schedules.sectionLabels)
      : [createSectionLabel('SEC-A')];

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
    derived: { locations },
    schedules: {
      ...project.schedules,
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
        const entry = effects[effectKey] || { M_kft: 0, V_k: 0 };
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
  const wearing_ft = toNumber(inputs.wearingSurfaceThickness_in) / 12;

  const concreteWeight_pcf = 150;
  const wearingWeight_pcf = 140;

  const deckLineLoad = effectiveWidth * deckAndHaunch_ft * concreteWeight_pcf / 1000;
  const wearingLineLoad = effectiveWidth * wearing_ft * wearingWeight_pcf / 1000;
  const sipForms_kft = (toNumber(inputs.sipForms_psf) * effectiveWidth) / 1000;

  const DC_line_kft = round(deckLineLoad + toNumber(inputs.parapetRailLineLoad_kft), 4);
  const DW_line_kft = round(wearingLineLoad + sipForms_kft, 4);

  return { DC_line_kft, DW_line_kft };
}

function PlaceholderSketch({ title, children }) {
  return (
    <div className={styles.svgBlock}>
      <h4>{title}</h4>
      {children}
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

function NumericInput({ value, onCommit, disabled = false }) {
  const [draft, setDraft] = useState(toInputValue(value));

  useEffect(() => {
    setDraft(toInputValue(value));
  }, [value]);

  return (
    <input
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
    />
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

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_BASE_KEY);
    if (!raw) {
      return;
    }

    try {
      const restored = JSON.parse(raw);
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
  const deadLoads = useMemo(() => computeAutoDeadLoad(project), [project]);

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
        {!project.autoDeadLoad.verifiedByUser && (
          <div className={`${styles.callout} ${styles.warning}`}>
            Results are scaffold-only. Please acknowledge auto-computed DC/DW on Inputs first.
          </div>
        )}
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
              setProject(fresh);
            }}
          >
            New Project
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => {
              if (window.confirm('Reset this project to defaults? This cannot be undone.')) {
                const fresh = withLocationsAndDemands(createInitialProject());
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
            <h3 className={styles.sectionTitle}>General / Geometry</h3>
            <div className={styles.grid4}>
              <label className={styles.field}>
                Number of spans
                <NumericInput
                  value={project.geometry.numberOfSpans}
                  onCommit={(value) => {
                    const nextCount = Math.max(1, Math.floor(toNumber(value, 1)));
                    updateProject((current) => {
                      const nextSpans = resizeArray(current.geometry.spanLengths_ft, nextCount, null);
                      const nextPoints = resizeArray(current.geometry.spanPoints, nextCount, { momentAtMid: true, xPrime_ft: null }).map((point, index) => {
                        const spanL = toNumber(nextSpans[index], 0);
                        return { ...point, xPrime_ft: point.momentAtMid ? spanL / 2 : point.xPrime_ft };
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
                  disabled={allTabsReadOnly}
                />
              </label>

              <label className={styles.field}>
                Skew (deg)
                <NumericInput value={project.geometry.skew_deg} onCommit={(value) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, skew_deg: value } }))} />
              </label>

              <label className={styles.field}>
                Number of girders
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

              <label className={styles.inlineCheckbox}>
                <input type="checkbox" checked={project.geometry.constantSpacing} onChange={(event) => updateProject((current) => ({ ...current, geometry: { ...current.geometry, constantSpacing: event.target.checked } }))} />
                Constant spacing
              </label>
            </div>

            <h4>Span lengths (ft)</h4>
            <div className={styles.grid4}>
              {project.geometry.spanLengths_ft.map((span, index) => (
                <label key={`span-${index}`} className={styles.field}>
                  Span {index + 1}
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

            <h4>Girder spacing (ft)</h4>
            {project.geometry.constantSpacing ? (
              <label className={styles.field}>
                Constant spacing (ft)
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
                    Between Girder {index + 1} & {index + 2}
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

            <PlaceholderSketch title="Elevation diagram (dynamic)">
              <svg viewBox="0 0 900 220" width="100%" height="220" role="img" aria-label="Bridge elevation">
                <rect x="0" y="0" width="900" height="220" fill="white" />
                <line x1="40" y1="100" x2="860" y2="100" stroke="black" strokeWidth="3" />
                {(() => {
                  const total = project.geometry.spanLengths_ft.reduce((sum, value) => sum + toNumber(value), 0) || 1;
                  let cursor = 40;
                  return project.geometry.spanLengths_ft.map((span, index) => {
                    const width = (toNumber(span) / total) * 820;
                    const supportX = cursor;
                    cursor += width;
                    return (
                      <g key={`span-svg-${index}`}>
                        <polygon points={`${supportX},140 ${supportX - 12},170 ${supportX + 12},170`} fill="#d1d5db" stroke="black" />
                        <text x={supportX + width / 2 - 28} y="86" fontSize="14" fontWeight="700">L{index + 1}={formatDisplay(span)} ft</text>
                        <line x1={supportX} y1="115" x2={supportX + width} y2="115" stroke="#111" strokeWidth="1" />
                      </g>
                    );
                  });
                })()}
                <polygon points="860,140 848,170 872,170" fill="#d1d5db" stroke="black" />
                <text x="40" y="200" fontSize="14" fontWeight="700">
                  Skew: {formatDisplay(project.geometry.skew_deg)}° | Girders: {formatDisplay(project.geometry.numberOfGirders)}
                </text>
              </svg>
            </PlaceholderSketch>

            <PlaceholderSketch title="Bridge Cross Section">
              <svg viewBox="0 0 820 230" width="100%" height="230" role="img" aria-label="Bridge cross section">
                <rect width="820" height="230" fill="white" />
                <path d="M60 70 Q410 30 760 70 L760 88 L60 88 Z" fill="#e5e7eb" stroke="black" strokeWidth="2" />
                {Array.from({ length: Math.max(1, toNumber(project.geometry.numberOfGirders, 1)) }, (_, i) => {
                  const count = Math.max(1, toNumber(project.geometry.numberOfGirders, 1));
                  const x = count === 1 ? 410 : 80 + (i * 680) / (count - 1);
                  return <rect key={`girder-${i}`} x={x - 9} y="88" width="18" height="106" fill="#9ca3af" stroke="black" strokeWidth="2" />;
                })}
                <text x="60" y="210" fontSize="16" fontWeight="700">Girders shown: {formatDisplay(project.geometry.numberOfGirders, 0)}</text>
              </svg>
            </PlaceholderSketch>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Section Schedule</h3>
            <label className={styles.inlineCheckbox}>
              <input
                type="checkbox"
                checked={project.schedules.sectionConstant}
                onChange={(event) =>
                  updateProject((current) => ({
                    ...current,
                    schedules: {
                      ...current.schedules,
                      sectionConstant: event.target.checked,
                      sectionLabels: event.target.checked ? [current.schedules.sectionLabels[0] || createSectionLabel('SEC-A')] : current.schedules.sectionLabels,
                    },
                  }))
                }
              />
              Section constant along girder
            </label>

            <div className={styles.grid3}>
              {project.schedules.sectionLabels.map((section) => (
                <div key={section.id} className={styles.svgBlock}>
                  <label className={styles.field}>Section label<input value={section.name} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLabels: current.schedules.sectionLabels.map((entry) => entry.id === section.id ? { ...entry, name: event.target.value } : entry) } }))} /></label>
                  {[
                    ['D_in', 'D (in)'],
                    ['tw_in', 'tw (in)'],
                    ['tf_top_in', 'tf_top (in)'],
                    ['bf_top_in', 'bf_top (in)'],
                    ['tf_bot_in', 'tf_bot (in)'],
                    ['bf_bot_in', 'bf_bot (in)'],
                  ].map(([key, title]) => (
                    <label className={styles.field} key={`${section.id}-${key}`}>
                      {title}
                      <NumericInput value={section[key]} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, sectionLabels: current.schedules.sectionLabels.map((entry) => entry.id === section.id ? { ...entry, [key]: value } : entry) } }))} />
                    </label>
                  ))}
                  {(!project.schedules.sectionConstant && project.schedules.sectionLabels.length > 1) && (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          updateProject((current) => ({
                            ...current,
                            schedules: {
                              ...current.schedules,
                              sectionLabels: current.schedules.sectionLabels.filter((entry) => entry.id !== section.id),
                              sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((segment) =>
                                segment.labelId === section.id
                                  ? { ...segment, labelId: current.schedules.sectionLabels.find((entry) => entry.id !== section.id)?.id || '' }
                                  : segment,
                              ),
                            },
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
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
                  <table className={styles.table}>
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
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={locationRow.startX}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  schedules: {
                                    ...current.schedules,
                                    sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((entry) =>
                                      entry.id === locationRow.id ? { ...entry, startX: event.target.value } : entry,
                                    ),
                                  },
                                }))
                              }
                              onBlur={() => runSectionLocateValidation()}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={locationRow.endX}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  schedules: {
                                    ...current.schedules,
                                    sectionLocateSegments: (current.schedules.sectionLocateSegments || []).map((entry) =>
                                      entry.id === locationRow.id ? { ...entry, endX: event.target.value } : entry,
                                    ),
                                  },
                                }))
                              }
                              onBlur={() => runSectionLocateValidation()}
                            />
                            {hasRangeError && <div className={styles.muted}>Start location should be less than end location.</div>}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() =>
                                updateProject((current) => ({
                                  ...current,
                                  schedules: {
                                    ...current.schedules,
                                    sectionLocateSegments: current.schedules.sectionLocateSegments.filter((entry) => entry.id !== locationRow.id),
                                  },
                                }))
                              }
                            >
                              Remove
                            </button>
                          </td>
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
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Stud Layout</h3>
            <label className={styles.inlineCheckbox}>
              <input
                type="checkbox"
                checked={project.schedules.studLayout?.simpleLayout ?? true}
                onChange={(event) =>
                  updateProject((current) => ({
                    ...current,
                    schedules: {
                      ...current.schedules,
                      studLayout: {
                        ...current.schedules.studLayout,
                        simpleLayout: event.target.checked,
                      },
                    },
                  }))
                }
              />
              Simple layout
            </label>

            {(project.schedules.studLayout?.simpleLayout ?? true) && (
              <div className={styles.grid3}>
                <label className={styles.field}># of studs per row<NumericInput value={project.schedules.studLayout?.constants?.studsPerRow} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, studLayout: { ...current.schedules.studLayout, constants: { ...current.schedules.studLayout.constants, studsPerRow: value } } } }))} /></label>
                <label className={styles.field}>Stud Diameter (in)<NumericInput value={project.schedules.studLayout?.constants?.diameter_in} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, studLayout: { ...current.schedules.studLayout, constants: { ...current.schedules.studLayout.constants, diameter_in: value } } } }))} /></label>
                <label className={styles.field}>F<sub>y</sub> (ksi)<NumericInput value={project.schedules.studLayout?.constants?.Fy_ksi} onCommit={(value) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, studLayout: { ...current.schedules.studLayout, constants: { ...current.schedules.studLayout.constants, Fy_ksi: value } } } }))} /></label>
              </div>
            )}

            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Name</th><th>Start Location</th><th>End Location</th><th>Spacing</th>{!(project.schedules.studLayout?.simpleLayout ?? true) && <><th># of studs per row</th><th>Stud Diameter (in)</th><th>F<sub>y</sub> (ksi)</th></>}</tr></thead><tbody>
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
            <PlaceholderSketch title="Stud layout diagram">
              <svg viewBox="0 0 260 160" width="100%" height="160"><rect width="260" height="160" fill="white" /><rect x="20" y="70" width="220" height="20" fill="#d1d5db" stroke="black" />{[40,65,90,115,140,165,190,215].map((x) => <line key={x} x1={x} y1="56" x2={x} y2="70" stroke="black" strokeWidth="4" />)}<text x="20" y="28" fontSize="12" fontWeight="700">Stud layout template</text></svg>
            </PlaceholderSketch>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Diaphragm Locations</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>Name</th><th>distance from abutment x</th><th /></tr></thead><tbody>
                {project.schedules.diaphragmLocations.map((row, index) => (
                  <tr key={row.id}>
                    <td>Diaphragm {index + 1}</td>
                    <td><NumericInput value={row.x_ft} onCommit={(value)=>updateProject((current)=>({ ...current, schedules:{...current.schedules, diaphragmLocations: current.schedules.diaphragmLocations.map((entry)=>entry.id===row.id?{...entry,x_ft:value}:entry)}}))} /></td>
                    <td><button type="button" className={styles.secondaryButton} onClick={()=>updateProject((current)=>({ ...current, schedules:{...current.schedules, diaphragmLocations: current.schedules.diaphragmLocations.length > 1 ? current.schedules.diaphragmLocations.filter((entry)=>entry.id!==row.id) : current.schedules.diaphragmLocations}}))}>Remove</button></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={()=>updateProject((current)=>({ ...current, schedules:{...current.schedules, diaphragmLocations:[...current.schedules.diaphragmLocations,createDiaphragm()]}}))}>Add diaphragm</button>
            <div className={styles.svgBlock}>
              <h4>Steel framing plan</h4>
              <svg viewBox="0 0 900 260" width="100%" height="260" role="img" aria-label="Steel framing plan with girders and diaphragms">
                <rect x="0" y="0" width="900" height="260" fill="white" />
                {Array.from({ length: Math.max(1, toNumber(project.geometry.numberOfGirders, 5)) }, (_, i) => {
                  const count = Math.max(1, toNumber(project.geometry.numberOfGirders, 5));
                  const y = count === 1 ? 130 : 40 + (i * 180) / (count - 1);
                  return <line key={`plan-girder-${i}`} x1="70" y1={y} x2="860" y2={y} stroke="#1f2937" strokeWidth="2" />;
                })}
                {(() => {
                  const totalLength = project.geometry.spanLengths_ft.reduce((sum, value) => sum + toNumber(value), 0) || 1;
                  const cumulativePierMarkers = [];
                  let running = 0;
                  for (let i = 0; i < project.geometry.spanLengths_ft.length - 1; i += 1) {
                    running += toNumber(project.geometry.spanLengths_ft[i]);
                    cumulativePierMarkers.push({ label: `Pier ${i + 1}`, xValue: running });
                  }

                  return (project.schedules.diaphragmLocations || []).map((row, idx) => {
                    const x = 70 + (Math.max(0, toNumber(row.x_ft, 0)) / totalLength) * 790;
                    return (
                      <g key={`dia-line-${row.id}`}>
                        <line x1={x} y1="35" x2={x} y2="225" stroke="#2563eb" strokeWidth="2" strokeDasharray="5 4" />
                        <text x={x + 4} y="50" fontSize="12" fill="#1d4ed8" fontWeight="700">D{idx + 1}</text>
                      </g>
                    );
                  }).concat(
                    [{ label: 'Abutment 1', xValue: 0 }, ...cumulativePierMarkers, { label: 'Abutment 2', xValue: totalLength }].map((marker) => {
                      const x = 70 + (Math.max(0, marker.xValue) / totalLength) * 790;
                      return (
                        <g key={`support-marker-${marker.label}`}>
                          <line x1={x} y1="28" x2={x} y2="232" stroke="#111" strokeWidth="3" strokeDasharray="2 3" />
                          <text x={x + 4} y="22" fontSize="12" fill="#111" fontWeight="700">{marker.label}</text>
                        </g>
                      );
                    }),
                  );
                })()}
              </svg>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Deck Rebar</h3>
            {[
              ['longitudinalTop', 'Longitudinal (Top)'],
              ['longitudinalBottom', 'Longitudinal (Bottom)'],
              ['transverseTop', 'Transverse (Top)'],
              ['transverseBottom', 'Transverse (Bottom)'],
            ].map(([groupKey, title]) => {
              const group = project.deckRebar[groupKey];
              const showSecondaryError = deckRebarSecondaryErrors[groupKey];
              return (
                <div className={styles.svgBlock} key={groupKey}>
                  <h4>{title}</h4>
                  <div className={styles.grid4}>
                    <label className={styles.field}>
                      Bar size (primary)
                      <select
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
                  <label className={styles.inlineCheckbox}>
                    <input
                      type="checkbox"
                      checked={group.alternating}
                      onChange={(event) =>
                        updateProject((current) => ({
                          ...current,
                          deckRebar: {
                            ...current.deckRebar,
                            [groupKey]: { ...current.deckRebar[groupKey], alternating: event.target.checked },
                          },
                        }))
                      }
                    />
                    Alternating bars
                  </label>
                  {group.alternating && (
                    <>
                      <div className={styles.grid4}>
                        <label className={styles.field}>
                          Bar size (secondary)
                          <select
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
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Materials (stub)</h3>
            <div className={styles.grid3}>
              <label className={styles.field}>Steel Fy (ksi)<NumericInput value={project.materials.Fy_ksi} onCommit={(value) => updateProject((current) => ({ ...current, materials: { ...current.materials, Fy_ksi: value } }))} /></label>
              <label className={styles.field}>Concrete f’c (ksi)<NumericInput value={project.materials.fc_ksi} onCommit={(value) => updateProject((current) => ({ ...current, materials: { ...current.materials, fc_ksi: value } }))} /></label>
              <label className={styles.field}>Es (ksi)<NumericInput value={project.materials.Es_ksi} onCommit={(value) => updateProject((current) => ({ ...current, materials: { ...current.materials, Es_ksi: value } }))} /></label>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Automatic Dead Loads (DC/DW) – per girder line load scaffold</h3>
            <div className={styles.grid3}>
              <label className={styles.field}>Deck thickness (in)<NumericInput value={project.autoDeadLoad.deckThickness_in} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, deckThickness_in: value } }))} /></label>
              <label className={styles.field}>Haunch thickness (in)<NumericInput value={project.autoDeadLoad.haunchThickness_in} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, haunchThickness_in: value } }))} /></label>
              <label className={styles.field}>Wearing surface thickness (in)<NumericInput value={project.autoDeadLoad.wearingSurfaceThickness_in} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, wearingSurfaceThickness_in: value } }))} /></label>
              <label className={styles.field}>Parapet/rail line load (k/ft)<NumericInput value={project.autoDeadLoad.parapetRailLineLoad_kft} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, parapetRailLineLoad_kft: value } }))} /></label>
              <label className={styles.field}>SIP forms load (psf)<NumericInput value={project.autoDeadLoad.sipForms_psf} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, sipForms_psf: value } }))} /></label>
              <label className={styles.field}>Steel unit weight (pcf)<NumericInput value={project.autoDeadLoad.steelUnitWeight_pcf} onCommit={(value) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, steelUnitWeight_pcf: value } }))} /></label>
            </div>
            <div className={styles.callout}>
              Preliminary scaffold values: <strong>DC_line_kft = {formatDisplay(deadLoads.DC_line_kft, 4)}</strong>, <strong>DW_line_kft = {formatDisplay(deadLoads.DW_line_kft, 4)}</strong>.
            </div>
            <label className={styles.inlineCheckbox}>
              <input type="checkbox" checked={project.autoDeadLoad.verifiedByUser} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, verifiedByUser: event.target.checked } }))} />
              I have verified the computed DC/DW are correct.
            </label>
            <div className={styles.callout}>{project.meta.liveLoadNote}</div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Input from STAAD</h3>
            <p className={styles.muted}>Enter undistributed and unfactored moments and shears. At Piers, the maximum -M shall be entered and near midspans, the maximum +M shall be entered.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>X global (ft)</th>
                    {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => <th key={`${effect}-m`}><Symbol label="M" sub={effect === 'LL_IM' ? 'LL+IM' : effect} /> (k-ft)</th>)}
                    {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => <th key={`${effect}-v`}><Symbol label="V" sub={effect === 'LL_IM' ? 'LL+IM' : effect} /> (k)</th>)}
                  </tr>
                </thead>
                <tbody>
                  {project.derived.locations.map((location) => (
                    <tr key={location.id}>
                      <td>{location.name}</td>
                      <td>
                        {location.type === 'span' ? (
                          <div className={styles.xGlobalInputCell}>
                            <NumericInput
                              value={location.x_global_ft}
                              onCommit={(value) =>
                                updateProject((current) => {
                                  const nextPoints = [...current.geometry.spanPoints];
                                  nextPoints[location.spanIndex] = { ...nextPoints[location.spanIndex], xPrime_ft: value };
                                  return { ...current, geometry: { ...current.geometry, spanPoints: nextPoints } };
                                })
                              }
                              disabled={project.geometry.spanPoints[location.spanIndex]?.momentAtMid}
                            />
                            <label className={styles.inlineCheckbox}>
                              <input
                                type="checkbox"
                                checked={Boolean(project.geometry.spanPoints[location.spanIndex]?.momentAtMid)}
                                onChange={(event) =>
                                  updateProject((current) => {
                                    const nextPoints = [...current.geometry.spanPoints];
                                    const spanLength = toNumber(current.geometry.spanLengths_ft[location.spanIndex], 0);
                                    nextPoints[location.spanIndex] = {
                                      ...nextPoints[location.spanIndex],
                                      momentAtMid: event.target.checked,
                                      xPrime_ft: event.target.checked ? spanLength / 2 : nextPoints[location.spanIndex]?.xPrime_ft,
                                    };
                                    return { ...current, geometry: { ...current.geometry, spanPoints: nextPoints } };
                                  })
                                }
                              />
                              midspan
                            </label>
                          </div>
                        ) : location.name.startsWith('Pier') ? (
                          'At Pier'
                        ) : (
                          formatDisplay(location.x_global_ft)
                        )}
                      </td>
                      {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => (
                        <td key={`${location.id}-${effect}-m`}><NumericInput value={project.demandByLocation[location.id]?.[effect]?.M_kft} onCommit={(value) => setDemand(location.id, effect, 'M_kft', value)} /></td>
                      ))}
                      {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => (
                        <td key={`${location.id}-${effect}-v`}><NumericInput value={project.demandByLocation[location.id]?.[effect]?.V_k} onCommit={(value) => setDemand(location.id, effect, 'V_k', value)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Load Combination Builder (per location)</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th><Symbol label="M" sub="u" /> Strength I (kip-in)</th>
                    <th><Symbol label="V" sub="u" /> Strength I (k)</th>
                    <th><Symbol label="M" sub="s" /> Service II (kip-in)</th>
                    <th><Symbol label="V" sub="s" /> Service II (k)</th>
                    <th><Symbol label="M" sub="f" /> Fatigue (kip-in)</th>
                    <th><Symbol label="V" sub="f" /> Fatigue (k)</th>
                  </tr>
                </thead>
                <tbody>
                  {project.derived.locations.map((location) => {
                    const combo = combos[location.id] || {};
                    const allowOverride = project.settings.allowOverridingFactoredCombinations;
                    const getValue = (path, fallback) => project.comboOverridesByLocation[location.id]?.[path] ?? fallback;
                    const editOverride = (path, value) => updateProject((current) => ({ ...current, comboOverridesByLocation: { ...current.comboOverridesByLocation, [location.id]: { ...current.comboOverridesByLocation[location.id], [path]: value } } }));
                    return (
                      <tr key={`${location.id}-combo`}>
                        <td>{location.name}</td>
                        {[
                          ['StrengthI.M_u_kipin', combo.StrengthI?.M_u_kipin ?? null],
                          ['StrengthI.V_u_k', combo.StrengthI?.V_u_k ?? null],
                          ['ServiceII.M_s_kipin', combo.ServiceII?.M_s_kipin ?? null],
                          ['ServiceII.V_s_k', combo.ServiceII?.V_s_k ?? null],
                          ['Fatigue.M_f_kipin', combo.Fatigue?.M_f_kipin ?? null],
                          ['Fatigue.V_f_k', combo.Fatigue?.V_f_k ?? null],
                        ].map(([path, value]) => (
                          <td key={`${location.id}-${path}`}>
                            {allowOverride ? <NumericInput value={round(getValue(path, value), 3)} onCommit={(nextValue) => editOverride(path, nextValue)} /> : formatDisplay(value, 3)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.callout}>Constructability combos are scaffolded in state as DCOnly/WithLL and available for later detailed checks.</div>
          </section>
        </>
      ) : (
        renderResultsTab(activeTab)
      )}

      {settingsOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>Calculator settings</h3>
            <label className={styles.inlineCheckbox}>
              <input
                type="checkbox"
                checked={project.settings.allowEditingInputsOnOtherTabs}
                onChange={(event) =>
                  updateProject((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      allowEditingInputsOnOtherTabs: event.target.checked,
                    },
                  }))
                }
              />
              Allow editing inputs on other tabs
            </label>
            <label className={styles.inlineCheckbox}>
              <input
                type="checkbox"
                checked={project.settings.allowOverridingFactoredCombinations}
                onChange={(event) =>
                  updateProject((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      allowOverridingFactoredCombinations: event.target.checked,
                    },
                  }))
                }
              />
              Allow overriding factored combinations
            </label>

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
