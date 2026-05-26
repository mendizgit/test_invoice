const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const TERMS = [
  'This quotation is valid for 30 days from the date of issue.',
];

const NOTES = [
  'Advance payment                : LKR 5,000.00' ,
  'Additional site visit  Charges : LKR 5,000.00 (per visit, if applicable)',
  'Electrician or Responsible person must be attending the site inspection period',
  'Remaining payment balance should be settled - After completion of testing',
  'Proposal & Recommendation will submit within 3 working days after site inspection.'
];

const BANK = {
  accountName: 'DPJ Engineering Company',
  bank: 'Bank of Ceylon (BOC) - Panadura Bazzar Branch',
  accountNo: '86040767',
};

// =============================================
// ✅ EASY TO EDIT: Watermark text
// =============================================
const WATERMARK_TEXT = 'dpjengineering.lk';

// =============================================
// HELPER: Draw watermark on current page
// =============================================
function drawWatermark(doc, W, H) {
  doc.save();
  doc.translate(W / 2, H / 2);
  doc.rotate(-45);
  doc.font('Helvetica-Bold').fontSize(48)
     .fillOpacity(0.07).fillColor('#1a1a2e')
     .text(WATERMARK_TEXT, -200, -24, { width: 400, align: 'center' });
  doc.restore();
  doc.fillOpacity(1);
}

// =============================================
// HELPER: Format date
// =============================================
function formatDate(str) {
  if (!str) return new Date().toLocaleDateString('en-GB',
    { day: '2-digit', month: 'long', year: 'numeric' });
  return new Date(str).toLocaleDateString('en-GB',
    { day: '2-digit', month: 'long', year: 'numeric' });
}

