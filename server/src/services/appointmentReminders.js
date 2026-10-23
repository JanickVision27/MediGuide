export const SUPPORTED_REMINDER_OFFSETS = Object.freeze([1440, 120, 60, 30]);
export const DEFAULT_REMINDER_OFFSETS = Object.freeze([1440, 120]);

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
}

export function appointmentDateTimeToUtc(date, time, timeZone = "Asia/Kolkata") {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = zonedParts(new Date(candidate), timeZone);
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const difference = desired - represented;
    if (difference === 0) break;
    candidate += difference;
  }

  const check = zonedParts(new Date(candidate), timeZone);
  if (check.year !== year || check.month !== month || check.day !== day || check.hour !== hour || check.minute !== minute) {
    throw new RangeError("Appointment time does not exist in the selected timezone.");
  }
  return new Date(candidate);
}

export function buildReminderSchedule({ date, time, timeZone, offsetsMinutes = DEFAULT_REMINDER_OFFSETS, enabled = true, now = new Date() }) {
  if (!enabled) return [];
  const appointmentAt = appointmentDateTimeToUtc(date, time, timeZone);
  return [...new Set(offsetsMinutes)]
    .filter((offset) => SUPPORTED_REMINDER_OFFSETS.includes(offset))
    .map((offsetMinutes) => ({
      offsetMinutes,
      scheduledAt: new Date(appointmentAt.getTime() - offsetMinutes * 60_000),
      status: "scheduled",
      inAppStatus: "pending",
      emailStatus: "pending",
    }))
    .filter((reminder) => reminder.scheduledAt > now);
}

export function applyReminderPreferences(appointment, { enabled, offsetsMinutes }, now = new Date()) {
  appointment.reminderPreferences = { enabled, offsetsMinutes };
  appointment.remindersInitialized = true;

  for (const reminder of appointment.reminders) {
    const canCancel = reminder.status === "scheduled" ||
      (reminder.status === "processing" && reminder.emailStatus === "pending");
    if (!canCancel) continue;
    if (!enabled || !offsetsMinutes.includes(reminder.offsetMinutes)) {
      reminder.status = "cancelled";
      reminder.inAppStatus = "cancelled";
      if (reminder.emailStatus === "pending") reminder.emailStatus = "cancelled";
    }
  }

  if (!enabled) return appointment.reminders;

  const nextSchedules = buildReminderSchedule({
    date: appointment.date,
    time: appointment.time,
    timeZone: appointment.timeZone,
    offsetsMinutes,
    enabled,
    now,
  });
  for (const next of nextSchedules) {
    const existing = appointment.reminders.find((reminder) =>
      reminder.offsetMinutes === next.offsetMinutes &&
      ["scheduled", "processing", "processed"].includes(reminder.status),
    );
    if (existing) continue;
    const cancelled = appointment.reminders.filter((reminder) =>
      reminder.offsetMinutes === next.offsetMinutes && reminder.status === "cancelled",
    );
    for (const reminder of cancelled) {
      if (typeof appointment.reminders.pull === "function") appointment.reminders.pull(reminder._id);
      else appointment.reminders.splice(appointment.reminders.indexOf(reminder), 1);
    }
    appointment.reminders.push(next);
  }
  return appointment.reminders;
}

export function validateTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}
