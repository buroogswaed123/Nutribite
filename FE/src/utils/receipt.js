// Utility to generate a PDF receipt for an order using jsPDF and jspdf-autotable
// Usage: generateOrderReceiptPDF({ siteName, orderId, order, items })

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function money(n) {
  const v = Number(n || 0);
  return v.toFixed(2);
}

function computeNetFromGross(gross, taxRate = 0.18) {
  const g = Number(gross || 0);
  const net = g / (1 + taxRate);
  const tax = g - net;
  return { net, tax };
}

export function generateOrderReceiptPDF({ siteName = 'Nutribite', orderId, order, items = [] }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const lineH = 18;
  const now = new Date();
  const confirmedAt = (order?.confirmed_at) ? new Date(order.confirmed_at) : now;
  const confirmedStr = confirmedAt.toLocaleString('he-IL');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(siteName, margin, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const hdrRight = `אישור הזמנה #${orderId ?? order?.order_id ?? ''}`;
  doc.text(hdrRight, pageWidth - margin, margin, { align: 'right' });
  doc.text(`מועד אישור: ${confirmedStr}`, pageWidth - margin, margin + lineH, { align: 'right' });

  // Build table rows
  const rows = [];
  let totalGross = 0;
  let totalTax = 0;
  let totalNet = 0;

  items.forEach((it, idx) => {
    const name = it.recipe_name || it.name || it.product_name || `פריט ${it.id || idx+1}`;
    const qty = Number(it.quantity || it.qty || 1);
    const unitGross = Number((it.unit_price_gross != null ? it.unit_price_gross : it.price) || 0);
    const { net, tax } = computeNetFromGross(unitGross, 0.18);
    const rowTax = tax; // per unit
    const rowTotal = unitGross * qty;

    totalGross += rowTotal;
    totalTax += (rowTax * qty);
    totalNet += (net * qty);

    rows.push([
      String(name),
      `${money(rowTax)}`,
      String(qty),
      `${money(unitGross)}`,
      `${money(rowTotal)}`,
    ]);
  });

  // Main items table
  autoTable(doc, {
    startY: margin + lineH * 3,
    styles: { font: 'helvetica', fontSize: 11 },
    headStyles: { fillColor: [37, 99, 235] },
    head: [[
      'שם פריט',
      'מע"מ (18%)',
      'כמות',
      'מחיר ליחידה',
      'סה"כ',
    ]],
    body: rows,
    theme: 'striped',
  });

  let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : margin + lineH * 3) + 10;

  // Total line under table
  doc.setFont('helvetica', 'bold');
  doc.text(`סה"כ הזמנה: ${money(totalGross)} ₪`, pageWidth - margin, y + lineH, { align: 'right' });
  y += lineH * 2;

  // Summary small table (before/after tax)
  const summaryRows = [
    ['לפני מע"מ', `${money(totalNet)} ₪`],
    ['סכום מע"מ', `${money(totalTax)} ₪`],
    ['לאחר מע"מ', `${money(totalGross)} ₪`],
  ];

  autoTable(doc, {
    startY: y,
    styles: { font: 'helvetica', fontSize: 11 },
    headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
    head: [['סיכום חשבונית', 'סכום']],
    body: summaryRows,
    theme: 'grid',
    tableWidth: pageWidth - margin * 2,
    margin: { left: margin, right: margin },
  });

  const fileName = `Receipt_Order_${orderId ?? order?.order_id ?? ''}.pdf`;
  doc.save(fileName);
}
