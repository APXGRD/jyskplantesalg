import type { ReactNode } from "react";
import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { ImagePlaceholderIcon, LeafIcon } from "@/components/icons";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import type { BlockId } from "@/lib/newsletterBlocks";

interface NewsletterCardProps {
  result: GeneratedNewsletter;
  customerType: CustomerType;
  products: ShopifyProduct[];
  viewport: "desktop" | "mobil";
  order: BlockId[];
}

export function NewsletterCard({ result, customerType, products, viewport, order }: NewsletterCardProps) {
  const greeting = customerType === "erhverv" ? "Kære erhvervskunde," : "Kære privatkunde,";
  const audience = customerType === "erhverv" ? "registreret erhvervskunde" : "tilmeldt vores nyhedsbrev";

  function renderBlock(id: BlockId): ReactNode {
    switch (id) {
      case "header":
        return (
          <div className="flex items-center justify-center gap-3 bg-primary px-8 py-5">
            <LeafIcon className="h-6 w-6 text-white" />
            <span className="text-xs font-medium tracking-[0.1em] text-white uppercase">
              {mockShopData.storeName}
            </span>
          </div>
        );

      case "overskrift":
        return (
          <div className="px-8 py-3">
            <div
              className="font-serif text-[26px] leading-[1.2] text-ink [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: result.heading }}
            />
          </div>
        );

      case "brodtekst":
        return (
          <div className="flex flex-col gap-5 px-8 py-3">
            <p className="text-[13px] leading-relaxed text-card-body-text">{greeting}</p>
            <div
              className="text-[13px] leading-relaxed text-card-body-text [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: result.bodyText }}
            />
            <p className="text-[13px] leading-relaxed text-card-body-text">
              Ønsker du at se planterne på stedet eller modtage et uforpligtende tilbud? Kontakt os
              direkte – vi rådgiver gerne om valg og placering.
            </p>
          </div>
        );

      case "billede":
        return (
          <div className="px-8 py-3">
            <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl bg-surface-active">
              <ImagePlaceholderIcon className="h-9 w-9 text-ink-faint" />
              <p className="text-xs text-ink-faint">{result.image.altText}</p>
            </div>
          </div>
        );

      case "produktvisning":
        return (
          <div className="px-8 py-3">
            <div className="overflow-hidden rounded-xl border border-border">
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
          </div>
        );

      case "skillelinje":
        return (
          <div className="px-8 py-3">
            <hr className="border-t border-border" />
          </div>
        );

      case "cta":
        return (
          <div className="flex justify-center px-8 py-3">
            <a
              href={result.cta.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-ink px-6 py-2.5 text-[13px] font-semibold text-white [&_p]:m-0 [&_p]:inline"
            >
              <span dangerouslySetInnerHTML={{ __html: result.cta.text }} />
              <span aria-hidden>→</span>
            </a>
          </div>
        );

      case "footer":
        return (
          <div className="flex flex-col items-center gap-1.5 border-t border-border bg-card-footer px-8 py-5 text-center">
            <p className="text-[11px] text-ink-muted">
              Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890
            </p>
            <p className="text-[11px] text-ink-muted">
              Du modtager dette nyhedsbrev, fordi du er {audience}.
            </p>
            <a href="#" className="pt-1 text-[11px] text-ink underline">
              Afmeld nyhedsbrevet
            </a>
          </div>
        );
    }
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] transition-[width] ${
        viewport === "mobil" ? "w-[375px]" : "w-[600px]"
      }`}
    >
      {order.map((id) => (
        <div key={id}>{renderBlock(id)}</div>
      ))}
    </div>
  );
}
