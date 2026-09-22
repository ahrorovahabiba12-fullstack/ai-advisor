import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Single shared Prisma Client instance for the whole process.
// Avoids exhausting Postgres connections under hot-reload in dev.
declare global {
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
