import writeXlsxFile from "write-excel-file/node";
import type { CellObject, SheetData } from "write-excel-file/node";
import PDFDocument from "pdfkit";
import { Response } from "express";
import { env } from "../../config/env";

export type CellFormat = "text" | "number" | "currency" | "date" | "datetime" | "percent";

export interface ExportColumn {
  key:     string;
  header:  string;
  /** relative width in characters (default 16) */
  width?:  number;
  format?: CellFormat;
}

export interface ExportTable {
  /** file name without extension */
  filename:   string;
  title:      string;
  subtitle?:  string;
  sheetName?: string;
  columns:    ExportColumn[];
  rows:       Record<string, unknown>[];
  /** short "label: value" lines shown above the table */
  summary?:   { label: string; value: string }[];
}

const PK = "Asia/Karachi";

function fmt(value: unknown, format: CellFormat = "text"): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "date":     return new Date(value as string | Date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: PK });
    case "datetime": return new Date(value as string | Date).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: PK });
    case "currency": return Math.round(Number(value)).toLocaleString("en-PK");
    case "percent":  return `${Number(value)}%`;
    case "number":   return Number(value).toLocaleString("en-PK");
    default:         return String(value);
  }
}

const safeSheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1";

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "export";
}

export async function sendXlsx(res: Response, t: ExportTable): Promise<void> {
  const lastCol = Math.max(t.columns.length, 1);
  const pad = (n: number) => Array.from({ length: n }, () => null);
  const data: SheetData = [];

  data.push([{ value: `${env.COLLEGE_NAME} — ${t.title}`, fontWeight: "bold", fontSize: 14, columnSpan: lastCol } as CellObject, ...pad(lastCol - 1)]);
  data.push([{ value: [t.subtitle, `Generated ${fmt(new Date(), "datetime")}`].filter(Boolean).join("  ·  "), color: "#6b7280", columnSpan: lastCol } as CellObject, ...pad(lastCol - 1)]);
  for (const s of t.summary ?? []) {
    data.push([{ value: s.label, fontWeight: "bold" } as CellObject, { value: s.value, align: "left" } as CellObject]);
  }
  data.push([]);

  const headerIndex = data.length;
  data.push(t.columns.map((c) => ({ value: c.header, fontWeight: "bold", color: "#ffffff", backgroundColor: "#1e3a5f", alignVertical: "center", wrap: true } as CellObject)));

  for (const r of t.rows) {
    data.push(
      t.columns.map((c): CellObject | null => {
        const v = r[c.key];
        if (v === null || v === undefined || v === "") return null;
        switch (c.format) {
          case "date":     return { value: new Date(v as string | Date), type: Date, format: "dd mmm yyyy" } as CellObject;
          case "datetime": return { value: new Date(v as string | Date), type: Date, format: "dd mmm yyyy hh:mm" } as CellObject;
          case "currency": return { value: Number(v), type: Number, format: "#,##0" } as CellObject;
          case "number":   return { value: Number(v), type: Number } as CellObject;
          case "percent":  return { value: Number(v) / 100, type: Number, format: "0%" } as CellObject;
          default:         return { value: String(v), type: String } as CellObject;
        }
      })
    );
  }

  const buffer = await writeXlsxFile(data, {
    sheet: safeSheetName(t.sheetName ?? t.title),
    columns: t.columns.map((c) => ({ width: c.width ?? 16 })),
    stickyRowsCount: headerIndex + 1,
  }).toBuffer();

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${t.filename}.xlsx"`);
  res.end(buffer);
}

export function sendPdf(res: Response, t: ExportTable): void {
  const landscape = t.columns.length > 5;
  const doc = new PDFDocument({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 36, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${t.filename}.pdf"`);
  doc.pipe(res);

  const left = 36;
  const usable = doc.page.width - 72;
  const totalW = t.columns.reduce((s, c) => s + (c.width ?? 16), 0) || 1;
  const widths = t.columns.map((c) => ((c.width ?? 16) / totalW) * usable);
  const bottom = () => doc.page.height - 48;

  doc.font("Helvetica-Bold").fontSize(15).fillColor("#1e3a5f").text(env.COLLEGE_NAME, left, 36, { width: usable });
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1f2937").text(t.title, left, doc.y + 2, { width: usable });
  doc.font("Helvetica").fontSize(8).fillColor("#6b7280").text([t.subtitle, `Generated ${fmt(new Date(), "datetime")}`].filter(Boolean).join("  ·  "), left, doc.y + 2, { width: usable });
  doc.moveDown(0.6);
  for (const s of t.summary ?? []) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1f2937").text(`${s.label}: `, left, doc.y, { continued: true }).font("Helvetica").text(s.value);
  }
  doc.moveDown(0.6);

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(left, y, usable, 18).fill("#1e3a5f");
    let x = left;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    t.columns.forEach((c, i) => { doc.text(c.header, x + 3, y + 5, { width: widths[i] - 6, lineBreak: false, ellipsis: true }); x += widths[i]; });
    doc.y = y + 20;
  };
  drawHeader();

  doc.font("Helvetica").fontSize(8);
  t.rows.forEach((r, ri) => {
    const cells = t.columns.map((c) => fmt(r[c.key], c.format));
    const heights = cells.map((txt, i) => doc.heightOfString(txt, { width: widths[i] - 6 }));
    const rowH = Math.max(14, Math.max(...heights) + 6);
    if (doc.y + rowH > bottom()) { doc.addPage(); drawHeader(); doc.font("Helvetica").fontSize(8); }
    const y = doc.y;
    if (ri % 2 === 1) doc.rect(left, y, usable, rowH).fill("#f3f4f6");
    let x = left;
    doc.fillColor("#1f2937");
    cells.forEach((txt, i) => {
      const numeric = ["currency", "number", "percent"].includes(t.columns[i].format ?? "");
      doc.text(txt, x + 3, y + 3, { width: widths[i] - 6, align: numeric ? "right" : "left" });
      x += widths[i];
    });
    doc.y = y + rowH;
  });
  if (t.rows.length === 0) doc.fillColor("#6b7280").text("No records.", left, doc.y + 4);

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280").text(`Page ${i + 1} of ${range.count}`, left, doc.page.height - 30, { width: usable, align: "center", lineBreak: false });
  }
  doc.end();
}
