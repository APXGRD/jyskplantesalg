import { brand } from "@/config/brand";

interface LogoProps {
  className?: string;
  // aria-label-teksten. Default = app'ens EGET, statiske firmanavn
  // (brand.ts) – Logo bruges primært i app-chrome (Sidebar, landingsside),
  // som bevidst IKKE er styret af kundens brand-indstillinger. NewsletterCard
  // (nyhedsbrevets EGEN header) er den ENESTE bruger, der giver et dynamisk
  // navn eksplicit via denne prop, hentet fra useBrandSettings() dér – Logo
  // selv kender intet til Supabase.
  name?: string;
}

// Logoet er en fil (public/logo.svg, se brand.logoPath) i stedet for en
// inline <svg> (som det tidligere var, som LeafIcon i icons.tsx) – men skal
// stadig kunne arve sin farve fra den omgivende kontekst, ligesom
// LeafIcon's `stroke="currentColor"` gjorde (fx hvid på et mørkegrønt
// badge, men automatisk MØRK, hvis brugeren vælger en lys header-baggrund i
// NewsletterCard, jf. getContrastTextColor). Et almindeligt <img> kan ikke
// arve `color` fra CSS, så logoet renders i stedet som en CSS-maske: en
// <span> fyldes med `currentColor` og "stemples ud" i logo.svg's silhuet –
// den ser dermed nøjagtig ud som før, uanset hvilken farve-kontekst den står
// i, men peger på selve logo-FILEN i stedet for en hardcodet SVG i koden.
//
// logoPath er altid den statiske sti fra brand.ts – der er ingen kolonne for
// den i settings-tabellen.
export function Logo({ className, name = brand.name }: LogoProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${brand.logoPath})`,
        maskImage: `url(${brand.logoPath})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
