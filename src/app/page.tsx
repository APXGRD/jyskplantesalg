import Link from "next/link";
import { fetchShopifyCustomers } from "@/lib/shopify/fetchCustomers";
import { getCustomerType, isActiveCustomer } from "@/lib/customers";
import { getBrandSettings } from "@/lib/brandSettings";
import { SectionLabel, StitchShell } from "@/components/StitchShell";
import { PipelineCard, QuickActions } from "./HomeClientParts";

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

  const cardClassName =
    "group flex flex-col justify-between rounded-lg border border-[#e4e4e7] bg-[#fafafa]/60 p-5 transition-colors hover:border-zinc-400";
  const cardLinkClassName =
    "inline-flex items-center gap-1 font-jetbrains text-[11px] font-bold text-black uppercase transition-transform group-hover:translate-x-0.5";

  return (
    <StitchShell active="home">
      <div className="grid flex-1 grid-cols-1 divide-y divide-[#e4e4e7] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        <main className="flex flex-col justify-between space-y-10 bg-white bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-size-[32px_32px] p-4 sm:p-6 md:p-10 lg:col-span-8">
          <div className="border-b border-[#e4e4e7] pb-8">
            <div className="mb-3 font-jetbrains text-[11px] tracking-wider text-[#71717A] uppercase">
              Nyhedsbrev-generator
            </div>
            <h1
              className={`text-5xl leading-none font-black tracking-tight wrap-break-word uppercase md:text-6xl ${
                companyName ? "text-black" : "text-black/25"
              }`}
            >
              {companyName || "Logo"}
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/opsaetning"
                className="inline-flex items-center gap-3 rounded bg-black px-7 py-3.5 font-jetbrains text-xs font-bold tracking-wider text-white uppercase shadow-md transition-all hover:bg-zinc-800 hover:shadow-lg active:translate-y-0.5"
              >
                Kom i gang (start generering)
                <span className="text-sm font-normal">→</span>
              </Link>
              <Link
                href="/kunder"
                className="inline-flex items-center rounded border border-zinc-300 bg-white px-5 py-3.5 font-jetbrains text-xs font-semibold tracking-wider text-zinc-900 uppercase transition-colors hover:bg-zinc-50"
              >
                Gå til kunder
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-3">
            <div className={cardClassName}>
              <div>
                <span className="flex items-center gap-1.5 font-jetbrains text-[11px] font-bold tracking-wider text-zinc-900 uppercase">
                  <span className="h-1.5 w-1.5 bg-black" />
                  01. Kundedatabase
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="font-jetbrains text-4xl font-extrabold tracking-tight text-black">
                    {activeCustomerCount}
                  </div>
                  <div className="text-xs font-medium text-zinc-500">Aktive kunder</div>
                </div>
                <p className="mt-3 text-xs leading-normal text-zinc-500">
                  Fordelt på {activeB2bCount} erhvervskunder (B2B) og {activeB2cCount} privatkunder (B2C).
                </p>
              </div>
              <div className="mt-5 border-t border-dashed border-zinc-200 pt-4">
                <Link href="/kunder" className={cardLinkClassName}>
                  Administrér →
                </Link>
              </div>
            </div>

            <PipelineCard />

            <div className={cardClassName}>
              <div>
                <span className="flex items-center gap-1.5 font-jetbrains text-[11px] font-bold tracking-wider text-zinc-900 uppercase">
                  <span className="h-1.5 w-1.5 bg-black" />
                  03. Brand identitet
                </span>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {settings.brand_colors.map((color, index) => (
                    <div
                      key={`${color}-${index}`}
                      title={color}
                      className="h-6 w-6 rounded-sm border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-xs font-medium text-zinc-800">{settings.primary_font}</span>
                  <p className="mt-1 text-xs text-zinc-500">
                    {settings.brand_tone.trim() ? `Tone: ${settings.brand_tone.trim()}` : "Ingen tone-of-voice angivet."}
                  </p>
                </div>
              </div>
              <div className="mt-5 border-t border-dashed border-zinc-200 pt-4">
                <Link href="/indstillinger" className={cardLinkClassName}>
                  Tilpas →
                </Link>
              </div>
            </div>
          </div>
        </main>

        <aside className="bg-[#fcfcfd] p-4 sm:p-6 md:p-8 lg:col-span-4">
          <div className="border-t border-[#e4e4e7] pt-6">
            <div className="mb-3">
              <SectionLabel>Hurtige handlinger</SectionLabel>
            </div>
            <QuickActions />
          </div>
        </aside>
      </div>
    </StitchShell>
  );
}
