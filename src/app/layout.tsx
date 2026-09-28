import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif, JetBrains_Mono, Space_Grotesk } from "next/font/google";
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

export const metadata: Metadata = {
  title: `${brand.name} – Nyhedsbrevsværktøj`,
  description: `Nyhedsbrev-generator til ${brand.name}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="da"
      className={`${dmSans.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
