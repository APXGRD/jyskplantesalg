"use client";

import { useRef, useState, type FocusEvent } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { ColorSwatches } from "@/components/ColorSwatches";
import { FONT_FAMILIES } from "@/lib/fontFamilies";
import { BoldIcon, ChevronDownIcon, ItalicIcon, MinusIcon, PlusIcon, UnderlineIcon } from "@/components/icons";

interface TextBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
  // Blokkens skrifttype- og tekstfarve-udgangspunkt sat af de globale vælgere
  // i Edit-mode (se NewsletterBlock.fontFamily/.textColor) – vises som
  // editorens standard, så den matcher Preview. Et enkelt tekstudsnit kan
  // stadig afvige herfra via værktøjslinjens egne dropdown/farve-swatches
  // herunder.
  fontFamily?: string;
  textColor?: string;
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
  FontFamily,
  FontSize,
  Color,
];

export function TextBlockEditor({
  content,
  onChange,
  fontFamily,
  textColor,
  showColorPicker = true,
}: TextBlockEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Klik på værktøjslinjen (knapper/dropdowns) flytter DOM-fokus væk fra selve
  // editoren, hvilket kan nulstille markeringen, før kommandoen når at køre.
  // Vi gemmer derfor den seneste markering løbende og genskaber den eksplicit,
  // når en værktøjslinje-handling udføres.
  const savedSelectionRef = useRef({ from: 0, to: 0 });

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: EDITOR_EXTENSIONS,
      content,
      editorProps: {
        attributes: {
          // NB: ingen text-ink (farve) her – den skal komme fra wrapper-div'ens
          // egen style/color herunder, så den reagerer på blokkens textColor.
          // Sættes den her i stedet (som en class direkte på selve
          // ProseMirror-elementet), vinder den altid over wrapperens nedarvede
          // farve, uanset hvad textColor er sat til – uden at det giver fejl,
          // ser det bare ud som om den globale/per-blok farve-vælger ikke gør
          // noget i selve Edit-mode-listen.
          class: "outline-none text-[13px] leading-relaxed",
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

  function applyCommand(run: (chain: ReturnType<NonNullable<typeof editor>["chain"]>) => void) {
    if (!editor) return;
    const chain = editor.chain().focus().setTextSelection(savedSelectionRef.current);
    run(chain);
    chain.run();
  }

  function stepFontSize(delta: number) {
    const current = Number(activeState.fontSize) || DEFAULT_FONT_SIZE;
    const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, current + delta));
    applyCommand((chain) => chain.setFontSize(`${next}px`));
  }

  const defaultActiveState = {
    bold: false,
    italic: false,
    underline: false,
    fontFamily: "",
    fontSize: "",
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
          fontFamily: editor.getAttributes("textStyle").fontFamily ?? "",
          fontSize: (editor.getAttributes("textStyle").fontSize ?? "").replace("px", ""),
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
      style={{ fontFamily, color: textColor || "var(--ink)" }}
    >
      {isFocused && (
        <div className="absolute bottom-full left-0 z-10 mb-2 flex h-11 w-fit items-center gap-0.5 rounded-full border border-border bg-white px-2 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
          <div className="relative flex items-center">
            <select
              value={activeState.fontFamily}
              onMouseDown={() => {
                if (editor) {
                  const { from, to } = editor.state.selection;
                  savedSelectionRef.current = { from, to };
                }
              }}
              onChange={(event) => {
                const value = event.target.value;
                applyCommand((chain) => chain.setFontFamily(value));
              }}
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
              {activeState.fontSize || DEFAULT_FONT_SIZE}
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
