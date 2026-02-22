import CalculatorBrowser from '@/components/CalculatorBrowser';
import { calculatorCategories, calculators } from '@/lib/calculators';

export const metadata = {
  title: 'Calculators | Structural Engineering Calculators',
};

export default function CalculatorsPage() {
  return (
    <>
      <h1>Calculators</h1>
      <p>Browse every available structural engineering calculator in the library.</p>
      <CalculatorBrowser calculators={calculators} categories={calculatorCategories} />
    </>
  );
}
