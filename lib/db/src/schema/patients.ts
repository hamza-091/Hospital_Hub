import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export interface IPatient {
  _id: number;
  userId: number;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  address: string | null;
  emergencyContact: string | null;
  allergies: string | null;
  medicalHistory: string | null;
}

const patientSchema = new Schema<IPatient>(
  {
    _id: { type: Number },
    userId: { type: Number, required: true, index: true },
    dateOfBirth: { type: String, default: null },
    gender: { type: String, default: null },
    bloodGroup: { type: String, default: null },
    address: { type: String, default: null },
    emergencyContact: { type: String, default: null },
    allergies: { type: String, default: null },
    medicalHistory: { type: String, default: null },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

patientSchema.virtual("id").get(function () { return this._id; });

patientSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("patients");
});

export const Patient: Model<IPatient> =
  mongoose.models.Patient || mongoose.model<IPatient>("Patient", patientSchema);

export type PatientDoc = HydratedDocument<IPatient>;
