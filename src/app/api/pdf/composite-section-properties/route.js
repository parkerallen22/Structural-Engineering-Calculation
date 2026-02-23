import PDFDocument from 'pdfkit';
import { computeSectionProps } from '@/lib/compositeSectionProps';

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function addKeyValueRow(doc, key, value) {
  doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
  doc.font('Helvetica').text(value);
}

function addSummaryTable(doc, region) {
  const rows = [
    ['Non-composite (steel)', region.steelOnly.i, null, region.steelOnly.sectionModulus.topOfSteel, region.steelOnly.sectionModulus.bottomOfSteel, region.steelOnly.yBar],
    ['Composite (n)', region.compositeN.i, region.compositeN.sectionModulus.topOfSlab, region.compositeN.sectionModulus.topOfSteel, region.compositeN.sectionModulus.bottomOfSteel, region.compositeN.yBar],
    ['Composite (3n)', region.composite3N.i, region.composite3N.sectionModulus.topOfSlab, region.composite3N.sectionModulus.topOfSteel, region.composite3N.sectionModulus.bottomOfSteel, region.composite3N.yBar],
    ['Composite (cracked neg.)', region.crackedNegative.iCracked, null, region.crackedNegative.sectionModulus.topOfSteel, region.crackedNegative.sectionModulus.bottomOfSteel, region.crackedNegative.neutralAxis],
  ];

  const headers = ['Case', 'I (in^4)', 'S top slab', 'S top steel', 'S bot steel', 'NA y'];
  doc.font('Helvetica-Bold').text(headers.join(' | '));
  doc.moveDown(0.2);
  rows.forEach((row) => {
    doc
      .font('Helvetica')
      .text(
        row
          .map((cell) => (typeof cell === 'string' ? cell : formatNumber(cell)))
          .join(' | '),
      );
  });
}

export async function POST(request) {
  const body = await request.json();
  const result = computeSectionProps(body.input);

  const doc = new PDFDocument({ margin: 36, size: 'LETTER' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  const endPromise = new Promise((resolve) => {
    doc.on('end', resolve);
  });

  doc.fontSize(16).font('Helvetica-Bold').text('Composite Steel Beam + Concrete Deck Section Properties');
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Material Inputs');
  addKeyValueRow(doc, 'Es (ksi)', formatNumber(result.materials.Es));
  addKeyValueRow(doc, "f'c (ksi)", formatNumber(result.materials.fc));
  addKeyValueRow(doc, 'Ec (ksi)', formatNumber(result.materials.Ec));
  addKeyValueRow(doc, 'n', formatNumber(result.materials.n));
  addKeyValueRow(doc, '3n', formatNumber(result.materials.n3));

  doc.moveDown();
  doc.font('Helvetica-Bold').text('Assumptions');
  result.assumptions.forEach((assumption) => {
    doc.font('Helvetica').text(`• ${assumption}`);
  });

  result.regions.forEach((region) => {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(13).text(region.label);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Input geometry');
    addKeyValueRow(doc, 'D (in)', formatNumber(region.region.D));
    addKeyValueRow(doc, 'tw (in)', formatNumber(region.region.tw));
    addKeyValueRow(doc, 'tf_top / bf_top (in)', `${formatNumber(region.region.tfTop)} / ${formatNumber(region.region.bfTop)}`);
    addKeyValueRow(doc, 'tf_bot / bf_bot (in)', `${formatNumber(region.region.tfBot)} / ${formatNumber(region.region.bfBot)}`);
    addKeyValueRow(doc, 't_haunch / t_slab (in)', `${formatNumber(region.region.tHaunch)} / ${formatNumber(region.region.tSlab)}`);
    addKeyValueRow(doc, 'b_eff (in)', formatNumber(region.region.bEff));

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Results summary (key values)');
    addSummaryTable(doc, region);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Detailed transformed components');
    doc.font('Helvetica').text('Composite (n):');
    region.compositeN.components.forEach((component) => {
      doc.text(`  - ${component.name}: A=${formatNumber(component.area)} in^2, y=${formatNumber(component.y)} in`);
    });
    doc.font('Helvetica').text('Composite (3n):');
    region.composite3N.components.forEach((component) => {
      doc.text(`  - ${component.name}: A=${formatNumber(component.area)} in^2, y=${formatNumber(component.y)} in`);
    });
    doc.font('Helvetica').text('Cracked negative components:');
    region.crackedNegative.components.forEach((component) => {
      doc.text(`  - ${component.name}: A=${formatNumber(component.area)} in^2, y=${formatNumber(component.y)} in`);
    });
  });

  doc.end();
  await endPromise;

  return new Response(Buffer.concat(chunks), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="composite-section-properties.pdf"',
    },
  });
}
