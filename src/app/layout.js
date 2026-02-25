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
        <div className="min-h-screen w-full bg-app overflow-x-hidden">
          <SiteHeader />

          <main className="siteContainer mainContent">{children}</main>

          <footer className="siteFooter">
            <div className="siteContainer footerInner">
            <p>© {year} Structural Engineering Calculators</p>
            <p>Engineering judgment required. Verify results.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
