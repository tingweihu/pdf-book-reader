import {writeFile} from 'node:fs/promises';

// A deterministic, dependency-free fixture with original geometric test art.
const text = (x, y, size, value) => `BT /F1 ${size} Tf ${x} ${y} Td (${value}) Tj ET`;
const content = [
  ['0.95 0.97 1 rg 0 0 612 792 re f', '0.15 0.25 0.35 rg', text(72, 690, 32, 'Field Guide'), text(72, 640, 16, 'Portrait opening page'), '72 100 468 2 re f'].join('\n'),
  ['0.98 0.96 0.91 rg 0 0 900 600 re f', '0.25 0.27 0.30 rg', text(80, 510, 30, 'Landscape single page'), text(80, 455, 16, 'One canvas, no editorial split'), '80 90 740 2 re f'].join('\n'),
  ['0.91 0.96 0.95 rg 0 0 600 600 re f', '0.95 0.92 0.98 rg 600 0 600 600 re f', '0.18 0.30 0.30 rg', text(75, 480, 30, 'Left panel'), text(675, 480, 30, 'Right panel'), '0.7 0.7 0.7 rg 599 50 2 500 re f'].join('\n'),
];
const stream = (value) => `<< /Length ${Buffer.byteLength(value, 'ascii')} >>\nstream\n${value}\nendstream`;
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 9 0 R >> >> >>',
  stream(content[0]),
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 600] /Contents 6 0 R /Resources << /Font << /F1 9 0 R >> >> >>',
  stream(content[1]),
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1200 600] /Contents 8 0 R /Resources << /Font << /F1 9 0 R >> >> >>',
  stream(content[2]),
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (const [index, object] of objects.entries()) {
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf, 'ascii');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
await writeFile(new URL('./generic-validation.pdf', import.meta.url), pdf, 'ascii');
