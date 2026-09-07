import { mockShopData, type ShopifyProduct } from "@/lib/mock/mockShopifyData";
import { formatPriceForCustomer, type CustomerType } from "@/lib/format";
import type { GeneratedNewsletter } from "@/context/NewsletterContext";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

// heading/bodyText/cta.text kommer fra TextBlockEditor (Tiptap) og er derfor allerede
// simpel, formateret HTML (fx "<p>Tekst med <strong>fed</strong></p>") – skal IKKE
// escapes igen, ellers vises tags'ne som rå tekst i stedet for at blive fortolket.
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

// Bygger en selvstændig, indlejret HTML-udgave af nyhedsbrevet, klar til at blive
// skrevet til udklipsholderen som "text/html" (bevarer formatering ved indsættelse
// i fx Gmail, Outlook eller andre rige tekstfelter).
export function buildNewsletterHtml(
  result: GeneratedNewsletter,
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  const productRows = products
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

  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #d2ddd1;border-radius:16px;overflow:hidden;">
  <div style="background:#9caf88;color:#ffffff;text-align:center;padding:20px 32px;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:12px;">
    ${escapeHtml(mockShopData.storeName)}
  </div>
  <div style="padding:28px 32px;">
    <div style="color:#3a5837;font-size:24px;margin:0 0 16px;">${result.heading}</div>
    <p style="color:#4a5565;font-size:14px;line-height:1.6;margin:0 0 16px;">${escapeHtml(greetingFor(customerType))}</p>
    <div style="color:#4a5565;font-size:14px;line-height:1.6;margin:0 0 16px;">${result.bodyText}</div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">${productRows}</table>
    <p style="text-align:center;margin:24px 0 0;">
      <a href="${escapeAttr(result.cta.url)}" style="display:inline-block;background:#3a5837;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
        ${result.cta.text}
      </a>
    </p>
  </div>
  <div style="background:#f5f7f4;border-top:1px solid #d2ddd1;padding:20px 32px;text-align:center;color:#637862;font-size:11px;">
    Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890
  </div>
</div>`.trim();
}

// Ren tekst-udgave, brugt som fallback ("text/plain") for udklipsholdere/felter der
// ikke understøtter rig HTML.
export function buildNewsletterText(
  result: GeneratedNewsletter,
  customerType: CustomerType,
  products: ShopifyProduct[],
): string {
  const productLines = products
    .map(
      (product) =>
        `- ${product.title} (${product.productType}): ${formatPriceForCustomer(product.price, customerType)}`,
    )
    .join("\n");

  return [
    stripHtml(result.heading),
    "",
    greetingFor(customerType),
    "",
    stripHtml(result.bodyText),
    "",
    productLines,
    "",
    `${stripHtml(result.cta.text)}: ${result.cta.url}`,
    "",
    "Jysk Plantesalg · Skovvej 14 · 8000 Aarhus C · CVR 34 567 890",
  ].join("\n");
}
