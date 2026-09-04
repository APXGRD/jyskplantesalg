// src/app/api/shopify/auth/route.ts
//
// Trin 1 af Shopify OAuth: sender butiksadmin videre til Shopifys godkendelsesside.
// Besøg /api/shopify/auth i browseren for at starte flowet.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SCOPES = "read_products,read_customers,write_customers";

export async function GET(_req: NextRequest) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;

  if (!shop || !clientId || !redirectUri) {
    return new NextResponse(
      "Mangler SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID eller SHOPIFY_REDIRECT_URI i .env.local",
      { status: 500 }
    );
  }

  // Tilfældig state-værdi, der bekræfter senere, at redirectet fra Shopify er ægte
  // (beskytter mod CSRF-angreb).
  const state = crypto.randomBytes(16).toString("hex");

  const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", SCOPES);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutter er rigeligt til at nå godkendelsen
    path: "/",
  });
  return response;
}