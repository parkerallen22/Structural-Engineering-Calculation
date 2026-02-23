import Link from 'next/link';
import styles from './CalculatorLibraryList.module.css';

export default function CalculatorLibraryList({ calculators }) {
  return (
    <section className={styles.wrapper}>
      {calculators.map((calculator) => (
        <Link key={calculator.slug} href={`/calculators/${calculator.slug}`} className={styles.row}>
          <div className={styles.titleCell}>
            <h2>{calculator.name}</h2>
            <p>{calculator.description}</p>
          </div>
          <span className={styles.openButton}>Open</span>
        </Link>
      ))}
    </section>
  );
}
