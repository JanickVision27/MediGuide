import { Resend } from "resend";
import { appointmentDateTimeToUtc } from "./appointmentReminders.js";

let resendClient;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

function getRequiredMailFrom() {
  const from = process.env.MAIL_FROM?.trim();
  if (!from) {
    throw new Error(
      "MAIL_FROM is required for email notifications. Use a sender on your verified Resend domain."
    );
  }
  return from;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function displayDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function displayTime(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  const parsed = new Date(Date.UTC(2000, 0, 1, hours, minutes));
  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function detailRow(label, value) {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:14px;font-weight:600;width:130px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:14px;line-height:1.5;">${escapeHtml(value)}</td>
  </tr>`;
}

export function getPasswordResetAppUrl() {
  const configured = process.env.APP_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isPasswordResetEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
    process.env.MAIL_FROM?.trim() &&
    getPasswordResetAppUrl()
  );
}

export function getMissingPasswordResetEmailConfiguration() {
  const missing = [];
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.MAIL_FROM?.trim()) missing.push("MAIL_FROM");
  if (!getPasswordResetAppUrl()) missing.push("APP_URL");
  return missing;
}

export function safeEmailProviderFailure(error) {
  const rawCode = error?.providerCode || error?.code || error?.name;
  const code = typeof rawCode === "string" && rawCode.length <= 32 &&
    /^[a-z][a-z0-9_-]*$/i.test(rawCode) && !/^[a-z0-9_-]{43}$/i.test(rawCode)
    ? rawCode
    : "provider_error";
  const statusCode = Number.isInteger(error?.providerStatusCode)
    ? error.providerStatusCode
    : Number.isInteger(error?.statusCode)
      ? error.statusCode
      : undefined;
  return { providerCode: code, ...(statusCode ? { providerStatusCode: statusCode } : {}) };
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresInMinutes }) {
  const resend = getResendClient();
  if (!resend || !getPasswordResetAppUrl()) return { skipped: true };
  const from = getRequiredMailFrom();
  const safeUrl = escapeHtml(resetUrl);
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:32px;border:1px solid #dbe4ef;border-radius:16px;color:#142b4a"><h1 style="color:#1769aa">MediGuide</h1><h2>Reset your password</h2><p>We received a request to reset the password for your MediGuide account. Use the button below within ${expiresInMinutes} minutes.</p><p><a href="${safeUrl}" style="display:inline-block;background:#1769aa;color:white;padding:12px 20px;border-radius:10px;text-decoration:none">Reset password</a></p><p>If you did not request this, you can ignore this email.</p><p style="font-size:12px;color:#64748b">MediGuide is an educational demo. Use synthetic information only.</p></div>`;
  const result = await resend.emails.send({
    from,
    to,
    subject: "Reset your MediGuide password",
    html,
    text: `Reset your MediGuide password within ${expiresInMinutes} minutes: ${resetUrl}\n\nIf you did not request this, ignore this email.`,
  });
  if (result.error) {
    const error = new Error("Resend rejected the password reset email.");
    Object.assign(error, safeEmailProviderFailure({
      providerCode: result.error.name || result.error.code,
      providerStatusCode: result.error.statusCode,
    }));
    throw error;
  }
  if (!result.data?.id) {
    const error = new Error("Resend acceptance could not be confirmed.");
    error.providerCode = "acceptance_unconfirmed";
    throw error;
  }
  return { accepted: true };
}

export function isAppointmentReminderEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
    process.env.MAIL_FROM?.trim() &&
    getPasswordResetAppUrl()
  );
}

