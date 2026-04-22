import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export type InvoiceStatus = "unpaid" | "paid" | "refunded";

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  _id: number;
  patientId: number;
  appointmentId: number | null;
  lineItems: IInvoiceLineItem[];
  subtotal: string;
  tax: string;
  total: string;
  status: InvoiceStatus;
  issuedAt: Date;
  paidAt: Date | null;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    _id: { type: Number },
    patientId: { type: Number, required: true, index: true },
    appointmentId: { type: Number, default: null },
    lineItems: { type: Schema.Types.Mixed, default: [] },
    subtotal: { type: String, required: true },
    tax: { type: String, required: true },
    total: { type: String, required: true },
    status: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    issuedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

invoiceSchema.virtual("id").get(function () { return this._id; });

invoiceSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("invoices");
});

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);

export type InvoiceDoc = HydratedDocument<IInvoice>;
