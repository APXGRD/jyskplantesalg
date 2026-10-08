import type { ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import {
  CTA_BORDER_RADIUS_PX,
  CTA_PADDING_PX,
  IMAGE_ALIGN_CSS,
  PRODUCT_CARD_GAP_PX,
  RICH_TEXT_BLOCK_TYPES,
  chunkSocialLinks,
  computeMasonryGrid,
  getSocialLinks,
  isBlankContent,
  getMasonryColumns,
  getMasonryGapPx,
  getMasonryLayout,
  getMasonryRadiusPx,
  MEDIA_CONTENT_WIDTH_PX,
  PRODUCT_CARD_RADIUS_PX,
  PRODUCT_ROW_PADDING_PX,
  SINGLE_CARD_WIDTH_PX,
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
import { formatFooterAddressLine, type BrandSettings } from "@/context/BrandSettingsContext";
import { brand as staticBrand } from "@/config/brand";
import { getUnsubscribeUrl } from "@/lib/unsubscribeUrl";

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

// Shopify-hostede produktbilleder har vidt forskellige proportioner (fx
// 3024×4032). Preview beskærer dem kvadratisk med CSS (object-fit), men det
// understøtter mail-klienterne ikke pålideligt – i stedet bedes Shopifys CDN
// om et færdigt udsnit i præcis den ønskede størrelse (width/height/crop), så
// alle billeder i en række er lige store i enhver mail-klient. 2× opløsning
// for skarphed på retina-skærme – og langt mindre filer end originalen.
// Andre billeder (fx uploadede data-URI'er) returneres uændret.
function sizedImageSrc(src: string, width: number, square: boolean): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== "cdn.shopify.com") return src;
  url.searchParams.set("width", String(width * 2));
  if (square) {
    url.searchParams.set("height", String(width * 2));
    url.searchParams.set("crop", "center");
  }
  return url.toString();
}

