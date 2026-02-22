import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Structural Engineering Calculators',
  description: 'Fast, transparent structural engineering calculations.',
};

export default function RootLayout({ children }) {
  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <div className="container navInner">
            <Link href="/" className="brand">
              Structural Engineering Calculators
            </Link>
            <nav>
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
          </div>
        </header>

        <main className="container mainContent">{children}</main>

        <footer className="siteFooter">
          <div className="container footerInner">
            <p>© {year} Structural Engineering Calculators</p>
            <p>Engineering judgment required. Verify results.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
