import PDFDocument from "pdfkit";
import { Response } from "express";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { env } from "../../config/env";

const C = { primary: "#1e3a5f", text: "#1f2937", muted: "#6b7280", light: "#f3f4f6", line: "#9ca3af" } as const;
const COPIES = ["BANK COPY", "COLLEGE COPY", "STUDENT COPY"] as const;
const MAX_BULK = 500;

interface LineItem { name: string; amount: number }

const challanInclude = {
  studentProfile: {
    select: {
      registrationNo: true, firstName: true, lastName: true, fatherName: true,
      program: { select: { name: true, code: true } },
    },
  },
} as const;

type ChallanInvoice = {
  invoiceNo: string; semester: string | null; issuedAt: Date; dueDate: Date;
  totalAmount: number; discountAmount: number; paidAmount: number; dueAmount: number;
  lineItems: unknown;
  studentProfile: {
    registrationNo: string; firstName: string; lastName: string; fatherName: string | null;
    program: { name: string; code: string };
  };
};

const money = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

function itemsOf(inv: ChallanInvoice): LineItem[] {
  if (Array.isArray(inv.lineItems) && inv.lineItems.length > 0) {
    return (inv.lineItems as LineItem[]).map((i) => ({ name: String(i.name), amount: Number(i.amount) }));
  }
  return [{ name: "Fee as per invoice", amount: inv.totalAmount }];
}

function drawCopy(doc: PDFKit.PDFDocument, inv: ChallanInvoice, label: string, x: number, w: number) {
  let y = 24;
  const s = inv.studentProfile;

  doc.rect(x, y, w, 40).fill(C.primary);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text(env.COLLEGE_NAME, x + 6, y + 7, { width: w - 12, align: "center" });
  doc.font("Helvetica").fontSize(8).text(`FEE CHALLAN — ${label}`, x + 6, y + 25, { width: w - 12, align: "center" });
  y += 48;

  doc.fillColor(C.text).fontSize(8);
  const row = (k: string, v: string) => {
    doc.font("Helvetica-Bold").fillColor(C.muted).text(k, x, y, { width: 78 });
    doc.font("Helvetica").fillColor(C.text).text(v, x + 80, y, { width: w - 80 });
    y += Math.max(12, doc.heightOfString(v, { width: w - 80 }) + 2);
  };

  row("Challan No", inv.invoiceNo);
  row("Issue date", day(inv.issuedAt));
  row("Due date", day(inv.dueDate));
  y += 4;
  row("Student", `${s.firstName} ${s.lastName}`);
  if (s.fatherName) row("Father name", s.fatherName);
  row("Reg. No", s.registrationNo);
  row("Program", s.program.name);
  if (inv.semester) row("Semester", inv.semester);
  y += 6;

  doc.rect(x, y, w, 14).fill(C.light);
  doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8)
    .text("Fee head", x + 4, y + 3, { width: w - 80 })
    .text("Amount", x + w - 74, y + 3, { width: 70, align: "right" });
  y += 17;

  doc.font("Helvetica").fontSize(8);
  for (const it of itemsOf(inv)) {
    doc.text(it.name, x + 4, y, { width: w - 84 });
    doc.text(money(it.amount), x + w - 74, y, { width: 70, align: "right" });
    y += Math.max(12, doc.heightOfString(it.name, { width: w - 84 }) + 2);
  }

  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(C.line).lineWidth(0.5).undash().stroke();
  y += 4;
  const total = (k: string, v: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 8).fillColor(C.text)
      .text(k, x + 4, y, { width: w - 84 })
      .text(v, x + w - 94, y, { width: 90, align: "right" });
    y += bold ? 16 : 12;
  };
  total("Total fee", money(inv.totalAmount));
  if (inv.discountAmount > 0) total("Discount", `- ${money(inv.discountAmount)}`);
  if (inv.paidAmount > 0)     total("Already paid", `- ${money(inv.paidAmount)}`);
  total("PAYABLE", money(inv.dueAmount), true);
  y += 6;

  doc.font("Helvetica").fontSize(7).fillColor(C.muted);
  if (env.COLLEGE_BANK_NAME || env.COLLEGE_BANK_ACCOUNT) {
    const bank = [env.COLLEGE_BANK_NAME, env.COLLEGE_BANK_ACCOUNT && `A/C: ${env.COLLEGE_BANK_ACCOUNT}`].filter(Boolean).join(" — ");
    doc.text(`Deposit at: ${bank}`, x, y, { width: w });
    y += doc.heightOfString(`Deposit at: ${bank}`, { width: w }) + 3;
  }
  doc.text("Payment is confirmed only after verification by the accounts office. Late payment attracts a surcharge as per the fee policy.", x, y, { width: w });

  // Signature / stamp area
  const sigY = 520;
  doc.moveTo(x, sigY).lineTo(x + 100, sigY).strokeColor(C.line).lineWidth(0.5).stroke();
  doc.moveTo(x + w - 100, sigY).lineTo(x + w, sigY).stroke();
  doc.fontSize(7).fillColor(C.muted)
    .text("Cashier / Bank stamp", x, sigY + 3, { width: 100 })
    .text("Depositor sign", x + w - 100, sigY + 3, { width: 100, align: "right" });
}

function drawChallanPage(doc: PDFKit.PDFDocument, inv: ChallanInvoice) {
  const gap = 14;
  const w = (doc.page.width - 40 - gap * 2) / 3;
  COPIES.forEach((label, i) => {
    const x = 20 + i * (w + gap);
    drawCopy(doc, inv, label, x, w);
    if (i < COPIES.length - 1) {
      const lx = x + w + gap / 2;
      doc.moveTo(lx, 20).lineTo(lx, doc.page.height - 20).strokeColor(C.line).lineWidth(0.5).dash(3, { space: 3 }).stroke().undash();
    }
  });
}

function startDoc(res: Response, filename: string) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 20 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

export async function generateFeeChallan(invoiceId: string, res: Response) {
  const invoice = await prisma.feeInvoice.findUnique({ where: { id: invoiceId }, include: challanInclude });
  if (!invoice) throw AppError.notFound("Invoice not found");

  const doc = startDoc(res, `challan-${invoice.invoiceNo}.pdf`);
  drawChallanPage(doc, invoice as ChallanInvoice);
  doc.end();
}

/** One PDF, one landscape page (3 copies) per student — for a whole challan run. */
export async function generateBulkChallans(
  params: { feeStructureId?: string; semester?: string; invoiceIds?: string[] },
  res: Response
) {
  if (!params.invoiceIds?.length && !params.feeStructureId) {
    throw AppError.badRequest("Give a fee structure or a list of invoices");
  }

  const invoices = await prisma.feeInvoice.findMany({
    where: {
      dueAmount: { gt: 0 },
      ...(params.invoiceIds?.length
        ? { id: { in: params.invoiceIds } }
        : { feeStructureId: params.feeStructureId, ...(params.semester !== undefined && { semester: params.semester }) }),
    },
    include: challanInclude,
    orderBy: { studentProfile: { registrationNo: "asc" } },
    take: MAX_BULK + 1,
  });
  if (invoices.length === 0) throw AppError.notFound("No unpaid invoices found for this selection");
  if (invoices.length > MAX_BULK) throw AppError.badRequest(`Too many challans at once (max ${MAX_BULK}) — narrow the selection`);

  const doc = startDoc(res, `challans-${new Date().toISOString().slice(0, 10)}.pdf`);
  invoices.forEach((inv: unknown, i: number) => {
    if (i > 0) doc.addPage();
    drawChallanPage(doc, inv as ChallanInvoice);
  });
  doc.end();
}
