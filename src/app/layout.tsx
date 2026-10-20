import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { DM_Sans, EB_Garamond, Instrument_Serif, JetBrains_Mono, Libre_Baskerville, Space_Grotesk } from "next/font/google";
import { ClientOnlyNewsletterProvider } from "@/context/ClientOnlyNewsletterProvider";
import { BrandSettingsProvider } from "@/context/BrandSettingsContext";
import { brand } from "@/config/brand";
import "./globals.css";

// --primary/--secondary er app'ens EGET, faste UI-tema (Sidebar-badge,
// knapper på tværs af alle sider, landingssidens "Kom i gang" osv.) – IKKE
// styret af kundens brand-indstillinger i Supabase. De sættes derfor
// udelukkende ud fra brand.ts's statiske værdier, permanent (samme mønster
// som globals.css's egne :root-fallback-værdier). Selve nyhedsbrevets
// styling (Edit-mode's farve-swatches, NewsletterCard, den kopierede HTML)
// læser i stedet Supabase direkte via useBrandSettings() – se
// BrandSettingsContext.tsx.
const brandColorVariables = {
  "--primary": brand.colors[0],
  "--secondary": brand.colors[1],
} as CSSProperties;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

// Opsætning-sidens "industrial" redesign (Stitch) – bruges via font-grotesk/
// font-jetbrains, ikke som app'ens standard-skrifttype.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Figma-redesignet (JYSK PLANTESALG) – bruges via font-baskerville.
const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: "400",
});

// Stitch-redesignet (forsiden) – bruges via font-garamond.
const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

// Appens eget navn i browser-fanen – ikke brand.ts's hardcodede firmanavn.
export const metadata: Metadata = {
  title: "Nyhedsbrev generator",
  description: "Generér, redigér og kopiér nyhedsbreve ud fra jeres produkter",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="da"
      className={`${dmSans.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${libreBaskerville.variable} ${ebGaramond.variable} h-full antialiased`}
      style={brandColorVariables}
    >
      <body className="min-h-full flex flex-col">
        <BrandSettingsProvider>
          <ClientOnlyNewsletterProvider>{children}</ClientOnlyNewsletterProvider>
        </BrandSettingsProvider>
      </body>
    </html>
  );
}
