// Fælles Stitch-stil for dialoger og sidepaneler (Gem skabelon, Send
// test-mail, bekræft sletning, kundepanelet) – samme farver, typografi og
// knapregler som resten af sitet: grønne knapper bliver grå ved hover,
// kontur-knapper får grøn kant/tekst og fyldes grå ved hover.

export const dialogOverlayClassName = "absolute inset-0 bg-ink-deep/30";

export const dialogPanelClassName =
  "relative w-full max-w-md rounded-sm border border-hairline bg-white p-6 font-sans text-ink-deep shadow-[0_8px_24px_rgba(22,51,40,0.12)]";

export const dialogTitleClassName = "font-garamond text-2xl leading-[1.35] font-medium tracking-tight text-forest";

export const dialogDescriptionClassName = "pt-1 text-sm leading-relaxed text-stone";

export const dialogLabelClassName = "text-[11px] font-semibold tracking-wider text-stone uppercase";

export const dialogFieldClassName =
  "w-full rounded-xs border-[0.5px] border-forest bg-white px-3.5 py-2.5 text-sm text-ink-deep transition-colors placeholder:text-stone focus:ring-1 focus:ring-forest/30 focus:outline-none";

export const dialogCancelButtonClassName =
  "flex h-11 flex-1 items-center justify-center rounded-xs border-[0.5px] border-forest bg-transparent px-4 text-[11px] font-semibold tracking-[0.06em] text-forest uppercase transition-colors hover:border-plant-hover hover:bg-plant-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-forest disabled:hover:bg-transparent disabled:hover:text-forest";

export const dialogPrimaryButtonClassName =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-xs bg-plant px-4 text-[11px] font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-plant-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-plant";

// Til handlinger, der ikke kan fortrydes (fx slet) – samme form, rød tone.
export const dialogDangerButtonClassName =
  "flex h-11 flex-1 items-center justify-center rounded-xs bg-rose-ink px-4 text-[11px] font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-plant-hover";

export const dialogErrorClassName = "rounded-xs bg-rose-bg px-3 py-2 text-sm text-rose-ink";

export const dialogSuccessClassName = "flex items-center gap-1.5 rounded-xs bg-mint px-3 py-2 text-sm text-forest";
