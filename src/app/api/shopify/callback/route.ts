// src/app/api/shopify/callback/route.ts
//
// Trin 2 af Shopify OAuth: modtager koden fra Shopify, bekræfter at kaldet er ægte,
// og bytter koden til en permanent access token. Token'en gemmes IKKE automatisk
// nogen steder — den vises kun på skærmen til manuel kopiering ind i .env.local,
// siden hele flowet kun skal køres denne ene gang.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBrandSettings } from "@/lib/brandSettings";

export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse("Mangler SHOPIFY_CLIENT_ID eller SHOPIFY_CLIENT_SECRET i .env.local", {
      status: 500,
    });
  }

  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const cookieState = req.cookies.get("shopify_oauth_state")?.value;

  if (!shop || !code) {
    return new NextResponse("Mangler shop eller code i redirectet fra Shopify.", { status: 400 });
  }

  // 1. Bekræft at state matcher den, vi selv satte i trin 1 (CSRF-beskyttelse).
  if (!stateParam || stateParam !== cookieState) {
    return new NextResponse(
      "State matcher ikke — godkendelsen kan ikke bekræftes som ægte. Start forfra fra /api/shopify/auth.",
      { status: 400 },
    );
  }

  // 2. Bekræft HMAC-signaturen, så vi ved kaldet reelt kommer fra Shopify.
  const hmac = searchParams.get("hmac") ?? "";
  const params: string[] = [];
  searchParams.forEach((value, key) => {
    if (key !== "hmac" && key !== "signature") params.push(`${key}=${value}`);
  });
  params.sort();
  const message = params.join("&");
  const digest = crypto.createHmac("sha256", clientSecret).update(message).digest("hex");

  const validHmac =
    digest.length === hmac.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));

  if (!validHmac) {
    return new NextResponse(
      "Kunne ikke bekræfte, at kaldet reelt kommer fra Shopify (HMAC matcher ikke).",
      { status: 400 },
    );
  }

  // 3. Byt den engangs-kode til en rigtig, permanent access token.
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    return new NextResponse(
      "Shopify afviste at udstede en access token. Start forfra fra /api/shopify/auth.",
      { status: 400 },
    );
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string; scope?: string };
  const accessToken = tokenJson.access_token;
  const scope = tokenJson.scope ?? "ukendt";

  if (!accessToken) {
    return new NextResponse("Intet access token modtaget fra Shopify.", { status: 400 });
  }

  const brandSettings = await getBrandSettings();

  const html = `<!doctype html>
<html lang="da"><head><meta charset="utf-8"><title>Shopify forbundet</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#f7f5f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}
  .card{max-width:560px;background:#fff;border-radius:14px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,0.08);}
  h1{font-size:18px;margin:0 0 12px;color:${brandSettings.brand_colors[1] ?? brandSettings.brand_colors[0]};}
  p{font-size:14px;color:#444;line-height:1.6;}
  code{display:block;background:#f1efe8;padding:14px;border-radius:8px;word-break:break-all;font-size:13px;margin:16px 0;}
</style></head>
<body><div class="card">
  <h1>&#10003; Butik forbundet: ${shop}</h1>
  <p>Kopiér token'en herunder ind i din <code>.env.local</code> som <strong>SHOPIFY_ACCESS_TOKEN</strong>:</p>
  <code>${accessToken}</code>
  <p>Godkendte scopes: ${scope}</p>
  <p>Denne side gemmer ikke selv token'en nogen steder — kopiér den nu, du kan ikke se den igen her.</p>
</div></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
