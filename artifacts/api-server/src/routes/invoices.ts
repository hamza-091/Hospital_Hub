import { Router, type IRouter } from "express";
import { db, usersTable, invoicesTable, appointmentsTable, patientsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

function normalizeStatus(dbStatus: string): string {
  if (dbStatus === "unpaid") return "pending";
  if (dbStatus === "refunded") return "cancelled";
  return dbStatus; // "paid"
}

function dbStatusFromApi(apiStatus: string): "unpaid" | "paid" | "refunded" {
  if (apiStatus === "pending") return "unpaid";
  if (apiStatus === "cancelled") return "refunded";
  return "paid";
}

async function buildInvoiceWithDetails(invoice: typeof invoicesTable.$inferSelect) {
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, invoice.patientId));
  let patientUser = null;
  if (patient) {
    const [u] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, phone: usersTable.phone, status: usersTable.status, createdAt: usersTable.createdAt
    }).from(usersTable).where(eq(usersTable.id, patient.userId));
    patientUser = u;
  }
  return {
    id: invoice.id,
    patientId: invoice.patientId,
    appointmentId: invoice.appointmentId,
    invoiceDate: invoice.issuedAt,
    dueDate: null,
    totalAmount: Number(invoice.total),
    status: normalizeStatus(invoice.status),
    items: (invoice.lineItems ?? []).map((li: any) => ({
      description: li.description,
      amount: li.total,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
    paidAt: invoice.paidAt,
    createdAt: invoice.issuedAt,
    patient: patient ? { ...patient, user: patientUser } : null,
  };
}

router.get("/invoices", requireAuth, async (req, res): Promise<void> => {
  const { patientId, status } = req.query as { patientId?: string; status?: string };
  const conditions: SQL[] = [];
  if (patientId) conditions.push(eq(invoicesTable.patientId, parseInt(patientId, 10)));
  if (status) conditions.push(eq(invoicesTable.status, dbStatusFromApi(status)));

  const invoices = await db.select().from(invoicesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(invoicesTable.issuedAt);
  const result = await Promise.all(invoices.map(buildInvoiceWithDetails));
  res.json({ invoices: result });
});

router.post("/invoices", requireAuth, async (req, res): Promise<void> => {
  const { patientId, appointmentId, items, totalAmount } = req.body;
  if (!patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }
  const lineItems = items ?? [];
  const subtotal = lineItems.reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
  const tax = subtotal * 0.1;
  const total = totalAmount ?? (subtotal + tax);

  const [invoice] = await db.insert(invoicesTable).values({
    patientId,
    appointmentId: appointmentId ?? null,
    lineItems,
    subtotal: String(subtotal),
    tax: String(tax),
    total: String(total),
    status: "unpaid",
  }).returning();
  res.status(201).json(await buildInvoiceWithDetails(invoice));
});

router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(await buildInvoiceWithDetails(invoice));
});

router.patch("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const updates: Partial<typeof invoicesTable.$inferInsert> = {};
  if (status !== undefined) {
    updates.status = dbStatusFromApi(status);
    if (updates.status === "paid") updates.paidAt = new Date();
  }
  const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(await buildInvoiceWithDetails(invoice));
});

router.get("/invoices/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  const details = await buildInvoiceWithDetails(invoice);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(22).font("Helvetica-Bold").text("CareSync HMS", { align: "center" });
  doc.fontSize(14).font("Helvetica").text("INVOICE", { align: "center" });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown();

  doc.fontSize(11).font("Helvetica-Bold").text("Invoice #: ", { continued: true }).font("Helvetica").text(String(id).padStart(5, "0"));
  doc.font("Helvetica-Bold").text("Patient: ", { continued: true }).font("Helvetica").text(details.patient?.user?.name || "N/A");
  doc.font("Helvetica-Bold").text("Date: ", { continued: true }).font("Helvetica").text(new Date(invoice.issuedAt).toLocaleDateString());
  doc.font("Helvetica-Bold").text("Status: ", { continued: true }).font("Helvetica").text(details.status.toUpperCase());
  doc.moveDown();

  doc.fontSize(11).font("Helvetica-Bold").text("Description", { continued: true, width: 250 });
  doc.text("Qty", { continued: true, width: 60, align: "right" });
  doc.text("Unit Price", { continued: true, width: 100, align: "right" });
  doc.text("Total", { width: 100, align: "right" });
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.3);

  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  lineItems.forEach((item: any) => {
    doc.font("Helvetica").text(item.description || "", { continued: true, width: 250 });
    doc.text(String(item.quantity || 1), { continued: true, width: 60, align: "right" });
    doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, { continued: true, width: 100, align: "right" });
    doc.text(`$${(item.total || 0).toFixed(2)}`, { width: 100, align: "right" });
  });

  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text("Subtotal: ", { continued: true }).font("Helvetica").text(`$${Number(invoice.subtotal).toFixed(2)}`);
  doc.font("Helvetica-Bold").text("Tax: ", { continued: true }).font("Helvetica").text(`$${Number(invoice.tax).toFixed(2)}`);
  doc.fontSize(13).font("Helvetica-Bold").text("Total: ", { continued: true }).text(`$${Number(invoice.total).toFixed(2)}`);

  doc.end();
});

export default router;
