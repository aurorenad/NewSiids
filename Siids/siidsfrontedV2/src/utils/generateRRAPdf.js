/**
 * generateRRAPdf.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Shared RRA Intelligence Report PDF Generator
 *
 * Uses jsPDF to render a branded, RESTRICTED-classified A4 intelligence report
 * and immediately saves it to the user's local machine as a .pdf file — no
 * print dialog is shown.
 *
 * Exported functions:
 *   generateRRAPdf(options)  — main entry point used by all dashboards
 *
 * options shape:
 *   {
 *     reportId        : string | number,
 *     caseRef         : string,
 *     title           : string,
 *     subject         : string,
 *     taxpayerName    : string,
 *     tin             : string,
 *     dateCompiled    : string,      // ISO date string or human-readable
 *     preparedBy      : string,
 *     preparedByRole  : string,
 *     status          : string,
 *     body            : string,      // plain-text executive summary
 *     sections        : Array<{ subject: string, text: string }>,
 *     attachments     : Array<{ name: string, size: string, description: string }>,
 *     acSignature     : { signed: boolean, name: string },
 *     dirSignature    : { signed: boolean, name: string },
 *     rejectionReason : string | null,
 *     returnReason    : string | null,
 *   }
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { jsPDF } from 'jspdf';

// ─── Colour palette (RRA brand) ───────────────────────────────────────────────
const BLUE      = [0,   61,  165];   // #003DA5 — RRA Royal Blue
const GOLD      = [245, 168,  0];    // #F5A800 — RRA Gold
const GREEN     = [0,   154,  68];   // #009A44 — RRA Green
const RED_SOFT  = [220,  38,  38];   // rejection red
const ORANGE    = [224,  92,   0];   // return orange
const SLATE     = [71,   85, 105];   // secondary text
const LIGHT_BG  = [248, 250, 252];   // table header background
const BORDER    = [203, 213, 225];   // border grey

// ─── Typography helpers ───────────────────────────────────────────────────────
const setFont = (doc, style = 'normal', size = 10) => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
};

// Draw a horizontal rule
const hr = (doc, x, y, w, color = BORDER, thickness = 0.3) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(thickness);
  doc.line(x, y, x + w, y);
};

// Filled rect helper
const rect = (doc, x, y, w, h, color) => {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, 'F');
};

// Text with colour helper
const text = (doc, str, x, y, color = [15, 23, 42], opts = {}) => {
  doc.setTextColor(...color);
  doc.text(str, x, y, opts);
};

// ─── Page geometry ────────────────────────────────────────────────────────────
const MARGIN    = 18;   // mm left/right margin
const PAGE_W    = 210;  // A4 width
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Meta table ───────────────────────────────────────────────────────────────
const drawMetaTable = (doc, y, rows) => {
  const COL1 = 40;
  const ROW_H = 7;

  rows.forEach((row, i) => {
    const rowY = y + i * ROW_H;
    // Alternate row bg
    if (i % 2 === 0) {
      rect(doc, MARGIN, rowY, CONTENT_W, ROW_H, LIGHT_BG);
    }
    // Left border
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, rowY, CONTENT_W, ROW_H);

    // Label
    setFont(doc, 'bold', 8.5);
    text(doc, row[0], MARGIN + 2, rowY + 4.8, BLUE);

    // Value
    setFont(doc, 'normal', 8.5);
    const valStr = String(row[1] ?? '—');
    text(doc, valStr, MARGIN + COL1 + 2, rowY + 4.8, [30, 41, 59]);
  });

  return y + rows.length * ROW_H + 4;
};

// ─── Status colour picker ─────────────────────────────────────────────────────
const statusColor = (status = '') => {
  const s = status.toUpperCase();
  if (s.includes('FINALISED') || s.includes('APPROVED'))  return GREEN;
  if (s.includes('REJECTED'))                              return RED_SOFT;
  if (s.includes('RETURNED'))                              return ORANGE;
  if (s.includes('PENDING'))                               return BLUE;
  return SLATE;
};

// ─── Check if page break needed ───────────────────────────────────────────────
const checkPageBreak = (doc, y, needed = 20) => {
  if (y + needed > 275) {
    doc.addPage();
    return MARGIN + 8;
  }
  return y;
};

// ─── Section heading ─────────────────────────────────────────────────────────
const sectionHeading = (doc, y, label) => {
  y = checkPageBreak(doc, y, 14);
  setFont(doc, 'bold', 10);
  text(doc, label, MARGIN, y, BLUE);
  hr(doc, MARGIN, y + 2, CONTENT_W, BLUE, 0.4);
  return y + 8;
};

// ─── Signature block ─────────────────────────────────────────────────────────
const drawSignatureBlock = (doc, y, label, name, signed) => {
  const blockW = (CONTENT_W - 10) / 2;
  const x = label.includes('Assistant') ? MARGIN : MARGIN + blockW + 10;

  setFont(doc, 'bold', 8);
  text(doc, label, x, y, BLUE);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(x, y + 16, x + blockW, y + 16);

  setFont(doc, 'normal', 8);
  if (signed) {
    text(doc, name, x, y + 21, GREEN);
    setFont(doc, 'bold', 8);
    text(doc, '✓ DIGITALLY SIGNED', x, y + 26, GREEN);
  } else {
    text(doc, 'Awaiting signature…', x, y + 21, SLATE);
  }
};

// ─── Main exported function ───────────────────────────────────────────────────
export const generateRRAPdf = (options = {}) => {
  const {
    reportId        = 'N/A',
    caseRef         = 'N/A',
    title           = 'Intelligence Findings Report',
    subject         = '—',
    taxpayerName    = '—',
    tin             = '—',
    dateCompiled    = new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' }),
    preparedBy      = 'Intelligence Officer',
    preparedByRole  = 'Intelligence Officer',
    status          = '',
    body            = '',
    sections        = [],
    attachments     = [],
    acSignature     = { signed: false, name: 'AC Ronald Niwenshuti' },
    dirSignature    = { signed: false, name: 'Director Christian Mugunga' },
    rejectionReason = null,
    returnReason    = null,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fileName = `RRA-INTEL-REPORT-${reportId || caseRef}.pdf`;

  let y = MARGIN;

  // ── LETTERHEAD ─────────────────────────────────────────────────────────────
  // Top gold bar
  rect(doc, 0, 0, PAGE_W, 4, GOLD);

  // RRA wordmark
  setFont(doc, 'bold', 16);
  text(doc, 'RWANDA REVENUE AUTHORITY', PAGE_W / 2, y + 10, BLUE, { align: 'center' });

  setFont(doc, 'normal', 9);
  text(doc, 'Intelligence & Enforcement Division  ·  Directorate of Tax Investigations', PAGE_W / 2, y + 17, SLATE, { align: 'center' });

  hr(doc, MARGIN, y + 20, CONTENT_W, BLUE, 0.8);
  y += 26;

  // CLASSIFICATION BANNER
  rect(doc, MARGIN, y, CONTENT_W, 8, [254, 226, 226]);
  doc.setDrawColor(...RED_SOFT);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_W, 8);
  setFont(doc, 'bold', 8);
  text(doc, 'RESTRICTED  //  INTERNAL USE ONLY  //  INTELLIGENCE DOCUMENT', PAGE_W / 2, y + 5.5, RED_SOFT, { align: 'center' });
  y += 12;

  // Document reference header
  setFont(doc, 'normal', 7.5);
  text(doc, `Ref: RRA-INTEL-REPORT-${reportId}`, MARGIN, y, SLATE);
  text(doc, `Generated: ${new Date().toLocaleString('en-RW')}`, PAGE_W - MARGIN, y, SLATE, { align: 'right' });
  y += 8;

  // ── METADATA TABLE ─────────────────────────────────────────────────────────
  const statusText = status.replace(/_/g, ' ');
  const metaRows = [
    ['Report Title',      title],
    ['Subject / Case Ref',subject],
    ['Case Number',       caseRef],
    ['Taxpayer Name',     taxpayerName],
    ['TIN Reference',     tin],
    ['Date Compiled',     dateCompiled],
    ['Prepared By',       `${preparedBy}  —  ${preparedByRole}`],
    ['Document Status',   statusText],
  ];
  y = drawMetaTable(doc, y, metaRows);

  // Status pill (coloured)
  const sc = statusColor(status);
  rect(doc, MARGIN, y, CONTENT_W, 7, sc.map(c => Math.min(255, c + 210)));
  setFont(doc, 'bold', 8);
  text(doc, `STATUS: ${statusText}`, MARGIN + 3, y + 5, sc);
  y += 11;

  // ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
  y = sectionHeading(doc, y, 'I.  EXECUTIVE SUMMARY');
  setFont(doc, 'normal', 9.5);
  doc.setTextColor(...[30, 41, 59]);
  const summaryLines = doc.splitTextToSize(body || 'No executive summary recorded.', CONTENT_W);
  summaryLines.forEach(line => {
    y = checkPageBreak(doc, y, 6);
    doc.text(line, MARGIN, y);
    y += 5.5;
  });
  y += 4;

  // ── DETAILED FINDINGS ──────────────────────────────────────────────────────
  if (sections.length > 0) {
    y = sectionHeading(doc, y, 'II.  DETAILED FINDINGS & LEGAL BASIS');
    sections.forEach((sec, idx) => {
      y = checkPageBreak(doc, y, 16);
      if (sec.subject) {
        setFont(doc, 'bold', 9);
        text(doc, `${idx + 1}.  ${sec.subject}`, MARGIN, y, BLUE);
        y += 5;
      }
      setFont(doc, 'normal', 9);
      doc.setTextColor(30, 41, 59);
      const paraLines = doc.splitTextToSize(sec.text || '—', CONTENT_W - 4);
      paraLines.forEach(line => {
        y = checkPageBreak(doc, y, 6);
        doc.text(line, MARGIN + 2, y);
        y += 5;
      });
      y += 3;
    });
  }

  // ── EVIDENCE INVENTORY ─────────────────────────────────────────────────────
  if (attachments.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = sectionHeading(doc, y, 'III.  ADMISSIBLE EVIDENCE INVENTORY');

    // Table header
    const COL_WIDTHS = [20, 70, 20, CONTENT_W - 110];
    const COLS = ['Tag ID', 'File Name', 'Size', 'Description'];
    rect(doc, MARGIN, y, CONTENT_W, 7, BLUE);
    let cx = MARGIN + 2;
    COLS.forEach((col, i) => {
      setFont(doc, 'bold', 8);
      text(doc, col, cx, y + 5, [255, 255, 255]);
      cx += COL_WIDTHS[i];
    });
    y += 7;

    attachments.forEach((att, i) => {
      y = checkPageBreak(doc, y, 8);
      if (i % 2 === 0) rect(doc, MARGIN, y, CONTENT_W, 7, LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.15);
      doc.rect(MARGIN, y, CONTENT_W, 7);

      const row = [`TAG-${101 + i}`, att.name, att.size, att.description || '—'];
      let rx = MARGIN + 2;
      row.forEach((val, ri) => {
        setFont(doc, ri === 0 ? 'bold' : 'normal', 7.5);
        if (ri === 0) {
          doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
        } else {
          doc.setTextColor(30, 41, 59);
        }
        const clipped = doc.splitTextToSize(String(val), COL_WIDTHS[ri] - 3)[0];
        doc.text(clipped, rx, y + 4.8);
        rx += COL_WIDTHS[ri];
      });
      y += 7;
    });
    y += 4;
  }

  // ── REJECTION / RETURN NOTES ───────────────────────────────────────────────
  if (rejectionReason) {
    y = checkPageBreak(doc, y, 20);
    rect(doc, MARGIN, y, CONTENT_W, 8, [254, 226, 226]);
    doc.setDrawColor(...RED_SOFT);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, CONTENT_W, 8);
    setFont(doc, 'bold', 8);
    text(doc, '⚠  REJECTION NOTES:', MARGIN + 3, y + 5.5, RED_SOFT);
    y += 10;
    setFont(doc, 'normal', 8.5);
    const rejLines = doc.splitTextToSize(rejectionReason, CONTENT_W - 4);
    rejLines.forEach(line => {
      y = checkPageBreak(doc, y, 6);
      text(doc, line, MARGIN + 3, y, RED_SOFT);
      y += 5;
    });
    y += 4;
  }

  if (returnReason) {
    y = checkPageBreak(doc, y, 20);
    rect(doc, MARGIN, y, CONTENT_W, 8, [255, 237, 213]);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, CONTENT_W, 8);
    setFont(doc, 'bold', 8);
    text(doc, '↩  RETURN COMMENTS:', MARGIN + 3, y + 5.5, ORANGE);
    y += 10;
    setFont(doc, 'normal', 8.5);
    const retLines = doc.splitTextToSize(returnReason, CONTENT_W - 4);
    retLines.forEach(line => {
      y = checkPageBreak(doc, y, 6);
      text(doc, line, MARGIN + 3, y, ORANGE);
      y += 5;
    });
    y += 4;
  }

  // ── SIGNATURE BLOCKS ───────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 40);
  hr(doc, MARGIN, y, CONTENT_W, BLUE, 0.6);
  y += 6;
  setFont(doc, 'bold', 9);
  text(doc, 'AUTHENTICATION & APPROVAL SIGNATURES', PAGE_W / 2, y, BLUE, { align: 'center' });
  y += 8;

  drawSignatureBlock(doc, y, 'Assistant Commissioner', acSignature.name, acSignature.signed);
  drawSignatureBlock(doc, y, 'Director of Intelligence', dirSignature.name, dirSignature.signed);
  y += 34;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Bottom gold bar
    rect(doc, 0, 292, PAGE_W, 5, GOLD);
    setFont(doc, 'normal', 7);
    text(doc, 'Rwanda Revenue Authority  ·  Confidential Intelligence Document  ·  Unauthorised disclosure is a criminal offence.', PAGE_W / 2, 289, SLATE, { align: 'center' });
    text(doc, `Page ${p} of ${totalPages}`, PAGE_W - MARGIN, 289, SLATE, { align: 'right' });
  }

  // ── SAVE FILE ─────────────────────────────────────────────────────────────
  doc.save(fileName);
};
