"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { ColorSwatches } from "@/components/ColorSwatches";
import { FONT_FAMILIES } from "@/lib/fontFamilies";
import { BoldIcon, ChevronDownIcon, ItalicIcon, MinusIcon, PlusIcon, UnderlineIcon } from "@/components/icons";

interface TextBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
  // Blokkens skrifttype-/størrelse-/tekstfarve-udgangspunkt (se
  // NewsletterBlock.fontFamily/.fontSize/.textColor i newsletterBlocks.ts) –
  // vises som editorens standard, så den matcher Preview. Skrifttype OG
  // størrelse er BLOK-NIVEAU-egenskaber (se onFontFamilyChange/
  // onFontSizeChange herunder) – de kræver IKKE en tekst-markering. Fed/
  // kursiv/understreget er fortsat ord-specifikke Tiptap-mærker (så en
  // enkelt markeret del af teksten stadig kan formateres for sig), MEN
  // kræver heller IKKE længere en markering: uden én anvendes de på HELE
  // blokkens indhold med det samme (se applyCommand herunder).
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  // Sat af værktøjslinjens skrifttype-dropdown/størrelse-stepper herunder –
  // opdaterer HELE blokkens fontFamily/fontSize-felt med det samme (samme
  // mønster som textColor, se ColorSwatches-brugen ved kalderen i
  // EditorBlockList.tsx), IKKE et Tiptap-mærke på den aktuelle markering.
  // Kræver derfor kun, at editoren har fokus – ingen markeret tekst.
  onFontFamilyChange: (value: string) => void;
  onFontSizeChange: (value: number) => void;
  // Værktøjslinjens EGEN farve-swatches sætter et per-udsnit Tiptap-mærke
  // direkte i content-HTML'en – uafhængigt af blokkens textColor-felt.  For
  // CTA-knappens ét-linjes label giver det ingen mening (og gemmes IKKE i en
  // skabelon, da hele content'en regenereres frisk ved hver generering – se
  // newsletterBlocks.ts), så knappens tekstfarve skal UDELUKKENDE styres af
  // det fælles textColor-felt. Default true (uændret for overskrift/
  // brødtekst/tekst, hvor per-udsnit farve stadig er meningsfuldt).
  showColorPicker?: boolean;
}

const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 36;

const toolbarIconButtonClassName = (active: boolean) =>
  `flex h-7 w-7 items-center justify-center rounded-full ${
    active ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
  }`;

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    codeBlock: false,
    code: false,
    strike: false,
    horizontalRule: false,
    link: false,
  }),
  TextStyle,
  Color,
];

