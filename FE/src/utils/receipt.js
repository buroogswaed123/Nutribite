// Utility to generate a PDF receipt for an order using html2pdf.js (supports Hebrew fonts via browser)
// Usage: generateOrderReceiptPDF({ siteName, orderId, order, items })

import html2pdf from 'html2pdf.js';
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
export function generateOrderReceiptPDF({ siteName = 'Nutribite', orderId, order, items = [], deliveryFee = 0, customerName = '', paymentMethod = '' }) {
  const now = new Date();
  const confirmedAt = (order?.confirmed_at) ? new Date(order.confirmed_at) : now;
  const confirmedStr = confirmedAt.toLocaleString('he-IL');

  let totalGross = 0; // items total (incl. tax)
  let totalTax = 0;
  let totalNet = 0;

  const rowsHtml = items.map((it, idx) => {
    const name = it.recipe_name || it.name || it.product_name || `פריט ${it.id || idx+1}`;
    const qty = Number(it.quantity || it.qty || 1);
    const unitGross = Number((it.unit_price_gross != null ? it.unit_price_gross : it.price) || 0);
    const { net, tax } = computeNetFromGross(unitGross, 0.18);
    const rowTax = tax; // per unit
    const rowTotal = unitGross * qty;

    totalGross += rowTotal;
    totalTax += (rowTax * qty);
    totalNet += (net * qty);

    return `
      <tr>
        <td>${String(name)}</td>
        <td>${money(rowTax)}</td>
        <td>${qty}</td>
        <td>${money(unitGross)}</td>
        <td>${money(rowTotal)}</td>
      </tr>
    `;
  }).join('');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.setAttribute('dir', 'rtl');
  container.innerHTML = `
    <div style="font-family: 'Noto Sans Hebrew', 'Segoe UI', Tahoma, Arial, 'Arial Unicode MS', sans-serif; direction: rtl; unicode-bidi: bidi-override; padding: 24px; width: 780px; color: #111827;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
        <div style="font-size:22px; font-weight:700;">${siteName}</div>
        <div style="text-align:right;">
          <div style="font-size:14px;">אישור הזמנה #${orderId ?? order?.order_id ?? ''}</div>
          <div style="font-size:12px; color:#374151;">מועד אישור: ${confirmedStr}</div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:12px; direction: rtl; unicode-bidi: bidi-override;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">שם פריט</th>
            <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">מע"מ (18%)</th>
            <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">כמות</th>
            <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">מחיר ליחידה</th>
            <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">סה"כ</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end; margin-top: 8px; font-weight:700;">
        <div>סה"כ הזמנה: ${money(totalGross)} ₪</div>
      </div>

      <div style="margin-top: 16px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px; direction: rtl; unicode-bidi: bidi-override;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">סיכום חשבונית</th>
              <th style="border:1px solid #d1d5db; padding:6px 8px; text-align:right; direction: rtl; unicode-bidi: bidi-override;">סכום</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #d1d5db; padding:6px 8px; direction: rtl; unicode-bidi: bidi-override;">לפני מע"מ</td>
              <td style="border:1px solid #d1d5db; padding:6px 8px; direction: rtl; unicode-bidi: bidi-override;">${money(totalNet)} ₪</td>
            </tr>
            <tr>
              <td style="border:1px solid #d1d5db; padding:6px 8px; direction: rtl; unicode-bidi: bidi-override;">סכום מע"מ</td>
              <td style="border:1px solid #d1d5db; padding:6px 8px; direction: rtl; unicode-bidi: bidi-override;">${money(totalTax)} ₪</td>
            </tr>
            <tr>
              <td style="border:1px solid #d1d5db; padding:6px 8px; font-weight:700; direction: rtl; unicode-bidi: bidi-override;">לאחר מע"מ</td>
              <td style="border:1px solid #d1d5db; padding:6px 8px; font-weight:700; direction: rtl; unicode-bidi: bidi-override;">${money(totalGross)} ₪</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  // Ensure a Hebrew-capable webfont is available (Noto Sans Hebrew)
  const ensureHebrewFont = () => new Promise((resolve) => {
    const id = 'nb-receipt-hebrew-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700&display=swap';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    } else {
      resolve();
    }
  });
  const fileName = `Receipt_Order_${orderId ?? order?.order_id ?? ''}.pdf`;
  const opt = {
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
    pagebreak: { avoid: ['tr','table','img'] },
  };

  // Try jsPDF with embedded Hebrew font first (universal PDF rendering)
  const fetchFontAsBase64 = async (url) => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('font fetch failed');
    const buf = await res.arrayBuffer();
    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  const generateWithJsPDF = async () => {
    const fontUrl = '/fonts/NotoSansHebrew-Regular.ttf';
    const base64 = await fetchFontAsBase64(fontUrl);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.addFileToVFS('NotoSansHebrew-Regular.ttf', base64);
    doc.addFont('NotoSansHebrew-Regular.ttf', 'NotoHeb', 'normal');
    doc.setFont('NotoHeb', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48; // slightly larger side margin
    const lineH = 18;

    // Header (RTL): title on right, brand left
    doc.setFontSize(12);
    const title = `חשבונית מס / קבלה (מקור) מספר ${orderId ?? order?.order_id ?? ''}`;
    doc.text(title, pageWidth - margin, margin, { align: 'right' });
    doc.setFontSize(18);
    doc.text(siteName, margin, margin, { align: 'left' });

    // Order info block (right side labels/values)
    doc.setFontSize(12);
    let infoY = margin + lineH * 2.2;
    const infoXRight = pageWidth - margin;
    const info = [
      { label: 'פרטי ההזמנה', value: '' },
      { label: 'שם לקוח', value: customerName || '—' },
      { label: 'מס׳ הזמנה', value: String(orderId ?? order?.order_id ?? '') },
      { label: 'מקום', value: 'nutribite' },
      { label: 'סוג הזמנה', value: 'משלוח' },
      { label: 'תאריך הפקה', value: confirmedStr },
      { label: 'אמצעי תשלום', value: paymentMethod || '—' },
    ];
    info.forEach((row, i) => {
      if (i === 0) {
        doc.setFontSize(13);
        doc.text(row.label, infoXRight, infoY, { align: 'right' });
        doc.setFontSize(12);
      } else {
        const y = infoY + i * lineH;
        doc.text(row.label, infoXRight - 160, y, { align: 'right' });
        doc.text(String(row.value), infoXRight, y, { align: 'right' });
      }
    });

    // Table (custom drawn with fixed widths)
    let y = Math.max(margin + lineH * 3, infoY + lineH * (info.length + 0.8));
    const tableX = margin;
    const tableW = pageWidth - margin * 2;
    const colW = {
      total: 90,
      unit: 90,
      qty: 60,
      vat: 60,
      name: tableW - (90 + 90 + 60 + 60),
    };
    const rowH = 20;
    const borderColor = [209, 213, 219];
    // Header background
    doc.setFillColor(229, 231, 235);
    doc.rect(tableX, y, tableW, rowH, 'F');
    doc.setTextColor(17,24,39);
    doc.setFontSize(12);
    // Header titles (RTL: draw from rightmost column towards left)
    let xCursor = tableX + tableW;
    const drawHeaderCell = (text, width) => {
      xCursor -= width;
      doc.text(String(text), xCursor + width - 6, y + rowH - 6, { align: 'right' });
    };
    drawHeaderCell('מחיר', colW.total);
    drawHeaderCell('מחיר יחידה', colW.unit);
    drawHeaderCell('כמות', colW.qty);
    drawHeaderCell('% מע"מ', colW.vat);
    drawHeaderCell('פריט', colW.name);
    // Rows
    y += rowH;
    doc.setDrawColor(...borderColor);
    items.forEach((it, idx) => {
      const name = it.recipe_name || it.name || it.product_name || `פריט ${it.id || idx+1}`;
      const qty = Number(it.quantity || it.qty || 1);
      const unitGross = Number((it.unit_price_gross != null ? it.unit_price_gross : it.price) || 0);
      const rowTotal = unitGross * qty;
      // Alternating row fill
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX, y, tableW, rowH, 'F');
      }
      // Cell separators (vertical lines)
      let x = tableX;
      doc.setLineWidth(0.5);
      // name cell
      doc.text(String(name), x + colW.name - 6, y + rowH - 6, { align: 'right' });
      x += colW.name;
      // vat cell
      doc.text('18%', x + colW.vat - 6, y + rowH - 6, { align: 'right' });
      x += colW.vat;
      // qty cell
      doc.text(String(qty), x + colW.qty - 6, y + rowH - 6, { align: 'right' });
      x += colW.qty;
      // unit cell
      doc.text(money(unitGross), x + colW.unit - 6, y + rowH - 6, { align: 'right' });
      x += colW.unit;
      // total cell
      doc.text(money(rowTotal), x + colW.total - 6, y + rowH - 6, { align: 'right' });
      // bottom horizontal line
      doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
      y += rowH;
    });

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`סה"כ בש"ח (כולל מע"מ): ${money(Number(totalGross) + Number(deliveryFee || 0))} ₪`, pageWidth - margin, y + lineH, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y += lineH * 1.4;
    // Optional display of components
    if (Number(deliveryFee)) {
      doc.text(`(כולל דמי משלוח: ${money(deliveryFee)} ₪)`, pageWidth - margin, y + lineH, { align: 'right' });
      y += lineH * 1.0;
    }

    autoTable(doc, {
      startY: y,
      styles: { font: 'NotoHeb', fontStyle: 'normal', halign: 'right' },
      headStyles: { fillColor: [243,244,246], textColor: [17,24,39], halign: 'right' },
      // Bottom summary: 3 columns like the sample: סה"כ, מע"מ, סך נטו
      head: [[ 'סה"כ', 'מע"מ', 'סך נטו' ]],
      body: [[
        `${money(Number(totalGross) + Number(deliveryFee || 0))} ₪`,
        `${money(totalTax)} ₪`,
        `${money(totalNet)} ₪`,
      ]],
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 160 },
        1: { cellWidth: 160 },
        2: { cellWidth: 160 },
      },
      tableWidth: pageWidth - margin * 2,
      margin: { left: margin, right: margin },
    });

    doc.save(`Receipt_Order_${orderId ?? order?.order_id ?? ''}.pdf`);
  };

  const waitNextFrame = () => new Promise(res => requestAnimationFrame(() => res()))

  const ensureFonts = async () => {
    try { if (document?.fonts?.ready) await document.fonts.ready; } catch (_) {}
    // Give layout a couple of frames to fully paint with chosen fonts
    await waitNextFrame();
    await waitNextFrame();
  };

  const printFallback = () => {
    try {
      const w = window.open('', '_blank');
      if (!w) return;
      const doc = w.document;
      doc.open();
      doc.write(`<!doctype html>
        <html lang="he" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700&display=swap" />
          <title>${siteName} — קבלה להזמנה #${orderId ?? order?.order_id ?? ''}</title>
          <style> body{font-family:'Noto Sans Hebrew','Segoe UI',Tahoma,Arial,'Arial Unicode MS',sans-serif;direction:rtl} @page{size:A4;margin:16mm} </style>
        </head>
        <body>${container.innerHTML}</body>
        </html>`);
      doc.close();
      w.focus();
      w.print();
      setTimeout(() => { try { w.close(); } catch(_) {} }, 200);
    } catch (_) {}
  };

  return ensureHebrewFont()
    .then(() => ensureFonts())
    .then(() => generateWithJsPDF())
    .catch(() => { printFallback(); })
    .finally(() => {
      try { document.body.removeChild(container); } catch (_) {}
    });
}
