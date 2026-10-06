// Klient-side forberedelse af Billedeblokkens masonry-gitter til den
// kopierede mail. computeMasonryGrid (newsletterBlocks.ts) giver hvert
// billede en visningshøjde, så alle kolonner flugter i bunden – i Preview
// klarer CSS (object-fit: cover) beskæringen, men mail-klienter som Outlook
// understøtter ikke object-fit. Her beskæres hvert billede derfor RIGTIGT
// (centreret, via canvas) til præcis sin plads, lige før nyhedsbrevet
// kopieres. De originale uploads i blokken røres ikke.

import {
  computeMasonryGrid,
  getMasonryColumns,
  getMasonryGapPx,
  getMasonryLayout,
  type MasonryImage,
  type NewsletterBlock,
} from "@/lib/newsletterBlocks";

// 2× opløsning, så billederne også er skarpe på retina-skærme.
const PIXEL_RATIO = 2;
const JPEG_QUALITY = 0.85;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Kunne ikke indlæse billedet"));
    image.src = src;
  });
}

// "Cover"-beskæring: fylder hele målet og skærer det overskydende af
// centreret – billedet forvrænges aldrig.
async function cropToCover(source: MasonryImage, width: number, height: number): Promise<MasonryImage> {
  const image = await loadImage(source.src);
  const canvas = document.createElement("canvas");
  canvas.width = width * PIXEL_RATIO;
  canvas.height = height * PIXEL_RATIO;
  const context = canvas.getContext("2d");
  if (!context) return source;
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
  // width/height beholdes BEVIDST som originalens: computeMasonryGrid
  // bruger dem til fordeling og højder, så den kopierede mail får PRÆCIS
  // samme gitter som Preview – kun selve billedfilen er skiftet ud med den
  // beskårne udgave, der passer til sin plads.
  return { ...source, src: canvas.toDataURL("image/jpeg", JPEG_QUALITY) };
}

// Returnerer en kopi af blokkene, hvor hver masonry-billedeblok har
// færdigbeskårne billeder – klar til buildNewsletterHtml (som placerer dem
// ud fra de uændrede width/height, se cropToCover). Fejler en
// beskæring, bruges originalen for netop det billede (så kopieringen ikke
// fejler helt).
export async function cropMasonryImagesForExport(blocks: NewsletterBlock[]): Promise<NewsletterBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      const images = block.masonryImages ?? [];
      if (block.type !== "billedeblok" || block.hidden || images.length === 0 || getMasonryLayout(block) !== "masonry") {
        return block;
      }
      const grid = computeMasonryGrid(images, getMasonryColumns(block), getMasonryGapPx(block));
      const cropped = new Map<string, MasonryImage>();
      await Promise.all(
        grid.columns.flat().map(async (cell) => {
          try {
            cropped.set(cell.image.id, await cropToCover(cell.image, grid.columnWidth, cell.height));
          } catch {
            cropped.set(cell.image.id, cell.image);
          }
        }),
      );
      return { ...block, masonryImages: images.map((image) => cropped.get(image.id) ?? image) };
    }),
  );
}
