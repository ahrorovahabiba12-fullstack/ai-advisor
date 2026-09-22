import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000),
  }),
});
