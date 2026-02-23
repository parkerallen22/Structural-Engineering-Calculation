import styles from './page.module.css';
import { fmt } from './ui';

function ExpandedComponentTable({ title, detail, cRows, sRows }) {
  const renderNumber = (value) => fmt(value, 2);

  return (
    <section className={styles.expandedBlock}>
      <h4>{title}</h4>
      <table className={styles.expandedTable}>
        <thead>
          <tr>
            <th>Component</th>
            <th>A (in²)</th>
            <th>Y<sub>b</sub> (in)</th>
            <th>AY<sub>b</sub> (in³)</th>
            <th>I<sub>o</sub> (in⁴)</th>
            <th>d (in)</th>
            <th>I<sub>o</sub> + Ad² (in⁴)</th>
          </tr>
        </thead>
        <tbody>
          {detail.rows.map((row) => (
            <tr key={`${title}-${row.name}`}>
              <td>{row.name}</td>
              <td>{renderNumber(row.area)}</td>
              <td>{renderNumber(row.yb)}</td>
              <td>{renderNumber(row.ayb)}</td>
              <td>{renderNumber(row.io)}</td>
              <td>{renderNumber(row.d)}</td>
              <td>{renderNumber(row.ioPlusAd2)}</td>
            </tr>
          ))}
          <tr className={styles.expandedTotalRow}>
            <td>Total</td>
            <td>{renderNumber(detail.totals.area)}</td>
            <td>—</td>
            <td>{renderNumber(detail.totals.ayb)}</td>
            <td>—</td>
            <td>—</td>
            <td>{renderNumber(detail.totals.i)}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.expandedBoxes}>
        <table className={styles.expandedMiniTable}>
          <tbody>
            {cRows.map((row) => (
              <tr key={`${title}-c-${row.key}`}>
                <th>{row.label}</th>
                <td>{renderNumber(row.value)}</td>
                <td>in</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className={styles.expandedMiniTable}>
          <tbody>
            {sRows.map((row) => (
              <tr key={`${title}-s-${row.key}`}>
                <th>{row.label}</th>
                <td>{renderNumber(row.value)}</td>
                <td>{row.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const cLabel = (descriptor, suffix) => <span>C<sub>{descriptor} {suffix}</sub></span>;
const sLabel = (descriptor, suffix) => <span>S<sub>{descriptor} {suffix}</sub></span>;

export function ExpandedCalculations({ regionResult }) {
  const plusMoment = regionResult.plusMoment;
  const regionTitle = regionResult.key === 'positive' ? 'Positive Region' : 'Negative Region';

  return (
    <div className={styles.calcGroups}>
      <ExpandedComponentTable
        title={`Non-Composite ${regionTitle}`}
        detail={plusMoment.nonComposite}
        cRows={[
          { key: 'cb', label: cLabel('bottom steel', '(nc)'), value: plusMoment.nonComposite.c.bottom },
          { key: 'ct', label: cLabel('top steel', '(nc)'), value: plusMoment.nonComposite.c.topSteel },
          { key: 'hc', label: cLabel('section depth', '(nc)'), value: plusMoment.nonComposite.c.depth },
        ]}
        sRows={[
          { key: 'sb', label: sLabel('bottom steel', '(nc)'), value: plusMoment.nonComposite.s.bottom, units: 'in³' },
          { key: 'st', label: sLabel('top steel', '(nc)'), value: plusMoment.nonComposite.s.topSteel, units: 'in³' },
          { key: 'i', label: 'I', value: plusMoment.nonComposite.s.i, units: 'in⁴' },
        ]}
      />

      <ExpandedComponentTable
        title={`Composite (n) ${regionTitle}`}
        detail={plusMoment.compositeN}
        cRows={[
          { key: 'cb', label: cLabel('bottom steel', '(n)'), value: plusMoment.compositeN.c.bottom },
          { key: 'cts', label: cLabel('top slab', '(n)'), value: plusMoment.compositeN.c.topSlab },
          { key: 'ctb', label: cLabel('top steel', '(n)'), value: plusMoment.compositeN.c.beam },
          { key: 'hc', label: cLabel('section depth', '(n)'), value: plusMoment.compositeN.c.depth },
        ]}
        sRows={[
          { key: 'sb', label: sLabel('bottom steel', '(n)'), value: plusMoment.compositeN.s.bottom, units: 'in³' },
          { key: 'sts', label: sLabel('top slab', '(n)'), value: plusMoment.compositeN.s.topSlab, units: 'in³' },
          { key: 'stb', label: sLabel('top steel', '(n)'), value: plusMoment.compositeN.s.topSteel, units: 'in³' },
        ]}
      />

      <ExpandedComponentTable
        title={`Composite (3n) ${regionTitle}`}
        detail={plusMoment.composite3N}
        cRows={[
          { key: 'cb', label: cLabel('bottom steel', '(3n)'), value: plusMoment.composite3N.c.bottom },
          { key: 'cts', label: cLabel('top slab', '(3n)'), value: plusMoment.composite3N.c.topSlab },
          { key: 'ctb', label: cLabel('top steel', '(3n)'), value: plusMoment.composite3N.c.beam },
          { key: 'hc', label: cLabel('section depth', '(3n)'), value: plusMoment.composite3N.c.depth },
        ]}
        sRows={[
          { key: 'sb', label: sLabel('bottom steel', '(3n)'), value: plusMoment.composite3N.s.bottom, units: 'in³' },
          { key: 'sts', label: sLabel('top slab', '(3n)'), value: plusMoment.composite3N.s.topSlab, units: 'in³' },
          { key: 'stb', label: sLabel('top steel', '(3n)'), value: plusMoment.composite3N.s.topSteel, units: 'in³' },
        ]}
      />

      {regionResult.key !== 'positive' ? (
        <ExpandedComponentTable
          title="Composite (cracked) Negative Region"
          detail={regionResult.crackedNegative.detail}
          cRows={[
            { key: 'na', label: cLabel('neutral axis', '(cr)'), value: regionResult.crackedNegative.neutralAxis },
            { key: 'cc', label: cLabel('compression depth', '(cr)'), value: regionResult.crackedNegative.compressionDepth },
          ]}
          sRows={[
            { key: 'st', label: sLabel('top steel', '(cr)'), value: regionResult.crackedNegative.sectionModulus.topOfSteel, units: 'in³' },
            { key: 'sb', label: sLabel('bottom steel', '(cr)'), value: regionResult.crackedNegative.sectionModulus.bottomOfSteel, units: 'in³' },
            { key: 'i', label: 'I (cr)', value: regionResult.crackedNegative.iCracked, units: 'in⁴' },
          ]}
        />
      ) : null}
    </div>
  );
}
