import { pgTable, text, serial, integer, timestamp, jsonb, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";
import { appointmentsTable } from "./appointments";

export const invoiceStatusEnum = pgEnum("invoice_status", ["unpaid", "paid", "refunded"]);

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  lineItems: jsonb("line_items").notNull().$type<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>>(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("unpaid"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
