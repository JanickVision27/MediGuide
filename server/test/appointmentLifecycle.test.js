import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  completeFinishedAppointments,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
  getAppointmentDurationMinutes,
  getAppointmentEndTime,
  isAppointmentFinished,
} from "../src/services/appointmentLifecycle.js";

const originalDuration = process.env.APPOINTMENT_DURATION_MINUTES;

afterEach(() => {
  if (originalDuration === undefined) delete process.env.APPOINTMENT_DURATION_MINUTES;
  else process.env.APPOINTMENT_DURATION_MINUTES = originalDuration;
});

const KOLKATA_APPOINTMENT = {
  date: "2026-11-02",
  time: "10:00",
  timeZone: "Asia/Kolkata",
  status: "Upcoming",
};

test("the visit duration defaults to 30 minutes and can be overridden", () => {
  delete process.env.APPOINTMENT_DURATION_MINUTES;
  assert.equal(getAppointmentDurationMinutes(), DEFAULT_APPOINTMENT_DURATION_MINUTES);

  process.env.APPOINTMENT_DURATION_MINUTES = "45";
  assert.equal(getAppointmentDurationMinutes(), 45);

  // Invalid values fall back instead of producing a broken lifecycle.
  process.env.APPOINTMENT_DURATION_MINUTES = "9999";
  assert.equal(getAppointmentDurationMinutes(), DEFAULT_APPOINTMENT_DURATION_MINUTES);
  process.env.APPOINTMENT_DURATION_MINUTES = "not-a-number";
  assert.equal(getAppointmentDurationMinutes(), DEFAULT_APPOINTMENT_DURATION_MINUTES);
});

test("the end time is the start instant plus the duration in the appointment timezone", () => {
  delete process.env.APPOINTMENT_DURATION_MINUTES;
  // 10:00 in Asia/Kolkata is 04:30 UTC; +30 minutes is 05:00 UTC.
  assert.equal(
    getAppointmentEndTime(KOLKATA_APPOINTMENT).toISOString(),
    "2026-11-02T05:00:00.000Z"
  );
});

test("an appointment is finished only after its end time", () => {
  delete process.env.APPOINTMENT_DURATION_MINUTES;

  const beforeStart = new Date("2026-11-02T04:00:00.000Z");
  const midVisit = new Date("2026-11-02T04:45:00.000Z");
  const afterEnd = new Date("2026-11-02T05:00:00.000Z");

  assert.equal(isAppointmentFinished(KOLKATA_APPOINTMENT, beforeStart), false);
  assert.equal(isAppointmentFinished(KOLKATA_APPOINTMENT, midVisit), false);
  assert.equal(isAppointmentFinished(KOLKATA_APPOINTMENT, afterEnd), true);
});

test("cancelled and already completed appointments are never re-finished", () => {
  const afterEnd = new Date("2026-11-05T00:00:00.000Z");

  assert.equal(
    isAppointmentFinished({ ...KOLKATA_APPOINTMENT, status: "Cancelled" }, afterEnd),
    false
  );
  assert.equal(
    isAppointmentFinished({ ...KOLKATA_APPOINTMENT, status: "Completed" }, afterEnd),
    false
  );
});

test("unparseable dates and times are ignored", () => {
  const now = new Date("2026-11-05T00:00:00.000Z");

  assert.equal(isAppointmentFinished({ date: "", time: "10:00" }, now), false);
  assert.equal(isAppointmentFinished({ date: "not-a-date", time: "10:00" }, now), false);
  assert.equal(isAppointmentFinished({}, now), false);
  assert.equal(isAppointmentFinished(null, now), false);
});

test("the completion sweep only promotes finished appointments", async () => {
  delete process.env.APPOINTMENT_DURATION_MINUTES;

  const now = new Date("2026-11-03T12:00:00.000Z");
  const calls = { find: [], updateMany: [] };

  const model = {
    find(query) {
      calls.find.push(query);
      return {
        select() {
          return this;
        },
        async lean() {
          return [
            { _id: "finished", date: "2026-11-02", time: "10:00", timeZone: "Asia/Kolkata", status: "Upcoming" },
            { _id: "tomorrow", date: "2026-11-04", time: "10:00", timeZone: "Asia/Kolkata", status: "Upcoming" },
            { _id: "cancelled", date: "2026-11-01", time: "10:00", timeZone: "Asia/Kolkata", status: "Cancelled" },
          ];
        },
      };
    },
    async updateMany(filter, update, options) {
      calls.updateMany.push({ filter, update, options });
      return { modifiedCount: 1 };
    },
  };

  const completed = await completeFinishedAppointments({ now, model });

  assert.equal(completed, 1);
  assert.equal(calls.find.length, 1);
  // Only appointments dated up to the cutoff are scanned (timezone slack included).
  assert.equal(calls.find[0].status, "Upcoming");
  assert.ok(calls.find[0].date.$lte >= "2026-11-03");

  assert.equal(calls.updateMany.length, 1);
  const [{ filter, update, options }] = calls.updateMany;
  assert.deepEqual(filter._id.$in, ["finished"]);
  // The status guard prevents overwriting a concurrent cancellation.
  assert.equal(filter.status, "Upcoming");
  assert.equal(update.$set.status, "Completed");
  assert.equal(update.$set.completedAt, now);
  // Reminders for a finished visit must stop.
  assert.equal(update.$set["reminders.$[reminder].status"], "cancelled");
  assert.equal(update.$set["reminders.$[reminder].emailStatus"], "cancelled");
  assert.deepEqual(options.arrayFilters, [
    { "reminder.status": { $in: ["scheduled", "processing"] }, "reminder.emailStatus": "pending" },
  ]);
});

test("the sweep is scoped to one patient when a userId is supplied", async () => {
  const now = new Date("2026-11-05T00:00:00.000Z");
  const queries = [];

  const model = {
    find(query) {
      queries.push(query);
      return { select() { return this; }, async lean() { return []; } };
    },
    async updateMany() {
      throw new Error("updateMany should not be called when nothing finished");
    },
  };

  const completed = await completeFinishedAppointments({ now, userId: "user-1", model });

  assert.equal(completed, 0);
  assert.equal(queries[0].userId, "user-1");
  assert.equal(queries[0].status, "Upcoming");
});
