// src/config/brand.ts
//
// De faktiske branding-værdier (navn, farver, tone) bor nu i Supabases
// settings-tabel, redigerbar via Indstillinger-siden (se
// src/context/BrandSettingsContext.tsx for klientsiden og
// src/lib/brandSettings.ts for serversiden). DENNE fil er kun tilbage som
// FALLBACK/standardværdi, hvis Supabase-kaldet skulle fejle, eller som
// synkron startværdi, før den første hentning når at blive færdig (root-
// layoutet kan ikke vente på en async fetch før første render).
//
// logoPath har ingen kolonne i settings-tabellen (kun company_name/
// brand_colors/brand_tone/primary_font er redigerbare) og forbliver derfor
// altid netop denne statiske sti.
//
// colors er en FLEKSIBEL liste (2-5 farver, matcher brand_colors-kolonnen) –
// colors[0]/colors[1] bruges som "primær"/"sekundær" alle de steder, app'ens
// EGEN branding (Logo, Sidebar-badge, "Kom i gang"-knap, nyhedsbrevets
// header-baggrund) kun har brug for netop de to; hele arrayet bruges direkte
// af Edit-mode's farve-swatches (ColorSwatches.tsx).
//
// primaryFont er FONT_FAMILIES' label (fx "Georgia"), ikke selve CSS-
// font-family-værdien – samme kontrakt som settings-tabellens primary_font-
// kolonne, se @/lib/fontFamilies.
export const brand = {
  name: "Jysk Plantesalg",
  colors: ["#9caf88", "#2f5233"],
  logoPath: "/logo.svg",
  tone: "vidende, professionel og jordnær – med fokus på kvalitet og ekspertise i store solitærtræer",
  primaryFont: "Georgia",
};

export type Brand = typeof brand;
