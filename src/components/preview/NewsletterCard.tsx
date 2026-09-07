import type { ReactNode } from "react";
import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { ImagePlaceholderIcon, LeafIcon } from "@/components/icons";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import { IMAGE_SIZE_PX, type NewsletterBlock } from "@/lib/newsletterBlocks";

const JUSTIFY_CLASS = {
  venstre: "justify-start",
  center: "justify-center",
  hoejre: "justify-end",
} as const;

interface NewsletterCardProps {
  blocks: NewsletterBlock[];
  image: GeneratedNewsletter["image"];
  customerType: CustomerType;
  products: ShopifyProduct[];
  viewport: "desktop" | "mobil";
}

export function NewsletterCard({ blocks, image, customerType, products, viewport }: NewsletterCardProps) {
  const audience = customerType === "erhverv" ? "registreret erhvervskunde" : "tilmeldt vores nyhedsbrev";

  function renderBlock(block: NewsletterBlock): ReactNode {
    switch (block.type) {
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
              dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
            />
          </div>
        );

      case "brodtekst":
        return (
          <div className="px-8 py-3">
            <div
              className="text-[13px] leading-relaxed text-card-body-text [&_p]:m-0 [&_p+p]:mt-5"
              dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
            />
          </div>
        );

      case "billede": {
        const alignment = block.alignment ?? "center";
        const size = block.size ?? "fuld";
        if (block.imageUrl) {
          return (
            <div className={`flex px-8 py-3 ${JUSTIFY_CLASS[alignment]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob:-object-URL, next/image kan ikke optimere den */}
              <img
                src={block.imageUrl}
                alt={block.altText || image.altText}
                style={{ width: IMAGE_SIZE_PX[size] }}
                className="max-w-full rounded-xl object-cover"
              />
            </div>
          );
        }
        return (
          <div className="px-8 py-3">
            <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl bg-surface-active">
              <ImagePlaceholderIcon className="h-9 w-9 text-ink-faint" />
              <p className="text-xs text-ink-faint">{image.altText}</p>
            </div>
          </div>
        );
      }

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

      case "tekst":
        return (
          <div className="px-8 py-3">
            <div
              className="text-[13px] leading-relaxed text-card-body-text [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
            />
          </div>
        );

      case "img": {
        const alignment = block.alignment ?? "center";
        const size = block.size ?? "fuld";
        if (block.imageUrl) {
          return (
            <div className={`flex px-8 py-3 ${JUSTIFY_CLASS[alignment]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- lokal blob:-object-URL, next/image kan ikke optimere den */}
              <img
                src={block.imageUrl}
                alt={block.altText ?? ""}
                style={{ width: IMAGE_SIZE_PX[size] }}
                className="max-w-full rounded-lg object-cover"
              />
            </div>
          );
        }
        return (
          <div className="flex justify-center px-8 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-active text-ink-muted">
              <ImagePlaceholderIcon className="h-3.5 w-3.5" />
            </div>
          </div>
        );
      }

      case "produkt": {
        const product = products.find((item) => item.id === block.productId);
        if (!product) return null;
        return (
          <div className="px-8 py-3">
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-xs font-medium text-ink">{product.title}</p>
                <p className="text-[11px] text-ink-muted">{product.productType}</p>
              </div>
              <p className="text-xs font-semibold text-ink">
                {formatPriceForCustomer(product.price, customerType)}
              </p>
            </div>
          </div>
        );
      }

      case "cta":
        return (
          <div className="flex justify-center px-8 py-3">
            <a
              href={block.ctaUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-ink px-6 py-2.5 text-[13px] font-semibold text-white [&_p]:m-0 [&_p]:inline"
            >
              <span dangerouslySetInnerHTML={{ __html: block.content ?? "" }} />
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
      {blocks
        .filter((block) => !block.hidden)
        .map((block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
    </div>
  );
}
