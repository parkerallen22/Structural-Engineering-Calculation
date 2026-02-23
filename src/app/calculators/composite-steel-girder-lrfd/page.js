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
  'Sign convention: +M = sagging (typical midspan), −M = hogging (typical at supports). User enters −M as negative.';

function nowIso() {
  return new Date().toISOString();
}

function createEmptyRangeRow() {
  return { id: crypto.randomUUID(), startX_ft: 0, endX_ft: 0, label: '' };
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
      sectionSchedule: [createEmptyRangeRow()],
      studSchedule: [createEmptyRangeRow()],
      bracingSchedule: [{ id: crypto.randomUUID(), startX_ft: 0, endX_ft: 0, Lb_ft: 0, notes: '' }],
    },
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

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function resizeArray(source, targetLength, fallbackValue) {
  const next = [...source];
  while (next.length < targetLength) {
    next.push(fallbackValue);
  }
  return next.slice(0, targetLength);
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
        name: `Span ${i + 1} @ ${round(xInSpan, 3)} ft`,
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
        DC1: { M_kft: 0, V_k: 0 },
        DC2: { M_kft: 0, V_k: 0 },
        DW: { M_kft: 0, V_k: 0 },
        LL_IM: { M_kft: 0, V_k: 0 },
      };
    }
    if (!nextOverrides[location.id]) {
      nextOverrides[location.id] = {};
    }
  });

  return {
    ...project,
    derived: { locations },
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

export default function CompositeSteelGirderLrfdPage() {
  const [project, setProject] = useState(() => withLocationsAndDemands(createInitialProject()));
  const [activeTab, setActiveTab] = useState(TAB_LABELS[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
            [field]: toNumber(value),
          },
        },
      },
    }));
  };

  const allTabsReadOnly = activeTab !== 'Inputs' && !project.settings.allowEditingInputsOnOtherTabs;

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
            onClick={() => setActiveTab(tab)}
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
                <input
                  type="number"
                  min={1}
                  value={project.geometry.numberOfSpans}
                  onChange={(event) => {
                    const nextCount = Math.max(1, Math.floor(toNumber(event.target.value, 1)));
                    updateProject((current) => {
                      const nextSpans = resizeArray(current.geometry.spanLengths_ft, nextCount, 100);
                      const nextPoints = resizeArray(
                        current.geometry.spanPoints,
                        nextCount,
                        { momentAtMid: true, xPrime_ft: 50 },
                      ).map((point, index) => {
                        const spanL = nextSpans[index] || 0;
                        return {
                          ...point,
                          xPrime_ft: point.momentAtMid ? spanL / 2 : point.xPrime_ft,
                        };
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
                <input
                  type="number"
                  value={project.geometry.skew_deg}
                  onChange={(event) =>
                    updateProject((current) => ({
                      ...current,
                      geometry: { ...current.geometry, skew_deg: toNumber(event.target.value) },
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                Number of girders
                <input
                  type="number"
                  min={1}
                  value={project.geometry.numberOfGirders}
                  onChange={(event) => {
                    const girders = Math.max(1, Math.floor(toNumber(event.target.value, 1)));
                    updateProject((current) => ({
                      ...current,
                      geometry: {
                        ...current.geometry,
                        numberOfGirders: girders,
                        spacingArray_ft: resizeArray(
                          current.geometry.spacingArray_ft,
                          Math.max(0, girders - 1),
                          current.geometry.spacing_ft,
                        ),
                      },
                    }));
                  }}
                />
              </label>

              <label className={styles.inlineCheckbox}>
                <input
                  type="checkbox"
                  checked={project.geometry.constantSpacing}
                  onChange={(event) =>
                    updateProject((current) => ({
                      ...current,
                      geometry: { ...current.geometry, constantSpacing: event.target.checked },
                    }))
                  }
                />
                Constant spacing
              </label>
            </div>

            <h4>Span lengths (ft)</h4>
            <div className={styles.grid4}>
              {project.geometry.spanLengths_ft.map((span, index) => (
                <label key={`span-${index}`} className={styles.field}>
                  Span {index + 1}
                  <input
                    type="number"
                    value={span}
                    onChange={(event) =>
                      updateProject((current) => {
                        const next = [...current.geometry.spanLengths_ft];
                        next[index] = toNumber(event.target.value);

                        const nextPoints = [...current.geometry.spanPoints];
                        const point = nextPoints[index];
                        if (point?.momentAtMid) {
                          nextPoints[index] = { ...point, xPrime_ft: next[index] / 2 };
                        }

                        return {
                          ...current,
                          geometry: {
                            ...current.geometry,
                            spanLengths_ft: next,
                            spanPoints: nextPoints,
                          },
                        };
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
                <input
                  type="number"
                  value={project.geometry.spacing_ft}
                  onChange={(event) =>
                    updateProject((current) => {
                      const spacing = toNumber(event.target.value);
                      return {
                        ...current,
                        geometry: {
                          ...current.geometry,
                          spacing_ft: spacing,
                          spacingArray_ft: resizeArray(
                            current.geometry.spacingArray_ft,
                            Math.max(0, current.geometry.numberOfGirders - 1),
                            spacing,
                          ).map(() => spacing),
                        },
                      };
                    })
                  }
                />
              </label>
            ) : (
              <div className={styles.grid4}>
                {resizeArray(
                  project.geometry.spacingArray_ft,
                  Math.max(0, project.geometry.numberOfGirders - 1),
                  project.geometry.spacing_ft,
                ).map((value, index) => (
                  <label className={styles.field} key={`spacing-${index}`}>
                    Between Girder {index + 1} & {index + 2}
                    <input
                      type="number"
                      value={value}
                      onChange={(event) =>
                        updateProject((current) => {
                          const next = resizeArray(
                            current.geometry.spacingArray_ft,
                            Math.max(0, current.geometry.numberOfGirders - 1),
                            current.geometry.spacing_ft,
                          );
                          next[index] = toNumber(event.target.value);
                          return {
                            ...current,
                            geometry: {
                              ...current.geometry,
                              spacingArray_ft: next,
                            },
                          };
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}

            <h4>Span location points: Span i @ x′</h4>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Span</th>
                    <th>Length (ft)</th>
                    <th>Moment @ L/2</th>
                    <th>x′ from left support (ft)</th>
                  </tr>
                </thead>
                <tbody>
                  {project.geometry.spanPoints.map((point, index) => {
                    const spanLength = project.geometry.spanLengths_ft[index] || 0;
                    const xPrime = point.momentAtMid ? spanLength / 2 : point.xPrime_ft;
                    return (
                      <tr key={`point-${index}`}>
                        <td>Span {index + 1}</td>
                        <td>{spanLength}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={point.momentAtMid}
                            onChange={(event) =>
                              updateProject((current) => {
                                const next = [...current.geometry.spanPoints];
                                next[index] = {
                                  ...next[index],
                                  momentAtMid: event.target.checked,
                                  xPrime_ft: event.target.checked
                                    ? (current.geometry.spanLengths_ft[index] || 0) / 2
                                    : next[index].xPrime_ft,
                                };
                                return {
                                  ...current,
                                  geometry: { ...current.geometry, spanPoints: next },
                                };
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={xPrime}
                            disabled={point.momentAtMid}
                            onChange={(event) =>
                              updateProject((current) => {
                                const next = [...current.geometry.spanPoints];
                                next[index] = {
                                  ...next[index],
                                  xPrime_ft: toNumber(event.target.value),
                                };
                                return {
                                  ...current,
                                  geometry: { ...current.geometry, spanPoints: next },
                                };
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.callout}>{project.meta.signConventionNote}</div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Section / Stud / Bracing schedules</h3>
            <p className={styles.muted}>{project.meta.coordinateNote}</p>

            {[
              { key: 'sectionSchedule', title: 'Section schedule', cols: ['startX_ft', 'endX_ft', 'label'] },
              { key: 'studSchedule', title: 'Stud schedule', cols: ['startX_ft', 'endX_ft', 'label'] },
            ].map((group) => (
              <div key={group.key}>
                <h4>{group.title}</h4>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Start X (ft)</th>
                        <th>End X (ft)</th>
                        <th>Label</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {project.schedules[group.key].map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              type="number"
                              value={row.startX_ft}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  schedules: {
                                    ...current.schedules,
                                    [group.key]: current.schedules[group.key].map((entry) =>
                                      entry.id === row.id
                                        ? { ...entry, startX_ft: toNumber(event.target.value) }
                                        : entry,
                                    ),
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={row.endX_ft}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  schedules: {
                                    ...current.schedules,
                                    [group.key]: current.schedules[group.key].map((entry) =>
                                      entry.id === row.id
                                        ? { ...entry, endX_ft: toNumber(event.target.value) }
                                        : entry,
                                    ),
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              value={row.label}
                              onChange={(event) =>
                                updateProject((current) => ({
                                  ...current,
                                  schedules: {
                                    ...current.schedules,
                                    [group.key]: current.schedules[group.key].map((entry) =>
                                      entry.id === row.id ? { ...entry, label: event.target.value } : entry,
                                    ),
                                  },
                                }))
                              }
                            />
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
                                    [group.key]: current.schedules[group.key].filter((entry) => entry.id !== row.id),
                                  },
                                }))
                              }
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
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
                        [group.key]: [...current.schedules[group.key], createEmptyRangeRow()],
                      },
                    }))
                  }
                >
                  Add row
                </button>
              </div>
            ))}

            <h4>Bracing / LTB schedule (stub)</h4>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Start X (ft)</th>
                    <th>End X (ft)</th>
                    <th>Lb (ft)</th>
                    <th>Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {project.schedules.bracingSchedule.map((row) => (
                    <tr key={row.id}>
                      <td><input type="number" value={row.startX_ft} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, bracingSchedule: current.schedules.bracingSchedule.map((entry) => entry.id === row.id ? { ...entry, startX_ft: toNumber(event.target.value) } : entry) } }))} /></td>
                      <td><input type="number" value={row.endX_ft} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, bracingSchedule: current.schedules.bracingSchedule.map((entry) => entry.id === row.id ? { ...entry, endX_ft: toNumber(event.target.value) } : entry) } }))} /></td>
                      <td><input type="number" value={row.Lb_ft} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, bracingSchedule: current.schedules.bracingSchedule.map((entry) => entry.id === row.id ? { ...entry, Lb_ft: toNumber(event.target.value) } : entry) } }))} /></td>
                      <td><input value={row.notes} onChange={(event) => updateProject((current) => ({ ...current, schedules: { ...current.schedules, bracingSchedule: current.schedules.bracingSchedule.map((entry) => entry.id === row.id ? { ...entry, notes: event.target.value } : entry) } }))} /></td>
                      <td>
                        <button type="button" className={styles.secondaryButton} onClick={() => updateProject((current) => ({ ...current, schedules: { ...current.schedules, bracingSchedule: current.schedules.bracingSchedule.filter((entry) => entry.id !== row.id) } }))}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={() => updateProject((current) => ({ ...current, schedules: { ...current.schedules, bracingSchedule: [...current.schedules.bracingSchedule, { id: crypto.randomUUID(), startX_ft: 0, endX_ft: 0, Lb_ft: 0, notes: '' }] } }))}>Add row</button>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Materials (stub)</h3>
            <div className={styles.grid3}>
              <label className={styles.field}>Steel Fy (ksi)<input type="number" value={project.materials.Fy_ksi} onChange={(event) => updateProject((current) => ({ ...current, materials: { ...current.materials, Fy_ksi: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>Concrete f’c (ksi)<input type="number" value={project.materials.fc_ksi} onChange={(event) => updateProject((current) => ({ ...current, materials: { ...current.materials, fc_ksi: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>Es (ksi)<input type="number" value={project.materials.Es_ksi} onChange={(event) => updateProject((current) => ({ ...current, materials: { ...current.materials, Es_ksi: toNumber(event.target.value) } }))} /></label>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Automatic Dead Loads (DC/DW) – per girder line load scaffold</h3>
            <div className={styles.grid3}>
              <label className={styles.field}>Deck thickness (in)<input type="number" value={project.autoDeadLoad.deckThickness_in} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, deckThickness_in: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>Haunch thickness (in)<input type="number" value={project.autoDeadLoad.haunchThickness_in} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, haunchThickness_in: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>Wearing surface thickness (in)<input type="number" value={project.autoDeadLoad.wearingSurfaceThickness_in} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, wearingSurfaceThickness_in: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>Parapet/rail line load (k/ft)<input type="number" value={project.autoDeadLoad.parapetRailLineLoad_kft} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, parapetRailLineLoad_kft: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>SIP forms load (psf)<input type="number" value={project.autoDeadLoad.sipForms_psf} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, sipForms_psf: toNumber(event.target.value) } }))} /></label>
              <label className={styles.field}>Steel unit weight (pcf)<input type="number" value={project.autoDeadLoad.steelUnitWeight_pcf} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, steelUnitWeight_pcf: toNumber(event.target.value) } }))} /></label>
            </div>
            <div className={styles.callout}>
              Preliminary scaffold values: <strong>DC_line_kft = {deadLoads.DC_line_kft}</strong>, <strong>DW_line_kft = {deadLoads.DW_line_kft}</strong>.
            </div>
            <label className={styles.inlineCheckbox}>
              <input type="checkbox" checked={project.autoDeadLoad.verifiedByUser} onChange={(event) => updateProject((current) => ({ ...current, autoDeadLoad: { ...current.autoDeadLoad, verifiedByUser: event.target.checked } }))} />
              I have verified the computed DC/DW are correct.
            </label>
            <div className={styles.callout}>{project.meta.liveLoadNote}</div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Demand Entry by Location</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>X global (ft)</th>
                    <th>Default sign</th>
                    {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => (
                      <th key={`${effect}-m`}>{effect} M (k-ft)</th>
                    ))}
                    {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => (
                      <th key={`${effect}-v`}>{effect} V (k)</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.derived.locations.map((location) => (
                    <tr key={location.id}>
                      <td>{location.name}</td>
                      <td>{location.x_global_ft}</td>
                      <td>{location.defaultMomentSign > 0 ? '+' : '-'}</td>
                      {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => (
                        <td key={`${location.id}-${effect}-m`}>
                          <input
                            type="number"
                            value={project.demandByLocation[location.id]?.[effect]?.M_kft ?? 0}
                            onChange={(event) => setDemand(location.id, effect, 'M_kft', event.target.value)}
                          />
                        </td>
                      ))}
                      {['DC1', 'DC2', 'DW', 'LL_IM'].map((effect) => (
                        <td key={`${location.id}-${effect}-v`}>
                          <input
                            type="number"
                            value={project.demandByLocation[location.id]?.[effect]?.V_k ?? 0}
                            onChange={(event) => setDemand(location.id, effect, 'V_k', event.target.value)}
                          />
                        </td>
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
                    <th>Strength I Mu (kip-in)</th>
                    <th>Strength I Vu (k)</th>
                    <th>Service II Ms (kip-in)</th>
                    <th>Service II Vs (k)</th>
                    <th>Fatigue Mf (kip-in)</th>
                    <th>Fatigue Vf (k)</th>
                  </tr>
                </thead>
                <tbody>
                  {project.derived.locations.map((location) => {
                    const combo = combos[location.id] || {};
                    const allowOverride = project.settings.allowOverridingFactoredCombinations;

                    const getValue = (path, fallback) => {
                      const override = project.comboOverridesByLocation[location.id]?.[path];
                      return override ?? fallback;
                    };

                    const editOverride = (path, value) => {
                      updateProject((current) => ({
                        ...current,
                        comboOverridesByLocation: {
                          ...current.comboOverridesByLocation,
                          [location.id]: {
                            ...current.comboOverridesByLocation[location.id],
                            [path]: toNumber(value),
                          },
                        },
                      }));
                    };

                    return (
                      <tr key={`${location.id}-combo`}>
                        <td>{location.name}</td>
                        {[
                          ['StrengthI.M_u_kipin', combo.StrengthI?.M_u_kipin ?? 0],
                          ['StrengthI.V_u_k', combo.StrengthI?.V_u_k ?? 0],
                          ['ServiceII.M_s_kipin', combo.ServiceII?.M_s_kipin ?? 0],
                          ['ServiceII.V_s_k', combo.ServiceII?.V_s_k ?? 0],
                          ['Fatigue.M_f_kipin', combo.Fatigue?.M_f_kipin ?? 0],
                          ['Fatigue.V_f_k', combo.Fatigue?.V_f_k ?? 0],
                        ].map(([path, value]) => (
                          <td key={`${location.id}-${path}`}>
                            {allowOverride ? (
                              <input type="number" value={round(getValue(path, value), 3)} onChange={(event) => editOverride(path, event.target.value)} />
                            ) : (
                              round(value, 3)
                            )}
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

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>Diagrams</h3>
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
                        <text x={supportX + width / 2 - 28} y="86" fontSize="14" fontWeight="700">L{index + 1}={span} ft</text>
                        <line x1={supportX} y1="115" x2={supportX + width} y2="115" stroke="#111" strokeWidth="1" />
                      </g>
                    );
                  });
                })()}
                <polygon points="860,140 848,170 872,170" fill="#d1d5db" stroke="black" />
                <text x="40" y="200" fontSize="14" fontWeight="700">
                  Skew: {project.geometry.skew_deg}° | Girders: {project.geometry.numberOfGirders} | Spacing:{' '}
                  {project.geometry.constantSpacing
                    ? `${project.geometry.spacing_ft} ft (constant)`
                    : project.geometry.spacingArray_ft.join(', ')}
                </text>
              </svg>
            </PlaceholderSketch>

            <div className={styles.grid2}>
              <PlaceholderSketch title="Composite section (template)">
                <svg viewBox="0 0 260 160" width="100%" height="160"><rect width="260" height="160" fill="white" /><rect x="35" y="20" width="190" height="32" fill="#e5e7eb" stroke="black" /><rect x="110" y="52" width="40" height="70" fill="#9ca3af" stroke="black" /><rect x="65" y="122" width="130" height="18" fill="#9ca3af" stroke="black" /><text x="54" y="15" fontSize="12" fontWeight="700">Deck + slab</text></svg>
              </PlaceholderSketch>
              <PlaceholderSketch title="Stud layout sketch (template)">
                <svg viewBox="0 0 260 160" width="100%" height="160"><rect width="260" height="160" fill="white" /><rect x="20" y="70" width="220" height="20" fill="#d1d5db" stroke="black" />{[40,65,90,115,140,165,190,215].map((x) => <line key={x} x1={x} y1="56" x2={x} y2="70" stroke="black" strokeWidth="4" />)}<text x="20" y="28" fontSize="12" fontWeight="700">Studs @ s (placeholder)</text></svg>
              </PlaceholderSketch>
              <PlaceholderSketch title="Bearing stiffener sketch (template)">
                <svg viewBox="0 0 260 160" width="100%" height="160"><rect width="260" height="160" fill="white" /><rect x="45" y="30" width="170" height="14" fill="#e5e7eb" stroke="black" /><rect x="80" y="44" width="24" height="70" fill="#9ca3af" stroke="black" /><rect x="156" y="44" width="24" height="70" fill="#9ca3af" stroke="black" /><rect x="60" y="114" width="140" height="18" fill="#d1d5db" stroke="black" /><text x="50" y="150" fontSize="11" fontWeight="700">Bearing stiffener template</text></svg>
              </PlaceholderSketch>
              <PlaceholderSketch title="Field bolted splice sketch (template)">
                <svg viewBox="0 0 260 160" width="100%" height="160"><rect width="260" height="160" fill="white" /><rect x="24" y="58" width="90" height="34" fill="#9ca3af" stroke="black" /><rect x="146" y="58" width="90" height="34" fill="#9ca3af" stroke="black" /><rect x="110" y="50" width="40" height="50" fill="#e5e7eb" stroke="black" />{[116,126,136,146].map((x) => <circle key={x} cx={x} cy="75" r="3" fill="black" />)}<text x="38" y="28" fontSize="12" fontWeight="700">Field bolted splice</text></svg>
              </PlaceholderSketch>
            </div>
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
