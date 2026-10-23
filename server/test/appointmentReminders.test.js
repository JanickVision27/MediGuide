import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentDateTimeToUtc,
  applyReminderPreferences,
  buildReminderSchedule,
  DEFAULT_REMINDER_OFFSETS,
  validateTimeZone,
} from "../src/services/appointmentReminders.js";
import Appointment from "../src/models/Appointment.js";
import InAppNotification from "../src/models/InAppNotification.js";

test("local appointment wall time converts to UTC using its saved timezone", () => {
  assert.equal(
    appointmentDateTimeToUtc("2026-12-25", "10:00", "Asia/Kolkata").toISOString(),
    "2026-12-25T04:30:00.000Z",
  );
});

test("default reminder schedule includes only trigger times still in the future", () => {
  const schedule = buildReminderSchedule({
    date: "2026-12-25",
    time: "10:00",
    timeZone: "Asia/Kolkata",
    now: new Date("2026-12-24T05:00:00.000Z"),
  });
  assert.deepEqual(schedule.map((item) => item.offsetMinutes), [120]);
  assert.equal(schedule[0].scheduledAt.toISOString(), "2026-12-25T02:30:00.000Z");
  assert.deepEqual(DEFAULT_REMINDER_OFFSETS, [1440, 120]);
});

test("disabled and duplicate reminder selections create no duplicate jobs", () => {
  const base = { date: "2026-12-25", time: "10:00", timeZone: "Asia/Kolkata", now: new Date("2026-12-24T00:00:00Z") };
  assert.deepEqual(buildReminderSchedule({ ...base, enabled: false }), []);
  const schedule = buildReminderSchedule({ ...base, offsetsMinutes: [120, 120, 60] });
  assert.deepEqual(schedule.map((item) => item.offsetMinutes), [120, 60]);
  assert.ok(schedule.every((item) => item.status === "scheduled" && item.scheduledAt instanceof Date));
});

test("invalid zones and nonexistent daylight-saving local times are rejected", () => {
  assert.equal(validateTimeZone("Not/A_Timezone"), false);
  assert.throws(() => appointmentDateTimeToUtc("2026-03-08", "02:30", "America/New_York"), /does not exist/);
});

test("disabling reminders cancels pending jobs and timing changes stay idempotent", () => {
  const appointment = {
    date: "2026-12-25",
    time: "10:00",
    timeZone: "Asia/Kolkata",
    reminders: buildReminderSchedule({
      date: "2026-12-25", time: "10:00", timeZone: "Asia/Kolkata",
      now: new Date("2026-12-24T00:00:00Z"),
    }),
  };
  const now = new Date("2026-12-24T00:00:00Z");
  applyReminderPreferences(appointment, { enabled: true, offsetsMinutes: [120] }, now);
  assert.equal(appointment.reminders.find((item) => item.offsetMinutes === 1440).status, "cancelled");
  assert.equal(appointment.reminders.filter((item) => item.offsetMinutes === 120 && item.status === "scheduled").length, 1);
  applyReminderPreferences(appointment, { enabled: true, offsetsMinutes: [120] }, now);
  assert.equal(appointment.reminders.filter((item) => item.offsetMinutes === 120 && item.status === "scheduled").length, 1);
  applyReminderPreferences(appointment, { enabled: false, offsetsMinutes: [120] }, now);
  assert.equal(appointment.reminders.find((item) => item.offsetMinutes === 120).status, "cancelled");
});

test("reminder jobs are persisted with appointments and in-app delivery is uniquely keyed", () => {
  assert.ok(Appointment.schema.path("reminders"));
  assert.ok(Appointment.schema.path("remindersInitialized"));
  assert.ok(Appointment.schema.path("readinessChecklist"));
  const uniqueReminderIndex = InAppNotification.schema.indexes().find(([keys, options]) =>
    keys.reminderId === 1 && options.unique === true,
  );
  assert.ok(uniqueReminderIndex);
});
