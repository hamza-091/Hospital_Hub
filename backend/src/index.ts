import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { logger } from "./lib/logger";

const dotenvCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];

for (const dotenvPath of dotenvCandidates) {
  if (fs.existsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
    break;
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  const { default: app } = await import("./app");
  try {
    const { connectDB } = await import("@workspace/db");
    logger.info("Connecting to MongoDB...");
    await connectDB();
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start();
