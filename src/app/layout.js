import SiteHeader from '@/components/SiteHeader';
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
        <SiteHeader />

        

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
