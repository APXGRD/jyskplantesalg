"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { ImagePlaceholderIcon } from "@/components/icons";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import {
  CTA_BORDER_RADIUS_PX,
  CTA_PADDING_PX,
  GALLERY_ROW_SIZE,
  IMAGE_SIZE_PX,
  PRODUCT_ROW_PADDING_PX,
  isGalleryLayout,
  type GalleryColumns,
  type NewsletterBlock,
} from "@/lib/newsletterBlocks";
import { getContrastTextColor } from "@/lib/brandColors";
import { useBrandSettings } from "@/context/BrandSettingsContext";
import { brand as staticBrand } from "@/config/brand";

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
  const brand = useBrandSettings();
  const audience = customerType === "erhverv" ? "registreret erhvervskunde" : "tilmeldt vores nyhedsbrev";

  function renderBlock(block: NewsletterBlock): ReactNode {
    switch (block.type) {
      case "header": {
        const bgColor = block.bgColor || brand.colors[0] || staticBrand.colors[0];
        const textColor = getContrastTextColor(bgColor);
        return (
          <div
            className="flex items-center justify-center gap-3 px-8 py-5"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {brand.logoData && (
              // eslint-disable-next-line @next/next/no-img-element -- kundens uploadede logo, base64 data-URI
              <img src={brand.logoData} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className="text-xs font-medium tracking-[0.1em] uppercase">
              {brand.name}
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

      // "billede" er den eneste type, ny kode fra nu af producerer; "img" og
      // "galleri" er kun stadig anerkendte type-strenge, så allerede gemte
      // nyhedsbrev-udkast/skabeloner fra FØR Billede og Galleri blev
      // konsolideret til én blok-type stadig render'es korrekt. Selve
      // layout-valget (enkelt billede vs. galleri) afgøres udelukkende af
      // block.galleryColumns, ikke af hvilken af de tre typer det er.
      case "billede":
      case "img":
      case "galleri": {
        if (isGalleryLayout(block.galleryColumns)) {
          const columns = block.galleryColumns as GalleryColumns;
          const galleryProducts = (block.galleryProductIds ?? [])
            .map((id) => products.find((product) => product.id === id))
            .filter((product): product is ShopifyProduct => Boolean(product?.imageUrl));
          if (galleryProducts.length === 0) {
            return (
              <div className="px-8 py-3">
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-surface-active text-xs text-ink-faint">
                  Vælg produkter til galleriet
                </div>
              </div>
            );
          }
          return (
            <div className="px-8 py-3">
              <div className={`grid gap-3 ${GALLERY_ROW_SIZE[columns] === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {/* CSS grid ombryder automatisk til en ny række, når der er flere
                    billeder end kolonner – "6 billeder"-layoutet (3 kolonner) giver
                    derfor 2 pæne rækker af 3 helt af sig selv, uden ekstra markup. */}
                {galleryProducts.map((product) => (
                  // eslint-disable-next-line @next/next/no-img-element -- Shopify-hostet billede-URL, samme mønster som produktvisning
                  <img
                    key={product.id}
                    src={product.imageUrl}
                    alt={product.title}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          );
        }

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

      case "produktvisning": {
        // undefined betyder "vis alle tilgængelige produkter" – den
        // oprindelige, uændrede opførsel, før dette valg fandtes (se
        // NewsletterBlock.productDisplayIds i newsletterBlocks.ts).
        const displayProducts = block.productDisplayIds
          ? products.filter((product) => block.productDisplayIds!.includes(product.id))
          : products;
        const borderRadius = CTA_BORDER_RADIUS_PX[block.productBorderRadius ?? "afrundet"];
        const rowPaddingY = PRODUCT_ROW_PADDING_PX[block.productDensity ?? "normal"];
        return (
          <div className="px-8 py-3">
            <div className="overflow-hidden border" style={{ borderColor: "#1a1a1a", borderRadius }}>
              {displayProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between px-4"
                  style={{
                    paddingTop: rowPaddingY,
                    paddingBottom: rowPaddingY,
                    ...(index > 0 ? { borderTop: "1px solid #1a1a1a" } : {}),
                  }}
                >
                  <p className="text-xs font-medium" style={{ color: "#1a1a1a" }}>
                    {product.title}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: "#1a1a1a" }}>
                    {formatPriceForCustomer(product.price, customerType)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      }

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
              {brand.name} · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890
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
