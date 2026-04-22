import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export interface IPrescriptionMedicine {
  medicineId: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number | null;
  instructions?: string | null;
}

export interface IPrescription {
  _id: number;
  patientId: number;
  doctorId: number;
  appointmentId: number | null;
  medicines: IPrescriptionMedicine[];
  instructions: string | null;
  createdAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    _id: { type: Number },
    patientId: { type: Number, required: true, index: true },
    doctorId: { type: Number, required: true, index: true },
    appointmentId: { type: Number, default: null },
    medicines: { type: Schema.Types.Mixed, default: [] },
    instructions: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

prescriptionSchema.virtual("id").get(function () { return this._id; });

prescriptionSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("prescriptions");
});

export const Prescription: Model<IPrescription> =
  mongoose.models.Prescription || mongoose.model<IPrescription>("Prescription", prescriptionSchema);

export type PrescriptionDoc = HydratedDocument<IPrescription>;
