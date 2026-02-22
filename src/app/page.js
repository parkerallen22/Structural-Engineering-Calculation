import Link from 'next/link';
import CalculatorBrowser from '@/components/CalculatorBrowser';
import { calculatorCategories, calculators } from '@/lib/calculators';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Structural design tools</p>
        <h1>Structural Engineering Calculators</h1>
        <p>Fast, transparent calcs with downloadable PDF reports.</p>
        <div className={styles.heroActions}>
          <a href="#calculators-list" className={styles.primaryCta}>
            Browse Calculators
          </a>
          <Link href="/about" className={styles.secondaryCta}>
            About
          </Link>
        </div>
      </section>

      <CalculatorBrowser
        calculators={calculators}
        categories={calculatorCategories}
        showIntro
      />

      <section className={styles.teaser}>
        <h2>PDF Reports (coming with each calculator)</h2>
        <ul>
          <li>Inputs summary for transparent verification</li>
          <li>Equations used and code references</li>
          <li>Units, assumptions, and governing checks</li>
          <li>Results summary with concise pass/fail tables</li>
          <li>One-click Export PDF for submittals and records</li>
        </ul>
      </section>
    </>
  );
}
