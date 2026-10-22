import { z } from "zod";

import { validateBody } from "./authValidator.js";

function isCalendarDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export const appointmentSchema = z
  .object({
    doctor: z.string().trim().min(2).max(100),
    specialty: z.string().trim().min(2).max(100),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
      .refine(isCalendarDate, "Enter a valid calendar date"),
    time: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Time must use 24-hour HH:mm"),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const validateAppointment = validateBody(appointmentSchema);
