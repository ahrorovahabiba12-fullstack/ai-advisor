import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface AccessTokenPayload {
  userId: string;
  role: Role;
  studentId?: string;
  parentId?: string;
}

// jsonwebtoken's SignOptions.expiresIn is typed as `number | ms.StringValue`
// (a template-literal union from the `ms` package), not a plain `string`.
// env.JWT_ACCESS_TTL/JWT_REFRESH_TTL are validated by zod as strings in the
// documented "15m"/"30d" format (see .env.example), so this narrowing cast
// to the library's own exact expected type is correct — not an `any` escape
// hatch, just telling TS what we already guarantee at the env-validation layer.
const accessTokenOptions: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"] };
const refreshTokenOptions: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"] };

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);

export const signRefreshToken = (userId: string): string =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, refreshTokenOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): { userId: string } =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
