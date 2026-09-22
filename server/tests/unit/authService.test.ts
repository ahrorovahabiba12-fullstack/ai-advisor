import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { AuthService } from "../../src/services/authService";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/db";
import { createStudentUser } from "../helpers/fixtures";

describe("AuthService — blocked accounts (real DB)", () => {
  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it("rejects login for a BLOCKED user even with the correct password", async () => {
    const { user } = await createStudentUser();
    await prisma.user.update({ where: { id: user.id }, data: { status: "BLOCKED" } });

    await expect(
      new AuthService().login({ email: user.email, password: "Test1234!" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("still logs in an ACTIVE user normally", async () => {
    const { user } = await createStudentUser();

    const result = await new AuthService().login({ email: user.email, password: "Test1234!" });

    expect(result.user.id).toBe(user.id);
    expect(result.accessToken).toBeTruthy();
  });

  it("rejects a refresh attempt once the account has been blocked mid-session, and revokes the token", async () => {
    const { user } = await createStudentUser();
    const service = new AuthService();
    const session = await service.login({ email: user.email, password: "Test1234!" });

    await prisma.user.update({ where: { id: user.id }, data: { status: "BLOCKED" } });

    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({ statusCode: 403 });
    // The revoked token must not work on a second attempt either (proves it was actually revoked, not just rejected this once).
    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });
});
