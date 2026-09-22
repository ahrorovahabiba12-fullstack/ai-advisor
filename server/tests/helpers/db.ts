import { prisma } from "../../src/config/prisma";

// Full-truncate between tests instead of tracking/deleting created rows —
// simpler and immune to leaks from a test that fails before its own cleanup
// runs. Safe only because vitest.config.ts points DATABASE_URL at a
// dedicated ai_advisor_test database, never the real dev DB.
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}
