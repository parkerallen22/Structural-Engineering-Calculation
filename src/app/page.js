'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HomeCarousel from '@/components/HomeCarousel';
import { calculators } from '@/lib/calculators';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Structural design tools</p>
        <h1>Structural Engineering Calculators</h1>
        <p>Fast, transparent calcs with downloadable PDF reports.</p>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryCta}
            onClick={() => router.push('/calculators')}
          >
            Browse Calculators
          </button>
          <Link href="/about" className={styles.secondaryCta}>
            About
          </Link>
        </div>
      </section>

      <HomeCarousel calculators={calculators} />

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
