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

const emailHtml = ({ payload, errorMessage, stack }: { payload: BookingPayload; errorMessage: string; stack?: string }) => `
  <h2>Violla staging error: send-telegram-booking</h2>
  <p><strong>Time:</strong> ${new Date().toISOString()}</p>
  <p><strong>Error:</strong> ${escapeHtml(errorMessage)}</p>
  <p><strong>Stack:</strong><br/><pre>${escapeHtml(stack || "n/a")}</pre></p>
  <p><strong>Payload:</strong><br/><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></p>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: BookingPayload = {};

  try {
    payload = await req.json();

    if (payload.customerName?.toLowerCase().includes("mail only test")) {
      await sendAlertEmail(
        "[Violla Staging] direct email alert test",
        emailHtml({ payload, errorMessage: "Direct staging email test" }),
      );
      return new Response(JSON.stringify({ ok: false, error: "Direct staging email test" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (payload.customerName?.toLowerCase().includes("fail email test")) {
      throw new Error("Intentional staging failure for email alert test");
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
