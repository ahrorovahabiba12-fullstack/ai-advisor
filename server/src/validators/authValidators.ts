import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
    role: z.enum(["STUDENT", "PARENT"]),
    fullName: z.string().min(2),
    // Required only for STUDENT role; validated in the service layer
    // because cross-field rules don't belong in a shape-only schema.
    grade: z.number().int().min(1).max(11).optional(),
    parentEmail: z.string().email().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