export async function sendAppointmentReminder({ to, appointment, offsetMinutes, idempotencyKey }) {
  const resend = getResendClient();
  const appUrl = getPasswordResetAppUrl();
  if (!resend || !appUrl) return { skipped: true };
  const startsAt = appointmentDateTimeToUtc(appointment.date, appointment.time, appointment.timeZone);
  const formattedWhen = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: appointment.timeZone,
  }).format(startsAt);
  const hospital = appointment.hospital?.name || "your selected hospital";
  const address = [appointment.hospital?.address, appointment.hospital?.city, appointment.hospital?.state]
    .filter(Boolean)
    .join(", ");
  const period = offsetMinutes % 1440 === 0
    ? `${offsetMinutes / 1440} day${offsetMinutes === 1440 ? "" : "s"}`
    : offsetMinutes % 60 === 0
      ? `${offsetMinutes / 60} hour${offsetMinutes === 60 ? "" : "s"}`
      : `${offsetMinutes} minutes`;
  const appointmentsUrl = `${appUrl}/appointments`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:32px;border:1px solid #dbe4ef;border-radius:16px;color:#142b4a"><h1 style="color:#1769aa">MediGuide appointment reminder</h1><p>Your appointment is coming up in ${period}.</p><p><strong>${escapeHtml(appointment.doctor)}</strong>${appointment.specialty ? ` · ${escapeHtml(appointment.specialty)}` : ""}<br>${escapeHtml(formattedWhen)}<br>${escapeHtml(hospital)}${address ? `<br>${escapeHtml(address)}` : ""}</p><p><a href="${escapeHtml(appointmentsUrl)}">View your appointments</a></p><p style="font-size:12px;color:#64748b">MediGuide is an educational demo. This is not a clinical reminder service.</p></div>`;
  const result = await resend.emails.send({
    from: getRequiredMailFrom(),
    to,
    subject: "MediGuide appointment reminder",
    html,
    text: `Your appointment is coming up in ${period}.\n${appointment.doctor}${appointment.specialty ? ` · ${appointment.specialty}` : ""}\n${formattedWhen}\n${hospital}${address ? `, ${address}` : ""}\nView your appointments: ${appointmentsUrl}\n\nMediGuide is an educational demo, not a clinical reminder service.`,
  }, { idempotencyKey });
  if (result.error) {
    const error = new Error("Resend rejected the appointment reminder.");
    Object.assign(error, safeEmailProviderFailure({
      providerCode: result.error.name || result.error.code,
      providerStatusCode: result.error.statusCode,
    }));
    throw error;
  }
  if (!result.data?.id) {
    const error = new Error("Resend acceptance could not be confirmed.");
    error.providerCode = "acceptance_unconfirmed";
    throw error;
  }
  return { accepted: true };
}

/**
 * Sends a demo appointment-saved notification to the session-derived patient
 * email. Delivery requires RESEND_API_KEY and a MAIL_FROM sender on a verified
 * Resend domain. Missing keys skip delivery; failures never affect booking.
 */
export async function sendAppointmentConfirmation({
  to,
  patientName,
  doctor,
  specialty,
  hospital,
  date,
  time,
  reason,
}) {
  const resend = getResendClient();
  if (!resend) return { skipped: true };

  const from = getRequiredMailFrom();
  const formattedDate = displayDate(date);
  const formattedTime = displayTime(time);
  const hospitalLocation = hospital
    ? [hospital.address, hospital.city, hospital.state].filter(Boolean).join(", ")
    : "";

  const detailRows = [
    detailRow("Doctor", doctor),
    detailRow("Specialty", specialty),
    hospital?.name ? detailRow("Hospital", hospital.name) : "",
    hospitalLocation ? detailRow("Hospital location", hospitalLocation) : "",
    detailRow("Date", formattedDate),
    detailRow("Time", formattedTime),
    reason ? detailRow("Reason", reason) : "",
  ].join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appointment Saved</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">MediGuide</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your Demo Appointment is Saved</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hi <strong>${escapeHtml(patientName)}</strong>,</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                Your demo appointment has been saved in MediGuide. Here are the details:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                You can review or cancel this demo record from your MediGuide dashboard.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} MediGuide · Educational demo only. This email does not confirm a real doctor or hospital appointment.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${patientName},`,
    "",
    "Your demo appointment has been saved in MediGuide.",
    `Doctor: ${doctor}`,
    `Specialty: ${specialty}`,
    hospital?.name ? `Hospital: ${hospital.name}` : "",
    hospitalLocation ? `Hospital location: ${hospitalLocation}` : "",
    `Date: ${formattedDate}`,
    `Time: ${formattedTime}`,
    reason ? `Reason: ${reason}` : "",
    "",
    "Educational demo only. This is not a real doctor or hospital appointment confirmation.",
  ].filter((line) => line !== "").join("\n");

  const result = await resend.emails.send({
    from,
    to,
    subject: "Appointment Saved – MediGuide Demo",
    html,
    text,
  });

  // The Resend SDK reports many API failures in its resolved result instead of
  // throwing. Convert those to errors so the controller's catch handler logs them.
  if (result.error) {
    throw new Error(result.error.message || "Resend could not send the notification.");
  }

  return result;
}
