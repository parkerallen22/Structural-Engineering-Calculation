'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import styles from './HomeCarousel.module.css';

export default function HomeCarousel({ calculators }) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveCard = () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const cards = Array.from(container.querySelectorAll('[data-card]'));
    const centerX = container.scrollLeft + container.clientWidth / 2;

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(centerX - cardCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    setActiveIndex(bestIndex);
  };

  const scrollToCard = (nextIndex) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const cards = container.querySelectorAll('[data-card]');
    const boundedIndex = Math.max(0, Math.min(nextIndex, cards.length - 1));

    cards[boundedIndex]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });

    setActiveIndex(boundedIndex);
  };

  return (
    <section className={styles.wrapper} aria-label="Featured calculators carousel">
      <div className={styles.headerRow}>
        <h2>Featured calculators</h2>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrowButton}
            onClick={() => scrollToCard(activeIndex - 1)}
            aria-label="Previous calculator"
          >
            ←
          </button>
          <button
            type="button"
            className={styles.arrowButton}
            onClick={() => scrollToCard(activeIndex + 1)}
            aria-label="Next calculator"
          >
            →
          </button>
        </div>
      </div>

      <div ref={containerRef} className={styles.carousel} onScroll={updateActiveCard}>
        {calculators.map((calculator, index) => (
          <article
            key={calculator.slug}
            data-card
            className={`${styles.card} ${index === activeIndex ? styles.cardActive : ''}`}
          >
            <p className={styles.category}>{calculator.category}</p>
            <h3>{calculator.name}</h3>
            <p>{calculator.description}</p>
            <Link href={`/calculators/${calculator.slug}`} className={styles.openButton}>
              Open
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
