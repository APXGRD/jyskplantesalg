import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { ImagePlaceholderIcon, LeafIcon } from "@/components/icons";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";

interface NewsletterCardProps {
  result: GeneratedNewsletter;
  customerType: CustomerType;
  products: ShopifyProduct[];
  viewport: "desktop" | "mobil";
}

export function NewsletterCard({ result, customerType, products, viewport }: NewsletterCardProps) {
  const greeting = customerType === "erhverv" ? "Kære erhvervskunde," : "Kære privatkunde,";
  const audience = customerType === "erhverv" ? "registreret erhvervskunde" : "tilmeldt vores nyhedsbrev";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] transition-[width] ${
        viewport === "mobil" ? "w-[375px]" : "w-[600px]"
      }`}
    >
      <div className="flex items-center justify-center gap-3 bg-primary px-8 py-5">
        <LeafIcon className="h-6 w-6 text-white" />
        <span className="text-xs font-medium tracking-[0.1em] text-white uppercase">
          {mockShopData.storeName}
        </span>
      </div>

      <div className="flex flex-col px-8 py-7">
        <h2 className="font-serif text-[26px] leading-[1.2] text-ink">{result.heading}</h2>

        <p className="pt-5 text-[13px] leading-relaxed text-card-body-text">{greeting}</p>
        <p className="pt-5 text-[13px] leading-relaxed text-card-body-text">{result.bodyText}</p>

        <div className="mt-5 flex h-44 flex-col items-center justify-center gap-2 rounded-xl bg-surface-active">
          <ImagePlaceholderIcon className="h-9 w-9 text-ink-faint" />
          <p className="text-xs text-ink-faint">{result.image.altText}</p>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={`flex items-center justify-between px-4 py-3 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <div>
                <p className="text-xs font-medium text-ink">{product.title}</p>
                <p className="text-[11px] text-ink-muted">{product.productType}</p>
              </div>
              <p className="text-xs font-semibold text-ink">
                {formatPriceForCustomer(product.price, customerType)}
              </p>
            </div>
          ))}
        </div>

        <p className="pt-5 text-[13px] leading-relaxed text-card-body-text">
          Ønsker du at se planterne på stedet eller modtage et uforpligtende tilbud? Kontakt os
          direkte – vi rådgiver gerne om valg og placering.
        </p>

        <div className="flex justify-center pt-6">
          <a
            href={result.cta.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg bg-ink px-6 py-2.5 text-[13px] font-semibold text-white"
          >
            {result.cta.text} →
          </a>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 border-t border-border bg-card-footer px-8 py-5 text-center">
        <p className="text-[11px] text-ink-muted">
          Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890
        </p>
        <p className="text-[11px] text-ink-muted">Du modtager dette nyhedsbrev, fordi du er {audience}.</p>
        <a href="#" className="pt-1 text-[11px] text-ink underline">
          Afmeld nyhedsbrevet
        </a>
      </div>
    </div>
  );
}
