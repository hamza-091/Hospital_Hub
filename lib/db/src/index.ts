import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be set. Configure your MongoDB Atlas connection string.");
}

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 10000,
    });
  }
  return connectionPromise;
}

export { mongoose };
export * from "./schema";