// Billede-/Galleri-blokken med "Vis billede" slået til (standard): hvert
// billede er sit eget kort (billede øverst, navn + pris tæt under) – kant-form
// og tæthed gælder HVERT kort for sig. Outlooks Word-baserede motor
// understøtter ikke CSS grid/flexbox, så kortene sættes side om side i
// <table>-rækker (MEDIA_CARDS_PER_ROW pr. række), og det klikbare billede er
// et <a> omkring et <img> inde i en <td> – det eneste mønster, der er
// klikbart pålideligt i alle mail-klienter. Et uploadet billede (intet
// produkt) bliver et kort uden link – med sin egen overskrift/pris under,
// hvis de er udfyldt. Outlook ignorerer border-radius og viser skarpe hjørner
// (accepteret, samme som CTA-knappen).
//
// Så kortene i en række ALTID er lige store i den indsatte mail (som i
// Preview):
// - galleri-billederne beskæres kvadratisk i fast størrelse (sizedImageSrc,
//   plus width/height-attributter),
// - hvert kort er selve <td>'en med kanten (ikke en selvstændig tabel inde i
//   en celle), så alle kort i samme <tr> får samme højde, uanset hvor mange
//   linjer produktnavnet fylder,
// - kanten regnes MED i kortets bredde, så en fuld række fylder præcis de
//   534px, der er plads til – ellers klemmer mail-klienten kortene.
function renderMediaCardsHtml(
  block: NewsletterBlock,
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  const cards = resolveMediaCards(block, products);
  if (cards.length === 0) return ""; // Tom blok (intet billede/produkt valgt) – udelades af mailen.
  const layout = block.galleryColumns ?? 1;
  const isGallery = isGalleryLayout(layout);
  // Galleri: kort pr. række efter blokkens fordeling (én række / flere
  // rækker, se getMediaRowSize), og kortbredden så rækken passer præcis.
  // "1 billede": ét kort i blokkens størrelse (Lille/Mellem/Fuld bredde).
  const cardsPerRow = isGallery ? getMediaRowSize(block) : 1;
  const cardWidth = isGallery ? getGalleryCardWidth(cardsPerRow) : SINGLE_CARD_WIDTH_PX[block.size ?? "fuld"];
  // Kortets indhold (billedet) er kortet minus 1px kant i hver side.
  const innerWidth = cardWidth - 2;
  const compact = isCompactCardWidth(cardWidth);
  const textSize = compact ? 11 : 13;
  const textPaddingX = compact ? 6 : 12;
  const cardRadius = PRODUCT_CARD_RADIUS_PX[block.productBorderRadius ?? "afrundet"];
  const cardPadding = PRODUCT_ROW_PADDING_PX[block.productDensity ?? "normal"];
  // Et kort uden tekst har billedet helt ned til bunden – da skal alle fire
  // hjørner afrundes, ellers kun de to øverste. Kortets egen radius minus
  // kanten, så billedets hjørne følger kantens indre bue.
  function imageRadius(hasText: boolean): string {
    const radius = Math.max(cardRadius - 1, 0);
    if (radius === 0) return "";
    return hasText ? `border-radius:${radius}px ${radius}px 0 0;` : `border-radius:${radius}px;`;
  }

  // Mail-klienter gengiver typisk kun to skrift-vægte pålideligt
  // (normal/bold) – derfor normal til navnet og bold til prisen.
  function cardCell(card: MediaCard): string {
    const cardText = getMediaCardText(card, customerType);
    const hasText = Boolean(cardText.title || cardText.price);
    // Galleri: fast kvadrat (samme som Preview's aspect-square). "1 billede":
    // billedets egne proportioner, som i Preview.
    const imageHeight = isGallery ? innerWidth : undefined;
    const heightAttr = imageHeight ? ` height="${imageHeight}"` : "";
    const heightStyle = imageHeight ? `height:${imageHeight}px;object-fit:cover;` : "height:auto;";
    const img = card.src
      ? `<img src="${escapeAttr(sizedImageSrc(card.src, innerWidth, isGallery))}" alt="${escapeAttr(card.alt)}" width="${innerWidth}"${heightAttr} style="width:${innerWidth}px;max-width:100%;${heightStyle}display:block;border:0;${imageRadius(hasText)}" />`
      : "";
    const placeholderHeight = imageHeight ?? innerWidth;
    const imageHtml = !card.src
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td bgcolor="#f1f1f1" height="${placeholderHeight}" style="background:#f1f1f1;height:${placeholderHeight}px;text-align:center;color:#888888;font-size:11px;font-family:${DEFAULT_FONT_FAMILY};">Intet billede</td></tr></table>`
      : cardText.href
        ? `<a href="${escapeAttr(cardText.href)}" target="_blank" style="display:block;text-decoration:none;">${img}</a>`
        : img;
    const titleHtml = cardText.title
      ? `<div style="font-weight:normal;color:#1a1a1a;font-size:${textSize}px;line-height:1.35;">${escapeHtml(cardText.title)}</div>`
      : "";
    const priceHtml = cardText.price
      ? `<div style="font-weight:bold;color:#1a1a1a;font-size:${textSize}px;${cardText.title ? "padding-top:2px;" : ""}">${escapeHtml(cardText.price)}</div>`
      : "";
    const textRow = hasText
      ? `<tr><td align="center" style="padding:${cardPadding}px ${textPaddingX}px;text-align:center;font-family:${DEFAULT_FONT_FAMILY};">${titleHtml}${priceHtml}</td></tr>`
      : "";
    return `<td valign="top" width="${innerWidth}" bgcolor="#ffffff" style="width:${innerWidth}px;padding:0;border:1px solid #1a1a1a;border-radius:${cardRadius}px;background:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="padding:0;">${imageHtml}</td></tr>
                ${textRow}
              </table>
            </td>`;
  }

  const gapCell = `<td width="${PRODUCT_CARD_GAP_PX}" style="width:${PRODUCT_CARD_GAP_PX}px;font-size:0;line-height:0;">&nbsp;</td>`;
  const rows: MediaCard[][] = [];
  for (let i = 0; i < cards.length; i += cardsPerRow) {
    rows.push(cards.slice(i, i + cardsPerRow));
  }
  // "1 billede" følger blokkens justering; galleri-layouts centreres.
  const tableAlign = isGallery ? "center" : IMAGE_ALIGN_CSS[block.alignment ?? "center"];
  const marginRight = tableAlign === "right" ? "0" : "auto";
  const marginLeft = tableAlign === "left" ? "0" : "auto";
  const tables = rows
    .map((rowCards, rowIndex) => {
      const cells = rowCards.map(cardCell).join(gapCell);
      const marginTop = rowIndex === 0 ? "0" : `${PRODUCT_CARD_GAP_PX}px`;
      // border-collapse:separate, så hver celles egen kant og border-radius
      // bevares (collapse ville slå kanterne sammen og fjerne radius).
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${tableAlign}" style="margin:${marginTop} ${marginRight} 0 ${marginLeft};border-collapse:separate;border-spacing:0;">
            <tr>${cells}</tr>
          </table>`;
    })
    .join("");
  return `<tr><td style="padding:12px 32px;">
        ${tables}
      </td></tr>`;
}

