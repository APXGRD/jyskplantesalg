// src/app/api/send-test-mail/route.ts
//
// POST: sender det aktuelle nyhedsbrev som TEST-mail til én modtager (fx
// brugerens egen mail), så det kan ses i en rigtig indbakke, før det sendes
// ud til kunderne. Kun for indloggede brugere (requireUser).
//
// Sendes via Resend (https://resend.com) – et simpelt HTTP-API, ingen ekstra
// npm-pakke. Kræver i .env.local:
//   RESEND_API_KEY  – API-nøgle fra Resend (server-only, sendes aldrig til
//                     browseren).
//   TEST_MAIL_FROM  – valgfri afsender, fx "Jysk Plantesalg <nyhedsbrev@
//                     jeresdomæne.dk>" (domænet skal være verificeret hos
//                     Resend). Uden den bruges Resends testafsender
//                     "onboarding@resend.dev", som KUN kan sende til den
//                     mail, Resend-kontoen er oprettet med.
//
// HTML'en bygges i browseren af præcis samme kode som "Kopiér nyhedsbrev"
// (buildNewsletterHtml), så testmailen er identisk med det kopierede
// nyhedsbrev.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/requireUser";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Resend tillader op til 40 MB pr. mail; uploadede billeder ligger som
// base64 i selve HTML'en, så loftet her er generøst, men forhindrer
// urimeligt store forespørgsler.
const MAX_HTML_LENGTH = 15 * 1024 * 1024;
const DEFAULT_FROM = "Nyhedsbrev (test) <onboarding@resend.dev>";

interface SendTestMailBody {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (!user) return response;

  let body: SendTestMailBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON i request body" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!EMAIL_PATTERN.test(to)) {
    return NextResponse.json({ error: "Skriv en gyldig e-mailadresse." }, { status: 400 });
  }
  if (typeof body.html !== "string" || body.html.trim().length === 0) {
    return NextResponse.json({ error: "Nyhedsbrevet er tomt." }, { status: 400 });
  }
  if (body.html.length > MAX_HTML_LENGTH) {
    return NextResponse.json(
      { error: "Nyhedsbrevet er for stort til at sende (for mange/store uploadede billeder)." },
      { status: 413 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Test-mail er ikke sat op endnu: tilføj RESEND_API_KEY i .env.local (opret en gratis nøgle på resend.com) og genstart serveren.",
      },
      { status: 503 },
    );
  }

  const subjectText = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "Nyhedsbrev";
  const subject = `[TEST] ${subjectText}`.slice(0, 200);

  // Uploadede billeder (logo, billedblokke, egne galleri-billeder) ligger som
  // base64 data-URI'er direkte i HTML'en. Det gør mailen så stor, at Gmail
  // klipper den efter det første billede ("[Meddelelse klippet]" – kun
  // header/logo kommer med), og Gmail/Outlook viser slet ikke data-URI-
  // billeder. De trækkes derfor ud som indlejrede vedhæftninger (cid:), som
  // alle almindelige mailklienter viser, og HTML'en bliver lille.
  const { html: newsletterHtml, attachments } = extractInlineImages(body.html);

  // Et komplet HTML-dokument omkring nyhedsbrevets tabel, med en neutral
  // baggrund – som en rigtig nyhedsbrevs-mail.
  const html = `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f2;">
${newsletterHtml}
</body>
</html>`;

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.TEST_MAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text: typeof body.text === "string" ? body.text : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    });
    const result = await resendResponse.json().catch(() => null);
    if (!resendResponse.ok) {
      // Resends egen fejltekst (fx "You can only send testing emails to your
      // own email address") er den mest brugbare forklaring for brugeren.
      const message = typeof result?.message === "string" ? result.message : `Status ${resendResponse.status}`;
      console.error("Resend afviste test-mailen:", message);
      return NextResponse.json({ error: `Mailen kunne ikke sendes: ${message}` }, { status: 502 });
    }
    return NextResponse.json({ success: true, id: result?.id ?? null });
  } catch (err) {
    console.error("Kunne ikke kontakte Resend:", err);
    return NextResponse.json({ error: "Kunne ikke kontakte mailtjenesten. Prøv igen." }, { status: 502 });
  }
}

interface InlineAttachment {
  content: string;
  filename: string;
  content_type: string;
  content_id: string;
}

const DATA_URI_SRC_PATTERN = /src="data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)"/g;

// Erstatter hvert src="data:image/...;base64,..." med src="cid:…" og
// returnerer billederne som Resend-vedhæftninger med content_id (indlejrede
// billeder). Samme billede (fx logoet flere steder) vedhæftes kun én gang.
function extractInlineImages(html: string): { html: string; attachments: InlineAttachment[] } {
  const attachments: InlineAttachment[] = [];
  const idsByContent = new Map<string, string>();
  const replaced = html.replace(DATA_URI_SRC_PATTERN, (_match, mimeType: string, base64: string) => {
    const content = base64.replace(/\s/g, "");
    let contentId = idsByContent.get(content);
    if (!contentId) {
      contentId = `billede-${attachments.length + 1}`;
      idsByContent.set(content, contentId);
      const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg").replace("svg+xml", "svg") || "png";
      attachments.push({ content, filename: `${contentId}.${extension}`, content_type: mimeType, content_id: contentId });
    }
    return `src="cid:${contentId}"`;
  });
  return { html: replaced, attachments };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
