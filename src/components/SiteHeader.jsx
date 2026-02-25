'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { calculators, searchCalculators } from '@/lib/calculators';
import styles from './SiteHeader.module.css';

export default function SiteHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const results = useMemo(() => searchCalculators(calculators, query), [query]);

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    const onPointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    } else {
      setShowResults(false);
      setQuery('');
    }
  }, [isSearchOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setShowResults(true);
  };

  return (
    <header className="siteHeader">
      <div className="mx-auto w-full max-w-[1200px] px-6 box-border navInner">
        <Link href="/" className="brand">
          Structural Engineering Calculators
        </Link>

        <div className={styles.navGroup}>
          <nav aria-label="Primary">
            <ul className="navList">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/calculators">Calculators</Link>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
            </ul>
          </nav>

          <div className={styles.searchWrapper} ref={popoverRef}>
            <button
              type="button"
              className={styles.searchIconButton}
              aria-label="Search calculators"
              aria-expanded={isSearchOpen}
              onClick={() => setIsSearchOpen((current) => !current)}
            >
              <span aria-hidden="true">⌕</span>
            </button>

            {isSearchOpen && (
              <div className={styles.searchPopover} role="dialog" aria-label="Search calculators popover">
                <form onSubmit={handleSubmit} className={styles.searchForm}>
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={styles.searchInput}
                    placeholder="Search calculators"
                    aria-label="Search calculators"
                  />
                  <button
                    type="button"
                    className={styles.closeButton}
                    aria-label="Close search"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    ✕
                  </button>
                </form>

                {showResults && (
                  <div className={styles.results}>
                    {results.length > 0 ? (
                      results.map((calculator) => (
                        <Link
                          key={calculator.slug}
                          href={`/calculators/${calculator.slug}`}
                          className={styles.resultLink}
                          onClick={() => setIsSearchOpen(false)}
                        >
                          {calculator.name}
                        </Link>
                      ))
                    ) : (
                      <p className={styles.emptyText}>No matching calculators found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
