import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

async function main() {
  // Fail fast if the database isn't reachable rather than accepting
  // requests that would all 500 on their first query.
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`AI Advisor API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
