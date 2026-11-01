import { jsPDF } from 'jspdf';
import { FinalBillData } from '../types/index.js';

export function generateBillPdf(data: FinalBillData): void {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(27, 73, 68); // #1B4944 Spruce Accent
  doc.text('DEVICE REPAIR ASSISTANT', 40, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 114, 106);
  doc.text('Authorised Electronics Diagnostics & Replacement Network', 40, y + 14);

  // Invoice / Quote Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(28, 27, 25);
  doc.text(`TAX ESTIMATE / INVOICE`, pageWidth - 40, y, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(72, 68, 63);
  doc.text(`Invoice No: ${data.invoiceNumber}`, pageWidth - 40, y + 14, { align: 'right' });
  doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 40, y + 26, { align: 'right' });

  y += 50;

  // Thin separator rule
  doc.setDrawColor(226, 221, 213);
  doc.setLineWidth(1);
  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  // Customer & Device Details (Two columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 27, 25);
  doc.text('CUSTOMER INFORMATION', 40, y);
  doc.text('DEVICE BENCH SPECIFICATIONS', 300, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(72, 68, 63);

  doc.text(`Name: ${data.customer.name}`, 40, y);
  doc.text(`Device: ${data.device.brand} ${data.device.productName}`, 300, y);
  y += 12;

  doc.text(`Phone: ${data.customer.phone}`, 40, y);
  doc.text(`Model No: ${data.device.modelNumber}`, 300, y);
  y += 12;

  doc.text(`Email: ${data.customer.email}`, 40, y);
  doc.text(`Serial No: ${data.device.serialNumber}`, 300, y);
  y += 24;

  // Service Centre Box
  doc.setFillColor(245, 242, 236); // #F5F2EC
  doc.rect(40, y, pageWidth - 80, 50, 'F');
  doc.setDrawColor(226, 221, 213);
  doc.rect(40, y, pageWidth - 80, 50, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 73, 68);
  doc.text(`NEAREST AUTHORISED SERVICE CENTRE`, 50, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 27, 25);
  doc.text(`${data.serviceCentre.name}: ${data.serviceCentre.address}`, 50, y + 28);
  doc.text(`Phone: ${data.serviceCentre.phone} | Hours: ${data.serviceCentre.operating_hours}`, 50, y + 40);

  y += 70;

  // Table Header
  doc.setFillColor(239, 236, 230);
  doc.rect(40, y, pageWidth - 80, 20, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 27, 25);
  doc.text('ITEM DESCRIPTION', 48, y + 13);
  doc.text('QTY', 370, y + 13, { align: 'right' });
  doc.text('UNIT PRICE (INR)', 450, y + 13, { align: 'right' });
  doc.text('TOTAL (INR)', pageWidth - 48, y + 13, { align: 'right' });

  y += 24;

  // Line Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);

  for (const item of data.bill.items) {
    doc.text(item.description, 48, y);
    doc.text(String(item.quantity), 370, y, { align: 'right' });
    doc.text(`₹${item.unitPrice.toLocaleString('en-IN')}`, 450, y, { align: 'right' });
    doc.text(`₹${item.total.toLocaleString('en-IN')}`, pageWidth - 48, y, { align: 'right' });

    y += 8;
    doc.setDrawColor(240, 237, 232);
    doc.line(40, y, pageWidth - 40, y);
    y += 12;
  }

  y += 10;

  // Totals Area
  const totalsX = pageWidth - 48;
  const labelX = 400;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(72, 68, 63);

  doc.text('Subtotal:', labelX, y);
  doc.text(`₹${data.bill.subtotal.toLocaleString('en-IN')}`, totalsX, y, { align: 'right' });
  y += 14;

  doc.text('Central GST (CGST 9%):', labelX, y);
  doc.text(`₹${data.bill.cgstAmount.toLocaleString('en-IN')}`, totalsX, y, { align: 'right' });
  y += 14;

  doc.text('State GST (SGST 9%):', labelX, y);
  doc.text(`₹${data.bill.sgstAmount.toLocaleString('en-IN')}`, totalsX, y, { align: 'right' });
  y += 14;

  doc.text('Total GST (18%):', labelX, y);
  doc.text(`₹${data.bill.totalGstAmount.toLocaleString('en-IN')}`, totalsX, y, { align: 'right' });
  y += 16;

  // Grand Total highlight bar
  doc.setFillColor(27, 73, 68);
  doc.rect(380, y - 10, pageWidth - 420, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(250, 248, 245);
  doc.text('Grand Total:', 390, y + 6);
  doc.text(`₹${data.bill.grandTotal.toLocaleString('en-IN')}`, totalsX, y + 6, { align: 'right' });

  y += 45;

  // Legal & Bench Disclaimer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 114, 106);
  doc.text('TERMS & PHYSICAL BENCH INSPECTION NOTICE', 40, y);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 134, 126);
  const disclaimerText = 'All cost breakdowns in this invoice are bench estimates subject to diagnostic verification at the designated service facility. Internal liquid damage or trace oxidisation discovered during teardown may necessitate revised quotation. Replacement parts carry a 90-day hardware guarantee from date of handover.';
  const splitText = doc.splitTextToSize(disclaimerText, pageWidth - 80);
  doc.text(splitText, 40, y);

  // Save the PDF
  doc.save(`${data.invoiceNumber}_Estimate_Bill.pdf`);
}
