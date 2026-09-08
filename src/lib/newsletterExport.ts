import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import {
  CTA_BORDER_RADIUS_PX,
  CTA_PADDING_PX,
  IMAGE_ALIGN_CSS,
  IMAGE_SIZE_PX,
  type NewsletterBlock,
} from "@/lib/newsletterBlocks";
import { getContrastTextColor } from "@/lib/brandColors";

// Standard-skrifttype for HELE nyhedsbrevet, når hverken den globale
// skrifttype-vælger eller en per-blok værdi er sat. HTML-tabeller nedarver
// IKKE font-family pålideligt fra deres omgivelser i alle mail-klienter –
// derfor sættes denne eksplicit på hver enkelt tekst-bærende <td>/<a>/<div> i
// hele filen, i stedet for kun på den yderste <table>.
const DEFAULT_FONT_FAMILY = "Arial,Helvetica,sans-serif";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

// Blok-indhold (overskrift/brodtekst/cta) kommer fra TextBlockEditor (Tiptap) og er
// derfor allerede simpel, formateret HTML (fx "<p>Tekst med <strong>fed</strong></p>")
// – skal IKKE escapes igen, ellers vises tags'ne som rå tekst i stedet for at blive
// fortolket.
// Bevarer afsnits-skift som blanklinjer (i stedet for enkelte linjeskift), så
// fx en flerafsnits "brodtekst"-blok stadig læses som adskilte afsnit i
// tekst-udgaven.
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Sætter samme afsnits-afstand som Preview-visningens `[&_p]:mb-3.5
// [&_p:last-child]:mb-0` Tailwind-regler – 14px luft mellem hvert afsnit, ingen
// luft under det sidste. Skrevet direkte som inline style pr. <p>, da det
// kopierede HTML-fragment ikke kan bære en <style>-blok.
function styleBrodtekstParagraphs(html: string): string {
  const total = (html.match(/<p>/g) ?? []).length;
  let index = 0;
  return html.replace(/<p>/g, () => {
    index += 1;
    const marginBottom = index === total ? "0" : "14px";
    return `<p style="margin:0 0 ${marginBottom} 0">`;
  });
}

function audienceFor(customerType: CustomerType): string {
  return customerType === "erhverv" ? "registreret erhvervskunde" : "tilmeldt vores nyhedsbrev";
}

