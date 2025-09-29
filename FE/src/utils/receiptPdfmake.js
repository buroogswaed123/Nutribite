// Hebrew-safe PDF receipt using pdfmake with embedded Noto Sans Hebrew
// Usage: generateOrderReceiptPDF({ siteName, orderId, order, items, deliveryFee, customerName, paymentMethod })

import pdfMake from 'pdfmake/build/pdfmake';

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

async function ensureHebrewFont() {
  const hebName = 'NotoHeb';
  if (pdfMake.fonts && pdfMake.fonts[hebName]) return;

  const fetchBase64 = async (url) => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('Failed to fetch font: ' + url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const hebB64 = await fetchBase64('/fonts/NotoSansHebrew-Regular.ttf');

  pdfMake.vfs = pdfMake.vfs || {};
  pdfMake.vfs['NotoSansHebrew-Regular.ttf'] = hebB64;

  pdfMake.fonts = {
    [hebName]: { normal: 'NotoSansHebrew-Regular.ttf', bold: 'NotoSansHebrew-Regular.ttf' },
  };
}

export async function generateOrderReceiptPDF({
  siteName = 'Nutribite',
  orderId,
  order,
  items = [],
  deliveryFee = 0,
  customerName = '',
  paymentMethod = '—',
}) {
  await ensureHebrewFont();

  const now = new Date();
  const confirmedAt = (order?.confirmed_at) ? new Date(order.confirmed_at) : now;
  const confirmedStr = confirmedAt.toLocaleString('he-IL');

  let totalGross = 0; // items total incl. tax
  let totalTax = 0;
  let totalNet = 0;

  const itemRows = items.map((it, idx) => {
    const name = it.recipe_name || it.name || it.product_name || `פריט ${it.id || idx+1}`;
    const qty = Number(it.quantity || it.qty || 1);
    const unitGross = Number((it.unit_price_gross != null ? it.unit_price_gross : it.price) || 0);
    const { net, tax } = computeNetFromGross(unitGross, 0.18);
    const rowTotal = unitGross * qty;

    totalGross += rowTotal;
    totalTax += (tax * qty);
    totalNet += (net * qty);

    return [
      { text: String(name), alignment: 'right' },
      { text: '18%', alignment: 'right' },
      { text: String(qty), alignment: 'right' },
      { text: money(unitGross), alignment: 'right' },
      { text: money(rowTotal), alignment: 'right' },
    ];
  });

  const grandTotal = Number(totalGross) + Number(deliveryFee || 0);

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48], // left, top, right, bottom
    defaultStyle: { font: 'NotoHeb', fontSize: 12, alignment: 'right' },
    content: [
      // Header row
      {
        columns: [
          { text: siteName, alignment: 'left', fontSize: 18, bold: true, rtl: true },
          { text: `חשבונית מס / קבלה (מקור) מספר ${orderId ?? order?.order_id ?? ''}`, alignment: 'right', fontSize: 12, rtl: true },
        ],
        margin: [0, 0, 0, 12],
      },

      // Order info block (two columns: label | value)
      {
        table: {
          widths: [140, '*'],
          body: [
            [{ text: 'פרטי ההזמנה', style: 'sectionTitle', colSpan: 2, alignment: 'right', rtl: true }, {}],
            [{ text: 'שם לקוח', rtl: true }, { text: customerName || '—', alignment: 'right', rtl: true }],
            [{ text: 'מס׳ הזמנה', rtl: true }, { text: String(orderId ?? order?.order_id ?? ''), alignment: 'right', rtl: true }],
            [{ text: 'מקום', rtl: true }, { text: 'nutribite', alignment: 'right', rtl: true }],
            [{ text: 'סוג הזמנה', rtl: true }, { text: 'משלוח', alignment: 'right', rtl: true }],
            [{ text: 'תאריך הפקה', rtl: true }, { text: confirmedStr, alignment: 'right', rtl: true }],
            [{ text: 'אמצעי תשלום', rtl: true }, { text: paymentMethod || '—', alignment: 'right', rtl: true }],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },

      // Items table
      {
        table: {
          headerRows: 1,
          widths: [210, 60, 50, 75, 75], // total 470pt for extra safety
          body: [
            [
              { text: 'פריט', fillColor: '#e5e7eb', bold: true, rtl: true },
              { text: '% מע"מ', fillColor: '#e5e7eb', bold: true, rtl: true },
              { text: 'כמות', fillColor: '#e5e7eb', bold: true, rtl: true },
              { text: 'מחיר יחידה', fillColor: '#e5e7eb', bold: true, rtl: true },
              { text: 'מחיר', fillColor: '#e5e7eb', bold: true, rtl: true },
            ],
            ...itemRows.map(r => r.map((cell, idx) => ({
              ...cell,
              rtl: idx === 0 ? true : false, // text RTL, numbers LTR
              font: 'NotoHeb',
              alignment: 'right',
            }))),
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex && rowIndex % 2 === 1 ? '#f8fafc' : null),
          hLineColor: '#d1d5db', vLineColor: '#d1d5db',
        },
        margin: [0, 8, 0, 6],
      },

      // Total line
      { text: `סה"כ בש"ח (כולל מע"מ): ${money(grandTotal)} ₪`, bold: true, margin: [0, 4, 0, 2], rtl: true },
      ...(Number(deliveryFee) ? [{ text: `(כולל דמי משלוח: ${money(deliveryFee)} ₪)`, margin: [0, 0, 0, 6], rtl: true }] : []),

      // Summary 3 columns: סך נטו | מע"מ | סה"כ
      {
        table: {
          headerRows: 1,
          widths: [160, 160, 160],
          body: [
            [
              { text: 'סה"כ', fillColor: '#f3f4f6', rtl: true },
              { text: 'מע"מ', fillColor: '#f3f4f6', rtl: true },
              { text: 'סך נטו', fillColor: '#f3f4f6', rtl: true },
            ],
            [
              { text: `${money(grandTotal)} ₪`, rtl: true },
              { text: `${money(totalTax)} ₪`, rtl: true },
              { text: `${money(totalNet)} ₪`, rtl: true },
            ],
          ],
        },
        layout: { hLineColor: '#d1d5db', vLineColor: '#d1d5db' },
        margin: [0, 8, 0, 0],
      },
    ],
    styles: {
      sectionTitle: { fontSize: 13, bold: true },
    },
  };

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).download(`Receipt_Order_${orderId ?? order?.order_id ?? ''}.pdf`);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
