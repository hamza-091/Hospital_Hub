import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export type UserRole = "admin" | "doctor" | "patient";
export type UserStatus = "active" | "suspended";

export interface IUser {
  _id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string | null;
  status: UserStatus;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: Number },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "doctor", "patient"], default: "patient" },
    phone: { type: String, default: null },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("id").get(function () { return this._id; });

userSchema.pre("save", async function () {
  if (this.isNew && this._id == null) {
    this._id = await getNextId("users");
  }
});

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export type UserDoc = HydratedDocument<IUser>;