// "Vis billede" slået fra: billederne skjules, og indholdet vises som en ren,
// lodret tekstliste – én tabel-række pr. kort, uanset layout-valget. Et
// produktnavn er et klikbart <a> til produktets egen side (i stedet for
// billedet), så listen stadig er navigerbar. Et uploadet billede med egen
// overskrift/pris bliver en linje uden link; helt uden tekst udelades det.
function renderMediaListHtml(
  block: NewsletterBlock,
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  const listItems = resolveMediaListItems(block, products, customerType);
  if (listItems.length === 0) return ""; // Tom blok (intet billede/produkt valgt) – udelades af mailen.
  const rowPadding = PRODUCT_ROW_PADDING_PX[block.productDensity ?? "normal"];
  const rows = listItems
    .map((item) => {
      const title = item.title ? escapeHtml(item.title) : "";
      const titleHtml = item.href
        ? `<a href="${escapeAttr(item.href)}" target="_blank" style="color:#1a1a1a;text-decoration:underline;font-family:${DEFAULT_FONT_FAMILY};">${title}</a>`
        : `<span style="color:#1a1a1a;font-family:${DEFAULT_FONT_FAMILY};">${title}</span>`;
      return `<tr>
            <td style="padding:${rowPadding}px 0;border-bottom:1px solid #e5e5e5;font-family:${DEFAULT_FONT_FAMILY};font-size:13px;">
              ${titleHtml}
            </td>
            <td align="right" style="padding:${rowPadding}px 0 ${rowPadding}px 16px;border-bottom:1px solid #e5e5e5;font-family:${DEFAULT_FONT_FAMILY};font-size:13px;font-weight:bold;color:#1a1a1a;white-space:nowrap;text-align:right;">${item.price ? escapeHtml(item.price) : ""}</td>
          </tr>`;
    })
    .join("");
  return `<tr><td style="padding:12px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #e5e5e5;">
          ${rows}
        </table>
      </td></tr>`;
}

// Sociale medier-blokken: overskrift + knapper med platformens navn (samme
// farve/stil/form-felter som CTA-knappen). Hver knap er en <td> med bgcolor
// (Outlook) og style (øvrige klienter) og et <a> indeni – samme bulletproof-
// teknik som CTA-knappen. Højst SOCIALS_PER_ROW knapper pr. række, ens med
// Preview. Uden udfyldte links udelades blokken.
function renderSocialsHtml(block: NewsletterBlock): string {
  const links = getSocialLinks(block);
  if (links.length === 0) return "";
  const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
  const bgColor = block.bgColor || "#111111";
  const isOutline = (block.ctaStyle ?? "udfyldt") === "kontur";
  const textColor = isOutline ? bgColor : block.textColor || getContrastTextColor(bgColor);
  const radius = CTA_BORDER_RADIUS_PX[block.ctaBorderRadius ?? "pille"];
  const cellBgcolorAttr = isOutline ? "" : ` bgcolor="${bgColor}"`;
  const cellFill = isOutline ? `border:2px solid ${bgColor};` : `background:${bgColor};`;
  const heading = block.socialHeading?.trim();
  const headingRow = heading
    ? `<tr><td style="padding:12px 32px 0;text-align:center;font-family:${fontFamily};font-size:13px;font-weight:bold;color:#1a1a1a;">${escapeHtml(heading)}</td></tr>`
    : "";
  const rows = chunkSocialLinks(links)
    .map((row, rowIndex) => {
      const cells = row
        .map(
          (link) =>
            `<td${cellBgcolorAttr} align="center" style="${cellFill}border-radius:${radius}px;padding:6px 14px;font-family:${fontFamily};"><a href="${escapeAttr(link.url)}" target="_blank" style="color:${textColor};text-decoration:none;font-family:${fontFamily};font-size:12px;font-weight:bold;line-height:1.25;display:inline-block;">${escapeHtml(link.label)}</a></td>`,
        )
        .join(`<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>`);
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:${rowIndex === 0 ? "0" : "8px"} auto 0;border-collapse:separate;"><tr>${cells}</tr></table>`;
    })
    .join("");
  return `${headingRow}<tr><td style="padding:${heading ? "8px" : "12px"} 32px 12px;">${rows}</td></tr>`;
}

