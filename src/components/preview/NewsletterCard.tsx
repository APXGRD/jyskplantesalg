"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import { getUnsubscribeUrl } from "@/lib/unsubscribeUrl";
import { ImagePlaceholderIcon } from "@/components/icons";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import {
  CTA_BORDER_RADIUS_PX,
  CTA_PADDING_PX,
  IMAGE_SIZE_PX,
  PRODUCT_CARD_RADIUS_PX,
  PRODUCT_CARD_GAP_PX,
  PRODUCT_ROW_PADDING_PX,
  getGalleryCardWidth,
  getMediaRowSize,
  isCompactCardWidth,
  isGalleryLayout,
  getMediaCardText,
  resolveMediaCards,
  resolveMediaListItems,
  type MediaCard,
  type NewsletterBlock,
} from "@/lib/newsletterBlocks";
import { getContrastTextColor } from "@/lib/brandColors";
import { formatFooterAddressLine, useBrandSettings } from "@/context/BrandSettingsContext";
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

  // Tom Billede-/Galleri-blok (intet produkt valgt / intet billede uploadet).
  function renderEmptyMedia(block: NewsletterBlock): ReactNode {
    if (!isGalleryLayout(block.galleryColumns)) {
      return (
        <div className="px-8 py-3">
          <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl bg-surface-active">
            <ImagePlaceholderIcon className="h-9 w-9 text-ink-faint" />
            <p className="text-xs text-ink-faint">{image.altText}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="px-8 py-3">
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-surface-active text-xs text-ink-faint">
          Vælg produkter til galleriet
        </div>
      </div>
    );
  }

  // Billede-/Galleri-blokken ("billede", og de legacy-typer "img"/"galleri")
  // med "Vis billede" slået til (standard): hvert billede er sit eget kort
  // (billede øverst, navn + pris tæt under) – kant-form og tæthed gælder HVERT
  // kort for sig. Kun billedet er klikbart og fører til produktets egen side.
  // Et uploadet billede (intet produkt) vises som et kort med kun billedet.
  function renderMediaCards(block: NewsletterBlock): ReactNode {
    const cards = resolveMediaCards(block, products);
    if (cards.length === 0) return renderEmptyMedia(block);
    const cardRadius = PRODUCT_CARD_RADIUS_PX[block.productBorderRadius ?? "afrundet"];
    const cardPadding = PRODUCT_ROW_PADDING_PX[block.productDensity ?? "normal"];
    const layout = block.galleryColumns ?? 1;
    // "1 billede" beholder billedets egne proportioner (som det enkelte
    // billede altid har haft); galleri-kortene beskæres kvadratisk, så de
    // står ens side om side.
    const imageClassName = isGalleryLayout(layout) ? "aspect-square w-full object-cover" : "h-auto w-full";
    // Kort pr. række efter blokkens fordeling (én række / flere rækker, se
    // getMediaRowSize) – samme tal og kortbredde som den kopierede HTML. Den
    // smalle mobil-visning viser højst 2 pr. række.
    const perRow = isGalleryLayout(layout) ? getMediaRowSize(block) : 1;
    const visiblePerRow = viewport === "mobil" ? Math.min(perRow, 2) : perRow;
    const compact = viewport !== "mobil" && isCompactCardWidth(getGalleryCardWidth(perRow));
    const textClassName = compact ? "text-[10px]" : "text-xs";

    function renderCard(card: MediaCard) {
      const text = getMediaCardText(card, customerType);
      const imageElement = card.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- Shopify-hostet billede-URL eller lokal data-URI
        <img src={card.src} alt={card.alt} className={imageClassName} />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-surface-active text-[10px] text-ink-faint">
          Intet billede
        </div>
      );
      return (
        <div
          key={card.key}
          className="flex flex-col overflow-hidden border bg-white"
          style={{ borderColor: "#1a1a1a", borderRadius: cardRadius }}
        >
          {text.href && card.src ? (
            <a
              href={text.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Se ${text.title}`}
              className="block"
            >
              {imageElement}
            </a>
          ) : (
            imageElement
          )}
          {(text.title || text.price) && (
            <div
              className={`flex flex-col items-center gap-0.5 text-center ${compact ? "px-1.5" : "px-3"}`}
              style={{ paddingTop: cardPadding, paddingBottom: cardPadding }}
            >
              {text.title && (
                <p className={`${textClassName} leading-snug font-medium`} style={{ color: "#1a1a1a" }}>
                  {text.title}
                </p>
              )}
              {text.price && (
                <p className={`${textClassName} font-semibold`} style={{ color: "#1a1a1a" }}>
                  {text.price}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (!isGalleryLayout(layout)) {
      // "1 billede": ét kort, med blokkens justering og størrelse.
      return (
        <div className={`flex px-8 py-3 ${JUSTIFY_CLASS[block.alignment ?? "center"]}`}>
          <div className="max-w-full" style={{ width: IMAGE_SIZE_PX[block.size ?? "fuld"] }}>
            {cards.map(renderCard)}
          </div>
        </div>
      );
    }
    // Flexbox med ombrydning (i stedet for CSS grid), så en ufuldstændig
    // sidste række (fx 5 billeder som 3 + 2) centreres – præcis som i den
    // kopierede HTML. Containeren er præcis én fuld rækkes bredde (samme
    // kortbredde som mailen), så linjeskiftet altid falder efter `perRow`
    // kort – også når kortene er smalle nok til, at flere ville kunne stå
    // side om side (fx 2 billeder under hinanden). Kortene i samme række
    // strækkes til samme højde.
    const gapTotal = (visiblePerRow - 1) * PRODUCT_CARD_GAP_PX;
    const rowWidth = visiblePerRow * getGalleryCardWidth(visiblePerRow) + gapTotal;
    return (
      <div className="px-8 py-3">
        <div className="mx-auto flex flex-wrap justify-center" style={{ gap: PRODUCT_CARD_GAP_PX, maxWidth: rowWidth }}>
          {cards.map((card) => (
            <div
              key={card.key}
              className="flex *:w-full"
              style={{ width: `calc((100% - ${gapTotal}px) / ${visiblePerRow})` }}
            >
              {renderCard(card)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // "Vis billede" slået fra: billederne skjules, og indholdet vises som en
  // ren, lodret tekstliste – én linje pr. kort, uanset layout-valget (som da
  // kun bestemmer antallet). Et produktnavn er klikbart til produktets egen
  // side, så listen stadig er navigerbar uden billeder. Et uploadet billede
  // med egen overskrift/pris vises som en linje uden link; helt uden tekst
  // udelades det.
  function renderMediaList(block: NewsletterBlock): ReactNode {
    const listItems = resolveMediaListItems(block, products, customerType);
    if (listItems.length === 0) return renderEmptyMedia(block);
    const rowPadding = PRODUCT_ROW_PADDING_PX[block.productDensity ?? "normal"];
    return (
      <div className="px-8 py-3">
        <ul className="border-t border-[#e5e5e5]">
          {listItems.map((item) => (
            <li
              key={item.key}
              className="flex items-baseline justify-between gap-4 border-b border-[#e5e5e5] text-[13px]"
              style={{ paddingTop: rowPadding, paddingBottom: rowPadding, color: "#1a1a1a" }}
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                  style={{ color: "#1a1a1a" }}
                >
                  {item.title}
                </a>
              ) : (
                <span className="font-medium">{item.title}</span>
              )}
              {item.price && <span className="shrink-0 font-semibold whitespace-nowrap">{item.price}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderBlock(block: NewsletterBlock): ReactNode {
    switch (block.type) {
      case "header": {
        const bgColor = block.bgColor || brand.colors[0] || staticBrand.colors[0];
        // Valgt tekstfarve – ellers automatisk sort/hvid efter baggrunden.
        const textColor = block.textColor || getContrastTextColor(bgColor);
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
              style={{ fontFamily: block.fontFamily, fontSize: block.fontSize ? `${block.fontSize}px` : undefined, color: block.textColor }}
              dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
            />
          </div>
        );

      case "brodtekst":
        return (
          <div className="px-8 py-3">
            <div
              className="text-[13px] leading-normal text-card-body-text [&_p]:m-0 [&_p]:mb-3.5 [&_p:last-child]:mb-0"
              style={{ fontFamily: block.fontFamily, fontSize: block.fontSize ? `${block.fontSize}px` : undefined, color: block.textColor }}
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
      case "galleri":
        return block.showImage === false ? renderMediaList(block) : renderMediaCards(block);

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
              style={{ fontFamily: block.fontFamily, fontSize: block.fontSize ? `${block.fontSize}px` : undefined, color: block.textColor }}
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
          fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
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
        // Valgt tekstfarve – ellers automatisk sort/hvid efter baggrunden.
        const textColor = block.textColor || getContrastTextColor(bgColor);
        return (
          <div
            className="flex flex-col items-center gap-1.5 border-t border-border px-8 py-5 text-center"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            <p className="text-[11px] opacity-80">{formatFooterAddressLine(brand)}</p>
            <p className="text-[11px] opacity-80">
              Du modtager dette nyhedsbrev, fordi du er {audience}.
            </p>
            <a href={getUnsubscribeUrl()} target="_blank" rel="noreferrer" className="pt-1 text-[11px] underline">
              Afmeld nyhedsbrevet
            </a>
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
