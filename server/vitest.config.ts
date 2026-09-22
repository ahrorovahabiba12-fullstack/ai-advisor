import "dotenv/config";
import { defineConfig } from "vitest/config";

// Tests never run against the real dev database — the DB name is swapped
// to a dedicated `ai_advisor_test` database (same host/credentials as
// DATABASE_URL in .env). Create it once with:
//   createdb ai_advisor_test && DATABASE_URL=<...>/ai_advisor_test npx prisma migrate deploy
function toTestDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/\/([^/?]+)(\?.*)?$/, "/ai_advisor_test$2");
}

const testDatabaseUrl = toTestDatabaseUrl(process.env.DATABASE_URL);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Every test file shares one real Postgres connection (ai_advisor_test)
    // and each resets it with a full TRUNCATE in beforeEach — running files
    // in parallel lets one file's truncate wipe rows another file is
    // mid-way through creating (FK violations, rows vanishing under a
    // still-running assertion). Serialize file execution to avoid that.
    fileParallelism: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: toTestDatabaseUrl(process.env.DIRECT_URL) ?? testDatabaseUrl,
      // getAIProvider() checks AI_PROVIDER before NODE_ENV — a dev's real .env
      // (AI_PROVIDER=openai + a live key, for interactive use) must never leak
      // into the test run, or every test suite run would make real, billed
      // OpenAI calls instead of using the deterministic MockAIProvider.
      AI_PROVIDER: "mock",
      AI_API_KEY: "",
    },
  },
});
