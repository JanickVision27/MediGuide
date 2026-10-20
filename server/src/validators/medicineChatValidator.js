import { z } from "zod";

import { MAX_QUESTION_LENGTH } from "../services/medicineChatService.js";
import { medicineNameSchema } from "./aiLookupValidator.js";

/**
 * One transcript entry. The client owns the transcript, so roles are limited
 * to the two the chat panel renders.
 */
const historyEntrySchema = z.object({
  role: z.enum(["user", "assistant"], {
    error: "history entries must use role 'user' or 'assistant'",
  }),
  content: z
    .string({ error: "history content must be a string" })
    .trim()
    .min(1, "history content must not be empty")
    .max(2000, "history content must be 2000 characters or fewer"),
});

export const medicineChatSchema = z.object({
  medicineName: medicineNameSchema,
  question: z
    .string({ error: "question must be a string" })
    .trim()
    .min(1, "Question is required")
    .max(
      MAX_QUESTION_LENGTH,
      `Question must be ${MAX_QUESTION_LENGTH} characters or fewer`
    ),
  // The route trims this to the most recent MAX_HISTORY_TURNS entries.
  history: z
    .array(historyEntrySchema)
    .max(50, "history is too long")
    .optional()
    .default([]),
});
