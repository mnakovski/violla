const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type BookingPayload = {
  customerName?: string;
  customerPhone?: string;
  contactLabel?: string;
  serviceMk?: string;
  details?: string;
  appointmentDate?: string;
  requestTime?: string;
  requestId?: string | number;
  origin?: string;
};

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const formatTelegramMessage = (payload: BookingPayload) => {
  const detailsText = payload.details ? ` ${escapeHtml(payload.details)}` : "";
  const requestId = payload.requestId ? String(payload.requestId) : "";
  const confirmUrl = payload.origin && requestId
    ? `${payload.origin.replace(/\/$/, "")}/admin?request_id=${encodeURIComponent(requestId)}`
    : null;

  const lines = [
    "🔔 <b>НОВО БАРАЊЕ!</b>",
    "",
    `👤 <b>Клиент:</b> ${escapeHtml(payload.customerName || "-")}`,
    `📞 <b>Тел:</b> ${escapeHtml(payload.customerPhone || "-")}`,
    `💬 <b>Контакт:</b> ${escapeHtml(payload.contactLabel || "-")}`,
    `💇 <b>Услуга:</b> ${escapeHtml(payload.serviceMk || "-")}${detailsText}`,
    `📅 <b>Датум:</b> ${escapeHtml(payload.appointmentDate || "-")}`,
    `⏰ <b>Време:</b> ${escapeHtml(payload.requestTime || "-")}`,
  ];

  if (confirmUrl) {
    lines.push("", `👇 <b>Кликни за потврда:</b>`, confirmUrl);
  }

  return lines.join("\n");
};

const sendAlertEmail = async (subject: string, html: string) => {
  const apiKey = Deno.env.get("AGENTMAIL_API_KEY");
  const inboxId = Deno.env.get("AGENTMAIL_INBOX_ID");
  const to = Deno.env.get("ALERT_EMAIL_TO");

  if (!apiKey || !inboxId || !to) {
    console.error("Email alert skipped, missing AGENTMAIL_API_KEY / AGENTMAIL_INBOX_ID / ALERT_EMAIL_TO");
    return;
  }

  const response = await fetch(`https://api.agentmail.to/inboxes/${inboxId}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject,
      text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to send alert email", response.status, text);
    return;
  }

  const resultText = await response.text();
  console.error("Alert email sent", resultText);
};

const emailHtml = ({ payload, errorMessage, stack }: { payload: BookingPayload; errorMessage: string; stack?: string }) => {
  const rows = [
    ["Клиент", payload.customerName || "-"],
    ["Телефон", payload.customerPhone || "-"],
    ["Контакт", payload.contactLabel || "-"],
    ["Услуга", payload.serviceMk || "-"],
    ["Детали", payload.details || "-"],
    ["Датум", payload.appointmentDate || "-"],
    ["Време", payload.requestTime || "-"],
    ["Request ID", payload.requestId ? String(payload.requestId) : "-"],
    ["Origin", payload.origin || "-"],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(value)}</td>
      </tr>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:720px;">
      <h2 style="margin:0 0 16px;">Violla staging error</h2>
      <p style="margin:0 0 8px;"><strong>Function:</strong> send-telegram-booking</p>
      <p style="margin:0 0 8px;"><strong>Time:</strong> ${escapeHtml(new Date().toISOString())}</p>
      <p style="margin:0 0 16px;"><strong>Error:</strong> ${escapeHtml(errorMessage)}</p>

      <h3 style="margin:24px 0 10px;">Request details</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">${rowsHtml}</table>

      <h3 style="margin:24px 0 10px;">Stack</h3>
      <pre style="white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e5e7eb;padding:12px;border-radius:8px;">${escapeHtml(stack || "n/a")}</pre>
    </div>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: BookingPayload = {};

  try {
    payload = await req.json();

    if (payload.customerName?.toLowerCase().includes("mail_test")) {
      await sendAlertEmail(
        "[Violla Prod] direct email alert test",
        emailHtml({ payload, errorMessage: "Direct production email test" }),
      );
      return new Response(JSON.stringify({ ok: false, error: "Direct production email test" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const botToken = requiredEnv("TELEGRAM_BOT_TOKEN");
    const chatId = requiredEnv("TELEGRAM_CHAT_ID");
    const telegramMessage = formatTelegramMessage(payload);

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const telegramJson = await telegramRes.json();

    if (!telegramRes.ok || !telegramJson?.ok) {
      throw new Error(`Telegram API error: ${telegramRes.status} ${JSON.stringify(telegramJson)}`);
    }

    return new Response(JSON.stringify({ ok: true, result: telegramJson.result }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("send-telegram-booking failed", { message, payload, stack });

    await sendAlertEmail(
      "[Violla Staging] send-telegram-booking failed",
      emailHtml({ payload, errorMessage: message, stack }),
    );

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
