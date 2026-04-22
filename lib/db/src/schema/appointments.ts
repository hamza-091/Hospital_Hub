import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface IAppointment {
  _id: number;
  patientId: number;
  doctorId: number;
  scheduledAt: Date;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    _id: { type: Number },
    patientId: { type: Number, required: true, index: true },
    doctorId: { type: Number, required: true, index: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    reason: { type: String, default: null },
    notes: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

appointmentSchema.virtual("id").get(function () { return this._id; });

appointmentSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("appointments");
});

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>("Appointment", appointmentSchema);

export type AppointmentDoc = HydratedDocument<IAppointment>;
