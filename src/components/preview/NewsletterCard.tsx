import type { CSSProperties, ReactNode } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { ImagePlaceholderIcon, LeafIcon } from "@/components/icons";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import { CTA_BORDER_RADIUS_PX, CTA_PADDING_PX, IMAGE_SIZE_PX, type NewsletterBlock } from "@/lib/newsletterBlocks";
import { getContrastTextColor } from "@/lib/brandColors";
import { shopBranding } from "@/lib/shopBranding";

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
      case "header": {
        const bgColor = block.bgColor || "#9caf88";
        const textColor = getContrastTextColor(bgColor);
        return (
          <div
            className="flex items-center justify-center gap-3 px-8 py-5"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <LeafIcon className="h-6 w-6" />
            <span className="text-xs font-medium tracking-[0.1em] uppercase">
              {shopBranding.storeName}
            </span>
          </div>
        );
      }

      case "overskrift":
        return (
          <div className="px-8 py-3">
            <div
              className="font-serif text-[26px] leading-[1.2] text-ink [&_p]:m-0"
              style={{ fontFamily: block.fontFamily, color: block.textColor }}
              dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
            />
          </div>
        );

      case "brodtekst":
        return (
          <div className="px-8 py-3">
            <div
              className="text-[13px] leading-normal text-card-body-text [&_p]:m-0 [&_p]:mb-3.5 [&_p:last-child]:mb-0"
              style={{ fontFamily: block.fontFamily, color: block.textColor }}
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
              style={{ fontFamily: block.fontFamily, color: block.textColor }}
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

      case "cta": {
        const bgColor = block.bgColor || "#3a5837";
        const padding = CTA_PADDING_PX[block.ctaPadding ?? "normal"];
        const borderRadius = CTA_BORDER_RADIUS_PX[block.ctaBorderRadius ?? "afrundet"];
        const isOutline = (block.ctaStyle ?? "udfyldt") === "kontur";
        // "kontur": ingen baggrund, kun en 2px kant i bgColor, og knap-teksten
        // får samme farve som konturen. "udfyldt": knap-TEKSTENS farve følger
        // en global/per-blok textColor-vælger hvis sat, ellers den automatisk
        // udregnede kontrastfarve mod baggrunden.
        const textColor = isOutline ? bgColor : block.textColor || getContrastTextColor(bgColor);
        const ctaStyle: CSSProperties = {
          fontFamily: block.fontFamily,
          borderRadius,
          paddingTop: padding.vertical,
          paddingBottom: padding.vertical,
          paddingLeft: padding.horizontal,
          paddingRight: padding.horizontal,
          color: textColor,
          ...(isOutline
            ? { backgroundColor: "transparent", border: `2px solid ${bgColor}` }
            : { backgroundColor: bgColor }),
        };
        return (
          <div className="flex justify-center px-8 py-3">
            <a
              href={block.ctaUrl || "#"}
              target="_blank"
              rel="noreferrer"
              style={ctaStyle}
              className="inline-flex items-center gap-1 text-[13px] font-semibold [&_p]:m-0 [&_p]:inline"
            >
              <span dangerouslySetInnerHTML={{ __html: block.content ?? "" }} />
            </a>
          </div>
        );
      }

      case "footer": {
        const bgColor = block.bgColor || "#f5f7f4";
        const textColor = getContrastTextColor(bgColor);
        return (
          <div
            className="flex flex-col items-center gap-1.5 border-t border-border px-8 py-5 text-center"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <p className="text-[11px] opacity-80">
              Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890
            </p>
            <p className="text-[11px] opacity-80">
              Du modtager dette nyhedsbrev, fordi du er {audience}.
            </p>
            <p className="pt-1 text-[11px]">Afmeld nyhedsbrevet</p>
          </div>
        );
      }
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
