import { z } from "zod";

export const startQuizSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid(),
    grade: z.number().int().min(1).max(11),
  }),
});

export const submitQuizSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid(),
    grade: z.number().int().min(1).max(11),
    answers: z
      .array(z.object({ questionId: z.string().uuid(), selectedIndex: z.number().int().min(0).max(3) }))
      .min(1),
    // Echoed back from startQuiz's response — used to record real time spent.
    // Optional so an older client that never sends it still works (just without timing).
    startedAt: z.string().datetime().optional(),
  }),
});
