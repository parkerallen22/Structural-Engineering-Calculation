import styles from './page.module.css';

const fmtLabel = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return `${Math.round(parsed * 1000) / 1000}`;
};

function barNote(prefix, rebar) {
  const primary = `${rebar?.barSize ?? '#5'} @ ${fmtLabel(rebar?.spacing, '12')} in`;
  const clear = fmtLabel(rebar?.clearDistance, '2');
  if (rebar?.alternatingBars) {
    return `${prefix}: ${primary}, ${rebar?.altBarSize ?? '#6'} @ ${fmtLabel(rebar?.altSpacing, '12')} in; clear = ${clear} in`;
  }
  return `${prefix}: ${primary}; clear = ${clear} in`;
}

function Dimension({ markerId, x1, y1, x2, y2, extA, extB, label, labelX, labelY, rotate = false, anchor = 'middle' }) {
  return (
    <g>
      {extA ? <line x1={extA.x1} y1={extA.y1} x2={extA.x2} y2={extA.y2} className={styles.dimensionLine} /> : null}
      {extB ? <line x1={extB.x1} y1={extB.y1} x2={extB.x2} y2={extB.y2} className={styles.dimensionLine} /> : null}
      <line x1={x1} y1={y1} x2={x2} y2={y2} className={styles.dimensionLine} markerStart={`url(#${markerId})`} markerEnd={`url(#${markerId})`} />
      <text
        x={labelX}
        y={labelY}
        textAnchor={anchor}
        className={styles.dimensionText}
        transform={rotate ? `rotate(-90 ${labelX} ${labelY})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

function SectionTemplate({ title, region }) {
  const markerId = `dim-arrow-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const topNote = barNote('Top', region.rebarTop);
  const bottomNote = barNote('Bottom', region.rebarBottom);

  return (
    <article className={styles.diagramCard}>
      <h4>{title}</h4>
      <div className={styles.sectionSketchScroller}>
        <svg className={styles.sectionSketch} viewBox="0 0 1100 650" role="img" aria-label={`${title} fixed composite section template`}>
          <defs>
            <marker id={markerId} markerWidth="14" markerHeight="14" refX="7" refY="7" orient="auto-start-reverse">
              <path d="M0,0 L14,7 L0,14 z" fill="#111827" />
            </marker>
          </defs>

          <rect x="1" y="1" width="1098" height="648" className={styles.diagramBg} />

          <rect x="250" y="80" width="600" height="96" className={styles.slabShape} />
          <rect x="490" y="176" width="120" height="12" className={styles.haunchShape} />

          <rect x="490" y="188" width="120" height="18" className={styles.steelShape} />
          <rect x="546" y="206" width="8" height="206" className={styles.steelShape} />
          <rect x="490" y="412" width="120" height="18" className={styles.steelShape} />

          {[286, 358, 430, 502, 574, 646, 718, 790].map((x) => <circle key={`t-${x}`} cx={x} cy="110" r="7" className={styles.rebarDot} />)}
          {[286, 358, 430, 502, 574, 646, 718, 790].map((x) => <circle key={`b-${x}`} cx={x} cy="146" r="7" className={styles.rebarDotBottom} />)}

          <Dimension markerId={markerId} x1={250} y1={42} x2={850} y2={42} extA={{ x1: 250, y1: 80, x2: 250, y2: 42 }} extB={{ x1: 850, y1: 80, x2: 850, y2: 42 }} label={`beff = ${fmtLabel(region.bEff, '60')} in`} labelX={550} labelY={32} />

          <Dimension markerId={markerId} x1={132} y1={188} x2={132} y2={430} extA={{ x1: 490, y1: 188, x2: 132, y2: 188 }} extB={{ x1: 490, y1: 430, x2: 132, y2: 430 }} label={`D = ${fmtLabel(region.D, '30')} in`} labelX={106} labelY={309} rotate />
          <Dimension markerId={markerId} x1={186} y1={80} x2={186} y2={176} extA={{ x1: 250, y1: 80, x2: 186, y2: 80 }} extB={{ x1: 250, y1: 176, x2: 186, y2: 176 }} label={`tslab = ${fmtLabel(region.tSlab, '8')} in`} labelX={210} labelY={128} rotate />
          <Dimension markerId={markerId} x1={156} y1={176} x2={156} y2={188} extA={{ x1: 490, y1: 176, x2: 156, y2: 176 }} extB={{ x1: 490, y1: 188, x2: 156, y2: 188 }} label={`thaunch = ${fmtLabel(region.tHaunch, '1')} in`} labelX={178} labelY={182} rotate />

          <Dimension markerId={markerId} x1={490} y1={238} x2={610} y2={238} extA={{ x1: 490, y1: 188, x2: 490, y2: 238 }} extB={{ x1: 610, y1: 188, x2: 610, y2: 238 }} label={`bf_top = ${fmtLabel(region.bfTop, '12')} in`} labelX={550} labelY={228} />
          <Dimension markerId={markerId} x1={490} y1={474} x2={610} y2={474} extA={{ x1: 490, y1: 430, x2: 490, y2: 474 }} extB={{ x1: 610, y1: 430, x2: 610, y2: 474 }} label={`bf_bottom = ${fmtLabel(region.bfBot, '12')} in`} labelX={550} labelY={464} />

          <Dimension markerId={markerId} x1={546} y1={314} x2={554} y2={314} label={`tw = ${fmtLabel(region.tw, '0.75')} in`} labelX={640} labelY={306} anchor="start" />

          <Dimension markerId={markerId} x1={932} y1={188} x2={932} y2={206} extA={{ x1: 610, y1: 188, x2: 932, y2: 188 }} extB={{ x1: 610, y1: 206, x2: 932, y2: 206 }} label={`tf_top = ${fmtLabel(region.tfTop, '1')} in`} labelX={956} labelY={197} rotate />
          <Dimension markerId={markerId} x1={932} y1={412} x2={932} y2={430} extA={{ x1: 610, y1: 412, x2: 932, y2: 412 }} extB={{ x1: 610, y1: 430, x2: 932, y2: 430 }} label={`tf_bottom = ${fmtLabel(region.tfBot, '1')} in`} labelX={956} labelY={421} rotate />

          <text x="810" y="116" className={styles.noteText}>{topNote}</text>
          <text x="810" y="154" className={styles.noteText}>{bottomNote}</text>

          <polyline points="804,110 770,110 748,110" className={styles.dimensionLine} markerEnd={`url(#${markerId})`} />
          <polyline points="804,148 770,148 748,146" className={styles.dimensionLine} markerEnd={`url(#${markerId})`} />
        </svg>
      </div>
    </article>
  );
}

export default function FixedSectionDiagram({ draft }) {
  if (draft.positiveSameAsNegative) {
    return <SectionTemplate title="Positive and Negative Region" region={draft.negative} />;
  }

  return (
    <div className={styles.diagramStack}>
      <SectionTemplate title="Positive Region" region={draft.positive} />
      <SectionTemplate title="Negative Region" region={draft.negative} />
    </div>
  );
}
