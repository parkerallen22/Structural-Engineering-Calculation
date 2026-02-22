'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from './CalculatorBrowser.module.css';

export default function CalculatorBrowser({ calculators, categories, showIntro = false }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return calculators.filter((calculator) => {
      const categoryMatches =
        selectedCategory === 'All' || calculator.category === selectedCategory;

      if (!categoryMatches) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        calculator.name,
        calculator.description,
        ...calculator.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [calculators, query, selectedCategory]);

  const clearFilters = () => {
    setQuery('');
    setSelectedCategory('All');
  };

  return (
    <section id="calculators-list" className={styles.wrapper}>
      {showIntro && (
        <div className={styles.header}>
          <h2>Find the right calculator quickly</h2>
          <p>
            Search by name or keyword, then narrow by category to jump directly to the
            tool you need.
          </p>
        </div>
      )}

      <div className={styles.controls}>
        <label className={styles.searchLabel} htmlFor="calculator-search">
          Search calculators
        </label>
        <input
          id="calculator-search"
          className={styles.searchInput}
          type="search"
          placeholder="Try: buckling, ASCE 7, footing..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className={styles.filterRow}>
          <label htmlFor="category-filter">Category</label>
          <select
            id="category-filter"
            className={styles.select}
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="All">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button type="button" onClick={clearFilters} className={styles.clearButton}>
            Clear
          </button>
        </div>
      </div>

      <p className={styles.resultCount}>
        Showing {filtered.length} of {calculators.length} calculators
      </p>

      <div className={styles.grid}>
        {filtered.map((calculator) => (
          <article key={calculator.slug} className={styles.card}>
            <h3>{calculator.name}</h3>
            <p>{calculator.description}</p>
            <div className={styles.tags}>
              {calculator.tags.map((tag) => (
                <span key={`${calculator.slug}-${tag}`}>{tag}</span>
              ))}
            </div>
            <Link href={`/calculators/${calculator.slug}`} className={styles.openButton}>
              Open
            </Link>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className={styles.emptyState}>
          No calculators matched your search. Try a different keyword or clear filters.
        </p>
      )}
    </section>
  );
}
