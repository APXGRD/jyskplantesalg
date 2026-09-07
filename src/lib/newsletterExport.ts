import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";
import type { NewsletterBlock } from "@/lib/newsletterBlocks";

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
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function greetingFor(customerType: CustomerType): string {
  return customerType === "erhverv" ? "Kære erhvervskunde," : "Kære privatkunde,";
}

const CLOSING_TEXT =
  "Ønsker du at se planterne på stedet eller modtage et uforpligtende tilbud? Kontakt os direkte – vi rådgiver gerne om valg og placering.";

function audienceFor(customerType: CustomerType): string {
  return customerType === "erhverv" ? "registreret erhvervskunde" : "tilmeldt vores nyhedsbrev";
}

function renderBlockHtml(
  block: NewsletterBlock,
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  switch (block.type) {
    case "header":
      return `<div style="background:#9caf88;color:#ffffff;text-align:center;padding:20px 32px;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:12px;">${escapeHtml(mockShopData.storeName)}</div>`;

    case "overskrift":
      return `<div style="padding:12px 32px;"><div style="color:#3a5837;font-size:24px;">${block.content ?? ""}</div></div>`;

    case "brodtekst":
      return `<div style="padding:12px 32px;">
        <p style="color:#4a5565;font-size:14px;line-height:1.6;margin:0 0 16px;">${escapeHtml(greetingFor(customerType))}</p>
        <div style="color:#4a5565;font-size:14px;line-height:1.6;margin:0 0 16px;">${block.content ?? ""}</div>
        <p style="color:#4a5565;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(CLOSING_TEXT)}</p>
      </div>`;

    case "billede":
      return `<div style="padding:12px 32px;text-align:center;">
        <div style="background:#e8efe7;border-radius:12px;padding:32px;color:#87a084;font-size:11px;">${escapeHtml(image.altText)}</div>
      </div>`;

    case "produktvisning": {
      const rows = products
        .map(
          (product) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #d2ddd1;">
            <div style="font-weight:600;color:#3a5837;font-size:13px;">${escapeHtml(product.title)}</div>
            <div style="color:#637862;font-size:12px;">${escapeHtml(product.productType)}</div>
          </td>
          <td style="padding:10px 0;border-top:1px solid #d2ddd1;text-align:right;font-weight:600;color:#3a5837;font-size:13px;white-space:nowrap;">
            ${escapeHtml(formatPriceForCustomer(product.price, customerType))}
          </td>
        </tr>`,
        )
        .join("");
      return `<div style="padding:12px 32px;"><table style="width:100%;border-collapse:collapse;">${rows}</table></div>`;
    }

    case "skillelinje":
      return `<div style="padding:12px 32px;"><hr style="border:none;border-top:1px solid #d2ddd1;margin:0;" /></div>`;

    case "tekst":
      return `<div style="padding:12px 32px;"><div style="color:#4a5565;font-size:14px;line-height:1.6;">${block.content ?? ""}</div></div>`;

    case "img":
      return `<div style="padding:12px 32px;text-align:center;color:#87a084;font-size:11px;">[Billede]</div>`;

    case "produkt": {
      const product = products.find((item) => item.id === block.productId);
      if (!product) return "";
      return `<div style="padding:12px 32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px;border:1px solid #d2ddd1;border-radius:12px;">
              <div style="font-weight:600;color:#3a5837;font-size:13px;">${escapeHtml(product.title)}</div>
              <div style="color:#637862;font-size:12px;">${escapeHtml(product.productType)}</div>
            </td>
            <td style="padding:10px;border:1px solid #d2ddd1;text-align:right;font-weight:600;color:#3a5837;font-size:13px;white-space:nowrap;">
              ${escapeHtml(formatPriceForCustomer(product.price, customerType))}
            </td>
          </tr>
        </table>
      </div>`;
    }

    case "cta":
      return `<div style="padding:12px 32px;text-align:center;">
        <a href="${escapeAttr(block.ctaUrl || "#")}" style="display:inline-block;background:#3a5837;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
          ${block.content ?? ""}
        </a>
      </div>`;

    case "footer":
      return `<div style="background:#f5f7f4;border-top:1px solid #d2ddd1;padding:20px 32px;text-align:center;color:#637862;font-size:11px;">
        Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890<br/>
        Du modtager dette nyhedsbrev, fordi du er ${escapeHtml(audienceFor(customerType))}.
      </div>`;
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
      return [greetingFor(customerType), stripHtml(block.content ?? ""), CLOSING_TEXT].join("\n\n");

    case "billede":
      return `[Billede: ${image.altText}]`;

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
      return "[Billede]";

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
export function buildNewsletterHtml(
  blocks: NewsletterBlock[],
  image: GeneratedNewsletter["image"],
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  const inner = blocks
    .filter((block) => !block.hidden)
    .map((block) => renderBlockHtml(block, image, customerType, products))
    .join("\n");

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #d2ddd1;border-radius:16px;overflow:hidden;">${inner}</div>`.trim();
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
