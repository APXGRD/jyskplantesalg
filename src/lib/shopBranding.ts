// Statisk brand-konfiguration for Jysk Plantesalg – IKKE mock-produktdata,
// bare butiksnavn og tone-of-voice, brugt i AI-prompten og selve
// nyhedsbrevets header/footer. Var tidligere en del af mockShopData i
// mockShopifyData.ts, men er reelt uafhængig af, om produktdata kommer fra
// mock eller Shopify – derfor sit eget lille sted.
export const shopBranding = {
  storeName: "Jysk Plantesalg",
  brandTone:
    "vidende, professionel og jordnær – med fokus på kvalitet og ekspertise i store solitærtræer",
};