// Billedeblokken: masonry-gitter af egne uploadede billeder. Outlook
// understøtter hverken CSS columns, grid eller flexbox – gitteret bygges
// derfor som ÉN tabelrække med en celle pr. kolonne (fast bredde, valign
// top), og billederne stables i hver celle i deres egne proportioner (fast
// bredde, height/auto). Fordelingen er PRÆCIS den samme som i Preview (se
// buildMasonryColumns). Tom blok (ingen billeder) udelades.
function renderMasonryHtml(block: NewsletterBlock): string {
  const images = block.masonryImages ?? [];
  if (images.length === 0) return "";
  // Afstand og hjørner gælder begge visninger (samme værdier som Preview).
  const gap = getMasonryGapPx(block);
  const radius = getMasonryRadiusPx(block);
  const radiusStyle = radius > 0 ? `border-radius:${radius}px;` : "";
  // Fuld bredde: hvert billede i hele indholdsbredden, under hinanden.
  if (getMasonryLayout(block) === "fuld") {
    const rows = images
      .map((masonryImage, index) => {
        const height = Math.round((masonryImage.height / masonryImage.width) * MEDIA_CONTENT_WIDTH_PX);
        const paddingBottom = index === images.length - 1 ? 0 : gap;
        return `<tr><td style="padding:0 0 ${paddingBottom}px 0;"><img src="${escapeAttr(masonryImage.src)}" alt="${escapeAttr(masonryImage.altText ?? "")}" width="${MEDIA_CONTENT_WIDTH_PX}" height="${height}" style="width:${MEDIA_CONTENT_WIDTH_PX}px;max-width:100%;height:auto;display:block;border:0;${radiusStyle}" /></td></tr>`;
      })
      .join("");
    return `<tr><td style="padding:12px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
      </td></tr>`;
  }
  // Masonry: alle kolonner flugter i top og bund (se computeMasonryGrid).
  // Billederne er forinden beskåret til præcis deres plads af
  // cropMasonryImagesForExport (masonryExport.ts) – width/height her er
  // derfor billedets egne mål, og object-fit er kun en ekstra sikkerhed for
  // klienter, der understøtter det.
  const grid = computeMasonryGrid(images, getMasonryColumns(block), gap);
  const cells = grid.columns
    .map((column, columnIndex) => {
      const isLast = columnIndex === grid.columns.length - 1;
      const stack = column
        .map((cell, index) => {
          const paddingBottom = index === column.length - 1 ? 0 : gap;
          return `<tr><td style="padding:0 0 ${paddingBottom}px 0;"><img src="${escapeAttr(cell.image.src)}" alt="${escapeAttr(cell.image.altText ?? "")}" width="${grid.columnWidth}" height="${cell.height}" style="width:${grid.columnWidth}px;height:${cell.height}px;object-fit:cover;display:block;border:0;${radiusStyle}" /></td></tr>`;
        })
        .join("");
      return `<td valign="top" width="${grid.columnWidth}" style="width:${grid.columnWidth}px;${isLast || gap === 0 ? "" : `padding-right:${gap}px;`}">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${stack}</table>
          </td>`;
    })
    .join("");
  return `<tr><td style="padding:12px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>${cells}</tr>
        </table>
      </td></tr>`;
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
  brand: BrandSettings,
): string {
  switch (block.type) {
    case "header": {
      const bgColor = block.bgColor || brand.colors[0] || staticBrand.colors[0];
      // Valgt tekstfarve – ellers automatisk sort/hvid efter baggrunden.
      const textColor = block.textColor || getContrastTextColor(bgColor);
      // Intet statisk leaf-logo her – det er en CSS-maske i selve appen
      // (Logo.tsx), som ikke oversætter til rå, kopieret e-mail-HTML.
      // Uden et uploadet logo viser den kopierede header derfor kun
      // firmanavnet som tekst, ligesom hidtil.
      const logoImg = brand.logoData
        ? `<img src="${escapeAttr(brand.logoData)}" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;border-radius:4px;" />`
        : "";
      return `<tr><td bgcolor="${bgColor}" style="background:${bgColor};color:${textColor};text-align:center;padding:20px 32px;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:12px;font-family:${DEFAULT_FONT_FAMILY};">${logoImg}<span style="vertical-align:middle;">${escapeHtml(brand.name)}</span></td></tr>`;
    }

    case "overskrift": {
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const fontSize = block.fontSize ? `${block.fontSize}px` : "24px";
      const colorStyle = block.textColor ? `color:${block.textColor};` : "";
      // block.content er rå Tiptap-HTML (fx "<p>Overskriften</p>") uden nogen
      // margin-styring – ubehandlet arver <p>'en browserens/mail-klientens
      // egen standard-margin (typisk et helt afsnits luft, langt mere end de
      // 12px padding, blokken allerede har). Preview nulstiller dette via en
      // CSS-regel (`[&_p]:m-0`), som ikke findes i det kopierede HTML-fragment
      // (ingen <style>-blok) – sat eksplicit her i stedet, så det matcher.
      const heading = (block.content ?? "").replace(/<p>/g, '<p style="margin:0">');
      return `<tr><td style="padding:12px 32px;"><div style="color:#3a5837;font-size:${fontSize};font-family:${fontFamily};${colorStyle}">${heading}</div></td></tr>`;
    }

    case "brodtekst": {
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const fontSize = block.fontSize ? `${block.fontSize}px` : "14px";
      const colorStyle = block.textColor ? `color:${block.textColor};` : "";
      return `<tr><td style="padding:12px 32px;color:#4a5565;font-size:${fontSize};line-height:1.5;font-family:${fontFamily};${colorStyle}">${styleBrodtekstParagraphs(block.content ?? "")}</td></tr>`;
    }

    // "billede" er den eneste type, ny kode fra nu af producerer; "img" og
    // "galleri" er kun stadig anerkendte type-strenge, så allerede gemte
    // nyhedsbrev-udkast/skabeloner fra FØR Billede og Galleri blev
    // konsolideret til én blok-type stadig eksporteres korrekt.
    case "billede":
    case "img":
    case "galleri":
      return block.showImage === false
        ? renderMediaListHtml(block, image, customerType, products)
        : renderMediaCardsHtml(block, image, customerType, products);

    case "billedeblok":
      return renderMasonryHtml(block);

    case "socials":
      return renderSocialsHtml(block);

    case "skillelinje":
      // Skillelinjen er altid sort (samme som Preview).
      return `<tr><td style="padding:12px 32px;"><hr style="border:none;border-top:1px solid #000000;margin:0;" /></td></tr>`;

    case "tekst": {
      const fontFamily = block.fontFamily || DEFAULT_FONT_FAMILY;
      const fontSize = block.fontSize ? `${block.fontSize}px` : "14px";
      const colorStyle = block.textColor ? `color:${block.textColor};` : "";
      return `<tr><td style="padding:12px 32px;"><div style="color:#4a5565;font-size:${fontSize};line-height:1.6;font-family:${fontFamily};${colorStyle}">${block.content ?? ""}</div></td></tr>`;
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
      const fontSize = block.fontSize ? `${block.fontSize}px` : "13px";
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
              <a href="${escapeAttr(block.ctaUrl || "#")}" style="color:${textColor};text-decoration:none;font-family:${fontFamily};font-weight:600;font-size:${fontSize};line-height:19.5px;display:inline-block;">
                ${label}
              </a>
            </td>
          </tr>
        </table>
      </td></tr>`;
    }

    case "footer": {
      const bgColor = block.bgColor || "#f5f7f4";
      // Valgt tekstfarve – ellers automatisk sort/hvid efter baggrunden.
      const textColor = block.textColor || getContrastTextColor(bgColor);
      return `<tr><td bgcolor="${bgColor}" style="background:${bgColor};color:${textColor};border-top:1px solid #d2ddd1;padding:20px 32px;text-align:center;font-size:11px;font-family:${DEFAULT_FONT_FAMILY};">
        ${escapeHtml(formatFooterAddressLine(brand))}<br/>
        Du modtager dette nyhedsbrev, fordi du er ${escapeHtml(audienceFor(customerType))}.<br/>
        <a href="${escapeAttr(getUnsubscribeUrl())}" style="color:${textColor};font-family:${DEFAULT_FONT_FAMILY};">Afmeld nyhedsbrevet</a>
      </td></tr>`;
    }
  }
}

function renderBlockText(
  block: NewsletterBlock,
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
  brand: BrandSettings,
): string {
  switch (block.type) {
    case "header":
      return brand.name;

    case "overskrift":
      return stripHtml(block.content ?? "");

    case "brodtekst":
      return stripHtml(block.content ?? "");

    case "billede":
    case "img":
    case "galleri": {
      // Samme indhold i begge "Vis billede"-tilstande: én linje pr. produkt
      // med link; et uploadet billede med sin overskrift/pris (eller som
      // [Billede: ...], når det er synligt, men uden tekst).
      const lines = resolveMediaCards(block, products).flatMap((card) => {
        if (card.product) {
          return [
            `- ${card.product.title} (${card.product.productType}): ${formatPriceForCustomer(card.product.price, customerType)} – ${card.product.url}`,
          ];
        }
        const { title, price } = getMediaCardText(card, customerType);
        if (title || price) return [`- ${[title, price].filter(Boolean).join(": ")}`];
        return block.showImage === false ? [] : [`[Billede: ${card.alt || "Billede"}]`];
      });
      // Tom blok (intet billede) – udelades, ligesom i HTML-udgaven.
      return lines.join("\n");
    }

    case "socials": {
      const links = getSocialLinks(block);
      if (links.length === 0) return "";
      const heading = block.socialHeading?.trim();
      return [heading, ...links.map((link) => `${link.label}: ${link.url}`)].filter(Boolean).join("\n");
    }

    case "billedeblok":
      return (block.masonryImages ?? []).map((masonryImage) => `[Billede: ${masonryImage.altText || "Billede"}]`).join("  ");

    case "skillelinje":
      return "—————————";

    case "tekst":
      return stripHtml(block.content ?? "");

    case "produkt": {
      const product = products.find((item) => item.id === block.productId);
      if (!product) return "";
      return `- ${product.title} (${product.productType}): ${formatPriceForCustomer(product.price, customerType)}`;
    }

    case "cta":
      return `${stripHtml(block.content ?? "")}: ${block.ctaUrl ?? ""}`;

    case "footer":
      return `${formatFooterAddressLine(brand)}\nDu modtager dette nyhedsbrev, fordi du er ${audienceFor(customerType)}.\nAfmeld nyhedsbrevet: ${getUnsubscribeUrl()}`;
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
// Blokke, der kommer med i den kopierede mail: synlige – og for tekst-blokke
// (overskrift/brødtekst/tekst/knap) kun hvis de faktisk har indhold. En tom
// tekst-blok (fx en endnu ikke udfyldt placeholder fra "Blank skabelon")
// udelades, så hjælpeteksten aldrig ender i et udsendt nyhedsbrev.
function isExportable(block: NewsletterBlock): boolean {
  if (block.hidden) return false;
  return !(RICH_TEXT_BLOCK_TYPES.includes(block.type) && isBlankContent(block.content));
}

export function buildNewsletterHtml(
  blocks: NewsletterBlock[],
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
  brand: BrandSettings,
): string {
  const rows = blocks
    .filter(isExportable)
    .map((block) => renderBlockHtml(block, image, customerType, products, brand))
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
  brand: BrandSettings,
): string {
  return blocks
    .filter(isExportable)
    .map((block) => renderBlockText(block, image, customerType, products, brand))
    .filter((text) => text.trim() !== "")
    .join("\n\n");
}
