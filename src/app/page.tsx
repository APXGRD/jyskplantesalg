import Link from "next/link";
import { fetchShopifyCustomers } from "@/lib/shopify/fetchCustomers";
import { getCustomerType, isActiveCustomer } from "@/lib/customers";
import { getBrandSettings } from "@/lib/brandSettings";
import { EditorialShell } from "@/components/EditorialShell";
import { ArrowRightIcon } from "@/components/icons";
import {
  PipelineCard,
  homeCardClassName,
  homeCardFooterClassName,
  homeCardHeaderClassName,
  homeCardLinkClassName,
  homeLabelClassName,
} from "./HomeClientParts";

export default async function HomePage() {
  // Firmanavn, farver, skrifttype og tone følger Indstillinger-siden, så en
  // anden virksomhed kan bruge appen under sit eget navn.
  const settings = await getBrandSettings();
  const companyName = settings.company_name.trim();

  // Kundetallet SKAL være det rigtige, aktuelle antal – samme kilde
  // (fetchShopifyCustomers) og samme "aktiv"-definition (isActiveCustomer),
  // som Kunder-siden bruger. Fejler hentningen (Shopify midlertidigt
  // utilgængelig osv.), falder tallene roligt tilbage til 0 i stedet for at
  // vælte hele forsiden.
  let activeCustomerCount = 0;
  let activeB2bCount = 0;
  try {
    const activeCustomers = (await fetchShopifyCustomers()).filter(isActiveCustomer);
    activeCustomerCount = activeCustomers.length;
    activeB2bCount = activeCustomers.filter((customer) => getCustomerType(customer) === "erhverv").length;
  } catch (err) {
    console.error("Kunne ikke hente kunder fra Shopify:", err);
  }
  const activeB2cCount = activeCustomerCount - activeB2bCount;

  // Fordelingsbjælken: andelen af privatkunder blandt de aktive modtagere.
  const b2cPercent = activeCustomerCount ? Math.round((activeB2cCount / activeCustomerCount) * 100) : 0;
  const b2bPercent = activeCustomerCount ? 100 - b2cPercent : 0;
  const brandTone = settings.brand_tone.trim();

  return (
    <EditorialShell active="home">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 pb-16 md:px-12">
        <div className="border-b border-hairline pt-8 pb-10">
          <h1
            className={`font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-forest wrap-break-word md:text-4xl md:leading-[1.25] ${
              companyName ? "" : "opacity-30"
            }`}
          >
            {companyName || "Logo"}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 py-10 lg:grid-cols-3">
          <div className={homeCardClassName}>
            <div>
              <div className={homeCardHeaderClassName}>
                <h2 className={homeLabelClassName}>01. Kundedatabase</h2>
              </div>
              <div className="pt-6 pb-4">
                <div className="font-garamond text-[2.5rem] leading-none tracking-tight text-forest md:text-[3.5rem]">
                  {activeCustomerCount}
                </div>
                <p className="pt-3 text-sm leading-relaxed text-stone">
                  Aktive modtagere. Fordelt på{" "}
                  <span className="font-medium text-ink-deep">{activeB2bCount} erhvervskunder (B2B)</span> og{" "}
                  <span className="font-medium text-ink-deep">{activeB2cCount} privatkunder (B2C)</span>.
                </p>
              </div>
              <div className="my-2 flex h-1.5 w-full overflow-hidden rounded-full bg-track">
                <div className="h-full bg-forest" style={{ width: `${b2cPercent}%` }} title={`B2C: ${b2cPercent}%`} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone">
                <span>Privat: {b2cPercent}%</span>
                <span>Erhverv: {b2bPercent}%</span>
              </div>
            </div>
            <div className={homeCardFooterClassName}>
              <Link href="/kunder" className={homeCardLinkClassName}>
                Administrér kunder
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <PipelineCard />

          <div className={homeCardClassName}>
            <div>
              <div className={homeCardHeaderClassName}>
                <h2 className={homeLabelClassName}>03. Brand identitet</h2>
              </div>
              <div className="space-y-4 pt-6">
                <div>
                  <span className="block text-[10px] font-semibold tracking-wider text-stone uppercase">Typografi</span>
                  <p className="mt-0.5 text-sm font-medium text-ink-deep">
                    {settings.primary_font || "Ingen skrifttype valgt"}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold tracking-wider text-stone uppercase">Tone &amp; stemme</span>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone">{brandTone || "Ingen tone-of-voice angivet."}</p>
                </div>
                <div>
                  <span className="mb-2 block text-[10px] font-semibold tracking-wider text-stone uppercase">Farvepalet</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {settings.brand_colors.map((color, index) => (
                      <div
                        key={`${color}-${index}`}
                        title={color}
                        className="h-7 w-7 rounded-sm border border-hairline"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span className="ml-1.5 font-mono text-[11px] text-stone">
                      {settings.brand_colors.length} {settings.brand_colors.length === 1 ? "farve" : "farver"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={homeCardFooterClassName}>
              <Link href="/indstillinger" className={homeCardLinkClassName}>
                Tilpas indstillinger
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </EditorialShell>
  );
}