// Outlooks Word-baserede rendering-motor understøtter ikke CSS background-color
// på <div>- eller <a>-elementer pålideligt – kun bgcolor-attributten på <td>.
// Hele layoutet er derfor bygget af tabel-rækker (én <tr><td> pr. blok), og
// enhver baggrundsfarve sættes BÅDE som bgcolor-attribut (for Outlook) og som
// style (for Gmail/Apple Mail/browsere). CTA-knappen er af samme grund en
// selvstændig tabel med bgcolor på cellen frem for en stylet <a> alene –
// border-radius står tilbage som style på cellen, så Outlook blot viser en
// firkantet (men stadig synlig og klikbar) knap i stedet for slet ingen.
function renderBlockHtml(
  block: NewsletterBlock,
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  switch (block.type) {
    case "header": {
      const bgColor = block.bgColor || "#9caf88";
      const textColor = getContrastTextColor(bgColor);
      return `<tr><td bgcolor="${bgColor}" style="background:${bgColor};color:${textColor};text-align:center;padding:20px 32px;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:12px;font-family:${DEFAULT_FONT_FAMILY};">${escapeHtml(mockShopData.storeName)}</td></tr>`;
    }

    case "overskrift": {
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const colorStyle = block.textColor ? `color:${block.textColor};` : "";
      // block.content er rå Tiptap-HTML (fx "<p>Overskriften</p>") uden nogen
      // margin-styring – ubehandlet arver <p>'en browserens/mail-klientens
      // egen standard-margin (typisk et helt afsnits luft, langt mere end de
      // 12px padding, blokken allerede har). Preview nulstiller dette via en
      // CSS-regel (`[&_p]:m-0`), som ikke findes i det kopierede HTML-fragment
      // (ingen <style>-blok) – sat eksplicit her i stedet, så det matcher.
      const heading = (block.content ?? "").replace(/<p>/g, '<p style="margin:0">');
      return `<tr><td style="padding:12px 32px;"><div style="color:#3a5837;font-size:24px;font-family:${fontFamily};${colorStyle}">${heading}</div></td></tr>`;
    }

    case "brodtekst": {
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const colorStyle = block.textColor ? `color:${block.textColor};` : "";
      return `<tr><td style="padding:12px 32px;color:#4a5565;font-size:14px;line-height:1.5;font-family:${fontFamily};${colorStyle}">${styleBrodtekstParagraphs(block.content ?? "")}</td></tr>`;
    }

    case "billede": {
      if (block.imageUrl) {
        const align = IMAGE_ALIGN_CSS[block.alignment ?? "center"];
        const width = IMAGE_SIZE_PX[block.size ?? "fuld"];
        return `<tr><td style="padding:12px 32px;text-align:${align};">
          <img src="${escapeAttr(block.imageUrl)}" alt="${escapeAttr(block.altText || image.altText)}" style="width:${width};max-width:100%;border-radius:12px;" />
        </td></tr>`;
      }
      return `<tr><td style="padding:12px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td bgcolor="#e8efe7" style="background:#e8efe7;border-radius:12px;padding:32px;color:#87a084;font-size:11px;text-align:center;font-family:${DEFAULT_FONT_FAMILY};">${escapeHtml(image.altText)}</td></tr>
        </table>
      </td></tr>`;
    }

    case "produktvisning": {
      const rows = products
        .map(
          (product) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #d2ddd1;font-family:${DEFAULT_FONT_FAMILY};">
            <div style="font-weight:600;color:#3a5837;font-size:13px;">${escapeHtml(product.title)}</div>
            <div style="color:#637862;font-size:12px;">${escapeHtml(product.productType)}</div>
          </td>
          <td style="padding:10px 0;border-top:1px solid #d2ddd1;text-align:right;font-weight:600;color:#3a5837;font-size:13px;white-space:nowrap;font-family:${DEFAULT_FONT_FAMILY};">
            ${escapeHtml(formatPriceForCustomer(product.price, customerType))}
          </td>
        </tr>`,
        )
        .join("");
      return `<tr><td style="padding:12px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${rows}</table>
      </td></tr>`;
    }

    case "skillelinje":
      return `<tr><td style="padding:12px 32px;"><hr style="border:none;border-top:1px solid #d2ddd1;margin:0;" /></td></tr>`;

    case "tekst": {
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const colorStyle = block.textColor ? `color:${block.textColor};` : "";
      return `<tr><td style="padding:12px 32px;"><div style="color:#4a5565;font-size:14px;line-height:1.6;font-family:${fontFamily};${colorStyle}">${block.content ?? ""}</div></td></tr>`;
    }

    case "img": {
      if (block.imageUrl) {
        const align = IMAGE_ALIGN_CSS[block.alignment ?? "center"];
        const width = IMAGE_SIZE_PX[block.size ?? "fuld"];
        return `<tr><td style="padding:12px 32px;text-align:${align};">
          <img src="${escapeAttr(block.imageUrl)}" alt="${escapeAttr(block.altText ?? "")}" style="width:${width};max-width:100%;border-radius:8px;" />
        </td></tr>`;
      }
      return `<tr><td style="padding:12px 32px;text-align:center;color:#87a084;font-size:11px;font-family:${DEFAULT_FONT_FAMILY};">[Billede]</td></tr>`;
    }

    case "produkt": {
      const product = products.find((item) => item.id === block.productId);
      if (!product) return "";
      return `<tr><td style="padding:12px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:10px;border:1px solid #d2ddd1;border-radius:12px;font-family:${DEFAULT_FONT_FAMILY};">
              <div style="font-weight:600;color:#3a5837;font-size:13px;">${escapeHtml(product.title)}</div>
              <div style="color:#637862;font-size:12px;">${escapeHtml(product.productType)}</div>
            </td>
            <td style="padding:10px;border:1px solid #d2ddd1;text-align:right;font-weight:600;color:#3a5837;font-size:13px;white-space:nowrap;font-family:${DEFAULT_FONT_FAMILY};">
              ${escapeHtml(formatPriceForCustomer(product.price, customerType))}
            </td>
          </tr>
        </table>
      </td></tr>`;
    }

    case "cta": {
      const bgColor = block.bgColor || "#3a5837";
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const padding = CTA_PADDING_PX[block.ctaPadding ?? "normal"];
      const borderRadius = CTA_BORDER_RADIUS_PX[block.ctaBorderRadius ?? "afrundet"];
      const isOutline = (block.ctaStyle ?? "udfyldt") === "kontur";
      const paddingStyle = `padding:${padding.vertical}px ${padding.horizontal}px;`;
      // border-radius er kun her for Gmail/Apple Mail/browsere – Outlook
      // ignorerer den og viser pænt et firkantet hjørne i stedet (acceptabelt,
      // jf. opgavebeskrivelsen).
      const radiusStyle = `border-radius:${borderRadius}px;`;
      // "kontur": ingen baggrund (så intet bgcolor-attribut heller, kun en
      // 2px kant i bgColor). "udfyldt": bgcolor-attribut BÅDE som attribut
      // (for Outlook) og som style (for alt andet) – samme mønster som
      // header/footer.
      const cellBgcolorAttr = isOutline ? "" : ` bgcolor="${bgColor}"`;
      const cellFillStyle = isOutline
        ? `border:2px solid ${bgColor};`
        : `background:${bgColor};`;
      // Knap-TEKSTENS farve: i kontur-stil er den altid selve kant-farven
      // (bgColor); i udfyldt stil følger den en global/per-blok
      // textColor-vælger hvis sat, ellers den automatisk udregnede
      // kontrastfarve mod baggrunden.
      const textColor = isOutline ? bgColor : block.textColor || getContrastTextColor(bgColor);
      // font-family sættes BÅDE på <td> og på selve <a>'et – ikke kun ét sted.
      // Nogle mail-klienters indsæt-sanering rører/erstatter specifikt
      // <a>-tags' egen inline style (fx med deres eget standard-link-udseende),
      // uden at røre den omkringliggende <td>. Uden en eksplicit værdi på
      // cellen ville teksten i så fald arve klientens egen standardskrift
      // (ofte en serif) i stedet – samme grundlæggende problem som
      // overskriftens manglende margin tidligere.
      //
      // block.content kan – ligesom overskriften – være Tiptap-HTML pakket
      // ind i <p>-tags (fx "<p>Se træet her</p>"), når knap-teksten er
      // redigeret. Preview gør det uskadeligt ved at tvinge <p> til at være
      // inline (`[&_p]:inline`), men den CSS-regel findes ikke i det
      // kopierede fragment. I stedet for at prøve at neutralisere <p>'ens
      // egen standard-margin med endnu en inline style, fjernes <p>-tagsene
      // helt her – en knap-label er per definition én linje, så der er
      // ingen grund til at bevare et blok-element, der kan blæse den
      // "inline-block"-knappens højde markant op (bekræftet: uden denne
      // fix blev den fulde knap 63px høj mod Previews 39,5px).
      const label = (block.content ?? "").replace(/<\/?p[^>]*>/g, "");
      return `<tr><td style="padding:12px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td${cellBgcolorAttr} style="${cellFillStyle}${radiusStyle}${paddingStyle}font-family:${fontFamily};" align="center">
              <a href="${escapeAttr(block.ctaUrl || "#")}" style="color:${textColor};text-decoration:none;font-family:${fontFamily};font-weight:600;font-size:13px;line-height:19.5px;display:inline-block;">
                ${label}
              </a>
            </td>
          </tr>
        </table>
      </td></tr>`;
    }

    case "footer": {
      const bgColor = block.bgColor || "#f5f7f4";
      const textColor = getContrastTextColor(bgColor);
      return `<tr><td bgcolor="${bgColor}" style="background:${bgColor};color:${textColor};border-top:1px solid #d2ddd1;padding:20px 32px;text-align:center;font-size:11px;font-family:${DEFAULT_FONT_FAMILY};">
        Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890<br/>
        Du modtager dette nyhedsbrev, fordi du er ${escapeHtml(audienceFor(customerType))}.
      </td></tr>`;
    }
  }
}

function renderBlockText(
  block: NewsletterBlock,
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  switch (block.type) {
    case "header":
      return mockShopData.storeName;

    case "overskrift":
      return stripHtml(block.content ?? "");

    case "brodtekst":
      return stripHtml(block.content ?? "");

    case "billede":
      return `[Billede: ${block.altText || image.altText}]`;

    case "produktvisning":
      return products
        .map(
          (product) =>
            `- ${product.title} (${product.productType}): ${formatPriceForCustomer(product.price, customerType)}`,
        )
        .join("\n");

    case "skillelinje":
      return "—————————";

    case "tekst":
      return stripHtml(block.content ?? "");

    case "img":
      return block.imageUrl ? `[Billede: ${block.altText || "uden beskrivelse"}]` : "[Billede]";

    case "produkt": {
      const product = products.find((item) => item.id === block.productId);
      if (!product) return "";
      return `- ${product.title} (${product.productType}): ${formatPriceForCustomer(product.price, customerType)}`;
    }

    case "cta":
      return `${stripHtml(block.content ?? "")}: ${block.ctaUrl ?? ""}`;

    case "footer":
      return `Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890\nDu modtager dette nyhedsbrev, fordi du er ${audienceFor(customerType)}.`;
  }
}

// Bygger en selvstændig, indlejret HTML-udgave af nyhedsbrevet ud fra de synlige
// blokke (i deres nuværende rækkefølge), klar til at blive skrevet til
// udklipsholderen som "text/html" (bevarer formatering ved indsættelse i fx
// Gmail, Outlook eller andre rige tekstfelter). Skjulte blokke udelades.
//
// Hele tabellen bruger border-collapse:separate (i stedet for collapse), fordi
// WebKit ellers ikke tegner border-radius korrekt på en <table> – det ville
// give firkantede hjørner i Gmail/browser-visningen, selvom stylen er der.
export function buildNewsletterHtml(
  blocks: NewsletterBlock[],
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  const rows = blocks
    .filter((block) => !block.hidden)
    .map((block) => renderBlockHtml(block, image, customerType, products))
    .join("\n");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;margin:0 auto;border:1px solid #d2ddd1;border-radius:16px;border-collapse:separate;border-spacing:0;overflow:hidden;font-family:${DEFAULT_FONT_FAMILY};">
    <tbody>${rows}</tbody>
  </table>`.trim();
}

// Ren tekst-udgave, brugt som fallback ("text/plain") for udklipsholdere/felter der
// ikke understøtter rig HTML. Skjulte blokke udelades.
export function buildNewsletterText(
  blocks: NewsletterBlock[],
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  return blocks
    .filter((block) => !block.hidden)
    .map((block) => renderBlockText(block, image, customerType, products))
    .join("\n\n");
}
