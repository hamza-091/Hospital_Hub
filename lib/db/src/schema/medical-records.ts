import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export interface IMedicalRecord {
  _id: number;
  patientId: number;
  doctorId: number;
  appointmentId: number | null;
  diagnosis: string;
  treatmentPlan: string | null;
  attachedFileUrls: string | null;
  createdAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    _id: { type: Number },
    patientId: { type: Number, required: true, index: true },
    doctorId: { type: Number, required: true, index: true },
    appointmentId: { type: Number, default: null },
    diagnosis: { type: String, required: true },
    treatmentPlan: { type: String, default: null },
    attachedFileUrls: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

medicalRecordSchema.virtual("id").get(function () { return this._id; });

medicalRecordSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("medical_records");
});

export const MedicalRecord: Model<IMedicalRecord> =
  mongoose.models.MedicalRecord || mongoose.model<IMedicalRecord>("MedicalRecord", medicalRecordSchema);

export type MedicalRecordDoc = HydratedDocument<IMedicalRecord>;