// =============================================
// POST /api/invoice/generate
// =============================================
router.post('/generate', (req, res) => {
  try {
    const {
      customerName, customerAddress, customerPhone,
      customerEmail, siteAddress, quotationType,
      items, quotationRef, date, siteVisitCharge
    } = req.body;

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="Quotation_${quotationRef.replace(/\//g, '_')}.pdf"`);
      res.send(pdf);
    });

    const W = 595.28, H = 841.89, M = 40, CW = W - M * 2;

    // =============================================
    // WATERMARK - Page 1
    // =============================================
    drawWatermark(doc, W, H);

    // =============================================
    // LETTERHEAD
    // =============================================
    const lhPath = path.join(__dirname, '../assets/Letter_head.jpg');
    if (fs.existsSync(lhPath)) {
      doc.image(lhPath, M, M, { width: CW });
    }

    let y = 155;

    // =============================================
    // REF & DATE (right aligned)
    // =============================================
    doc.font('Helvetica').fontSize(9).fillColor('#333');
    doc.text(`Ref: ${quotationRef}`, M, y, { align: 'right', width: CW });
    y += 13;
    doc.text(`Date: ${formatDate(date)}`, M, y, { align: 'right', width: CW });
    y += 20;

    // =============================================
    // QUOTATION TITLE (underline on text only)
    // =============================================
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a1a2e');
    doc.text('QUOTATION', M, y, { align: 'center', width: CW, underline: true });
    y += 22;

    // =============================================
    // CLIENT DETAILS
    // =============================================
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
    doc.text('To,', M, y);
    y += 13;

    doc.font('Helvetica').fontSize(9).fillColor('#333');
    doc.text(customerName, M, y);
    y += 13;

    if (customerAddress) {
      doc.text(customerAddress, M, y);
      y += 13;
    }
    if (customerPhone) {
      doc.text(`Tel: ${customerPhone}`, M, y);
      y += 13;
    }
    if (customerEmail) {
      doc.text(`Email: ${customerEmail}`, M, y);
      y += 13;
    }

    // Two blank lines then site address
    y += 20;
    if (siteAddress) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
      doc.text('Site Address:', M, y);
      y += 13;
      doc.font('Helvetica').fontSize(9).fillColor('#333');
      doc.text(siteAddress, M, y);
      y += 13;
    }

    y += 6;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#4f46e5');
    doc.text(`Quotation Type: ${quotationType}`, M, y);
    y += 18;

    // =============================================
    // TABLE HEADER
    // =============================================
    const C = {
      no: M, desc: M + 22, price: M + 330,
      qty: M + 405, total: M + 455
    };
    const tableStartY = y;

    doc.rect(M, y, CW, 20).fill('#1a1a2e');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
    doc.text('#',           C.no,    y + 6, { width: 20 });
    doc.text('Description', C.desc,  y + 6, { width: 300 });
    doc.text('Unit Price',  C.price, y + 6, { width: 70 });
    doc.text('Qty',         C.qty,   y + 6, { width: 45 });
    doc.text('Total (LKR)', C.total, y + 6, { width: 55 });
    y += 20;

    // =============================================
    // TABLE ROWS
    // =============================================
    let grandTotal = 0;
    items.forEach((item, i) => {
      const rowTotal = item.unitPrice * item.quantity;
      grandTotal += rowTotal;
      const rh = 22;

      doc.rect(M, y, CW, rh).fill(i % 2 === 0 ? '#f5f5f5' : '#ffffff');
      doc.fillColor('#333').font('Helvetica').fontSize(8);
      doc.text(`${i + 1}`,                          C.no,    y + 7, { width: 20 });
      doc.text(item.item,                           C.desc,  y + 7, { width: 300 });
      doc.text(item.unitPrice.toLocaleString(),     C.price, y + 7, { width: 70 });
      doc.text(item.quantity.toString(),            C.qty,   y + 7, { width: 45 });
      doc.font('Helvetica-Bold')
         .text(rowTotal.toLocaleString(),           C.total, y + 7, { width: 55 });
      y += rh;
    });

    // Site visiting charges row
    if (siteVisitCharge && siteVisitCharge > 0) {
      const i = items.length;
      grandTotal += siteVisitCharge;
      const rh = 22;
      doc.rect(M, y, CW, rh).fill(i % 2 === 0 ? '#f5f5f5' : '#ffffff');
      doc.fillColor('#333').font('Helvetica').fontSize(8);
      doc.text(`${i + 1}`,                          C.no,    y + 7, { width: 20 });
      doc.text('Site Visiting Charges',             C.desc,  y + 7, { width: 300 });
      doc.text('-',                                 C.price, y + 7, { width: 70 });
      doc.text('1',                                 C.qty,   y + 7, { width: 45 });
      doc.font('Helvetica-Bold')
         .text(siteVisitCharge.toLocaleString(),    C.total, y + 7, { width: 55 });
      y += rh;
    }

    // Table border
    doc.rect(M, tableStartY, CW, y - tableStartY)
       .strokeColor('#ddd').lineWidth(0.5).stroke();

   // =============================================
    // GRAND TOTAL
    // =============================================
    y += 5;
    doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#1a1a2e').lineWidth(1).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1a2e');
    doc.text(`Grand Total:  LKR ${grandTotal.toLocaleString()}`,
      M, y, { align: 'right', width: CW });
    y += 25;

    // =============================================
    // HELPER: Add new page if section doesn't fit
    // =============================================
    function ensureSpace(neededHeight) {
      if (y + neededHeight > H - 20) {
        doc.addPage({ size: 'A4', margin: 0 });
        drawWatermark(doc, W, H);
        y = M + 20;
      }
    }

    // =============================================
    // TERMS & CONDITIONS
    // =============================================
    const termsBlockH = 12 + (TERMS.length * 11) + 10;
    ensureSpace(termsBlockH);

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333');
    doc.text('Terms & Conditions:', M, y);
    y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor('#666');
    TERMS.forEach(term => {
      doc.text(`• ${term}`, M, y);
      y += 11;
    });
    y += 10;

    // =============================================
    // ADDITIONAL NOTES
    // =============================================
    const notesBlockH = 12 + (NOTES.length * 11) + 12;
    ensureSpace(notesBlockH);

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333');
    doc.text('Additional Notes:', M, y);
    y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor('#666');
    NOTES.forEach(note => {
      doc.text(`• ${note}`, M, y);
      y += 11;
    });
    y += 12;

    // =============================================
    // BANK ACCOUNT INFORMATION BOX
    // =============================================
    const bankH = 58;
    ensureSpace(bankH + 20);

    doc.rect(M, y, CW, bankH).fill('#f0f4ff').stroke('#4f46e5');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1a1a2e');
    doc.text('Bank Account Information', M + 10, y + 8);
    doc.font('Helvetica').fontSize(8).fillColor('#333');
    doc.text(`Account Name  :  ${BANK.accountName}`, M + 10, y + 22);
    doc.text(`Bank                  :  ${BANK.bank}`,  M + 10, y + 34);
    doc.text(`Account No       :  ${BANK.accountNo}`, M + 10, y + 46);
    y += bankH + 20;

    // =============================================
    // SIGNATURE BOX (left aligned, half page width)
    // =============================================
    const sigPath = path.join(__dirname, '../assets/signature.jpg');
    if (fs.existsSync(sigPath)) {
      const sigBoxW = CW / 4;        // Half page width
      const sigImgW = sigBoxW - 20;  // Image padding inside box
      const sigInfo = doc.openImage(sigPath);
      const sigImgH = (sigInfo.height / sigInfo.width) * sigImgW;
      const sigBoxH = sigImgH + 30;

      ensureSpace(sigBoxH + 20);

      // Box outline — left half only
      doc.rect(M, y, sigBoxW, sigBoxH)
         .fill('#ffffff').stroke('#ddd');

      // Label
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
      doc.text('Authorized Signature', M + 10, y + 6, { width: sigBoxW - 20 });

      // Signature image inside box
      doc.image(sigPath, M + 10, y + 18, { width: sigImgW });

      y += sigBoxH + 16;
    }

    y += 8;

    // =============================================
    // FOOTER INLINE IMAGE
    // =============================================
    const ftPath = path.join(__dirname, '../assets/footer.jpg');
    if (fs.existsSync(ftPath)) {
      const imgInfo = doc.openImage(ftPath);
      const renderedH = (imgInfo.height / imgInfo.width) * CW;
      ensureSpace(renderedH + 10);
      doc.image(ftPath, M, y, { width: CW });
      y += renderedH + 10;
    }

    doc.end();

  } catch (err) {
    console.error('PDF Error Full Details:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;