export function TextBlockEditor({
  content,
  onChange,
  fontFamily,
  fontSize,
  textColor,
  onFontFamilyChange,
  onFontSizeChange,
  showColorPicker = true,
}: TextBlockEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Klik på værktøjslinjen (knapper/dropdowns) flytter DOM-fokus væk fra selve
  // editoren, hvilket kan nulstille markeringen, før kommandoen når at køre.
  // Vi gemmer derfor den seneste markering løbende og genskaber den eksplicit,
  // når en værktøjslinje-handling udføres. Kun relevant for fed/kursiv/
  // understreget/farve herunder – skrifttype/størrelse er blok-niveau og har
  // derfor ikke brug for en markering at genskabe.
  const savedSelectionRef = useRef({ from: 0, to: 0 });

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: EDITOR_EXTENSIONS,
      content,
      editorProps: {
        attributes: {
          // NB: ingen text-ink (farve) OG ingen fast text-[13px] (størrelse)
          // her – begge skal komme fra wrapper-div'ens egen style/fontSize/
          // color herunder, så selve tekstfeltet reagerer på blokkens
          // fontSize/textColor. En class SAT DIREKTE på selve ProseMirror-
          // elementet vinder altid over en nedarvet værdi fra wrapperen,
          // uanset hvad fontSize/textColor er sat til – uden at det giver
          // fejl, ser det bare ud som om den per-blok størrelse-/
          // farve-vælger ikke gør noget i selve Edit-mode-listen.
          class: "outline-none leading-relaxed",
        },
      },
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        savedSelectionRef.current = { from, to };
      },
    },
    [],
  );

  // `useEditor`'s `content` (ovenfor) sættes KUN ved selve mount – Tiptap
  // synkroniserer IKKE efterfølgende prop-ændringer af sig selv. Uden denne
  // effekt ville en ekstern content-opdatering (fx "Regenerér tekst" i
  // EditorBlockList.tsx, som opdaterer block.content for et ALLEREDE
  // monteret blok-id) aldrig blive synlig i selve editoren, selvom
  // block.content i state rent faktisk er korrekt. `content !== editor.
  // getHTML()`-tjekket sikrer, at almindelig tastatur-indtastning (som
  // allerede ruller content tilbage til editorens EGEN getHTML() via
  // onChange ovenfor) IKKE selv trigger et unødvendigt setContent-kald, der
  // ville nulstille markørens position midt i skrivning – kun en RIGTIG
  // ekstern ændring (content ≠ editorens nuværende HTML) synkroniseres.
  // emitUpdate: false forhindrer dette setContent-kald i selv at udløse
  // onUpdate (og dermed et cirkulært onChange-kald tilbage).
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Bruges af fed/kursiv/understreget herunder – IKKE af skrifttype/
  // størrelse, som er rene blok-niveau-felter uden nogen markering
  // involveret (se onFontFamilyChange/onFontSizeChange). Har brugeren
  // rent faktisk MARKERET noget (from !== to), formateres fortsat kun den
  // markering – ord-specifik formatering virker altså stadig uændret. Er
  // markeringen derimod tom (kun en blinkende markør, ingen markering),
  // markeres HELE blokkens indhold først, så fed/kursiv/understreget
  // anvendes på al teksten med det samme – samme "ingen markering krævet"-
  // oplevelse som skrifttype/størrelse, i stedet for at knappen tilsyneladende
  // ikke gør noget (Tiptaps egen opførsel uden en markering: slår kun fed
  // TIL for tegn, der skrives EFTER markøren, ikke for allerede skrevet tekst).
  function applyCommand(run: (chain: ReturnType<NonNullable<typeof editor>["chain"]>) => void) {
    if (!editor) return;
    const { from, to } = savedSelectionRef.current;
    const hasSelection = from !== to;
    const chain = editor.chain().focus();
    if (hasSelection) {
      chain.setTextSelection({ from, to });
    } else {
      chain.selectAll();
    }
    run(chain);
    chain.run();
  }

  function stepFontSize(delta: number) {
    const current = fontSize ?? DEFAULT_FONT_SIZE;
    const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, current + delta));
    onFontSizeChange(next);
  }

  const defaultActiveState = {
    bold: false,
    italic: false,
    underline: false,
    color: "",
  };

  const activeState =
    useEditorState({
      editor,
      selector: ({ editor }) => {
        if (!editor) {
          return defaultActiveState;
        }
        return {
          bold: editor.isActive("bold"),
          italic: editor.isActive("italic"),
          underline: editor.isActive("underline"),
          color: editor.getAttributes("textStyle").color ?? "",
        };
      },
    }) ?? defaultActiveState;

  function handleFocus() {
    setIsFocused(true);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && containerRef.current?.contains(nextTarget)) {
      return;
    }
    setIsFocused(false);
  }

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="relative"
      // fontSize sættes ALTID til en konkret værdi (aldrig undefined) – i
      // modsætning til fontFamily/textColor, som roligt kan arve fra en
      // ansvarlig forfader, når de ikke er sat. Uden en eksplicit fallback
      // her ville selve tekstfeltet (nu uden sin tidligere faste
      // text-[13px]-class, se editorProps ovenfor) i stedet arve
      // block-kortets egen, langt større skriftstørrelse.
      style={{ fontFamily, fontSize: `${fontSize ?? DEFAULT_FONT_SIZE}px`, color: textColor || "var(--ink)" }}
    >
      {isFocused && (
        <div className="absolute bottom-full left-0 z-10 mb-2 flex h-11 w-fit items-center gap-0.5 rounded-full border border-border bg-surface px-2 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <div className="relative flex items-center">
            <select
              value={fontFamily ?? ""}
              onChange={(event) => onFontFamilyChange(event.target.value)}
              aria-label="Skrifttype"
              className="appearance-none rounded-full bg-transparent py-1 pr-5 pl-2 text-xs text-ink-muted hover:bg-surface-active focus:outline-none"
            >
              <option value="">Skrifttype</option>
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-1.5 h-2.5 w-2.5 text-ink-muted" />
          </div>

          <div className="mx-1 h-5 w-px bg-border" />

          <div className="flex items-center gap-0.5" aria-label="Skriftstørrelse">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => stepFontSize(-1)}
              aria-label="Mindre skrift"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-active"
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="w-4 text-center text-[11px] tabular-nums text-ink-muted">
              {fontSize ?? DEFAULT_FONT_SIZE}
            </span>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => stepFontSize(1)}
              aria-label="Større skrift"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-active"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>

          <div className="mx-1 h-5 w-px bg-border" />

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand((chain) => chain.toggleBold())}
            aria-pressed={activeState.bold}
            aria-label="Fed"
            title="Fed"
            className={toolbarIconButtonClassName(activeState.bold)}
          >
            <BoldIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand((chain) => chain.toggleItalic())}
            aria-pressed={activeState.italic}
            aria-label="Kursiv"
            title="Kursiv"
            className={toolbarIconButtonClassName(activeState.italic)}
          >
            <ItalicIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand((chain) => chain.toggleUnderline())}
            aria-pressed={activeState.underline}
            aria-label="Understreget"
            title="Understreget"
            className={toolbarIconButtonClassName(activeState.underline)}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>

          {showColorPicker && (
            <>
              <div className="mx-1 h-5 w-px bg-border" />

              <ColorSwatches
                value={activeState.color}
                onChange={(color) => applyCommand((chain) => chain.setColor(color))}
              />
            </>
          )}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
