import Link from 'next/link';
import { calculators } from '@/lib/calculators';

export default function CalculatorDetailPage({ params }) {
  const calculator = calculators.find((entry) => entry.slug === params.slug);

  if (!calculator) {
    return (
      <section>
        <h1>Calculator not found</h1>
        <p>The requested calculator does not exist yet.</p>
        <Link href="/calculators">Back to calculators</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>{calculator.name}</h1>
      <p>Coming soon. This calculator page is under construction.</p>
      <Link href="/calculators">Back to calculators</Link>
    </section>
  );
}
