import CalculatorLibraryList from '@/components/CalculatorLibraryList';
import { calculators } from '@/lib/calculators';
import styles from './page.module.css';

export const metadata = {
  title: 'Calculators | Structural Engineering Calculators',
};

export default function CalculatorsPage() {
  return (
    <section className={styles.wrapper}>
      <h1>Calculators Library</h1>
      <p>Browse every available structural engineering calculator in one compact list.</p>
      <CalculatorLibraryList calculators={calculators} />
    </section>
  );
}
