"use client";

import { useRef, useState, type FocusEvent } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";

interface TextBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
];

const FONT_SIZES = ["14", "16", "18", "20", "24"];

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
];

export function TextBlockEditor({ content, onChange }: TextBlockEditorProps) {
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
          class: "outline-none text-[13px] text-ink leading-relaxed",
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

  const defaultActiveState = {
    bold: false,
    italic: false,
    underline: false,
    fontFamily: "",
    fontSize: "",
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
    <div ref={containerRef} onFocus={handleFocus} onBlur={handleBlur} className="relative">
      {isFocused && (
        <div className="absolute bottom-full left-0 z-10 mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
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
            className="rounded-md border border-border bg-white px-2 py-1 text-xs text-ink-muted focus:outline-none"
          >
            <option value="">Skrifttype</option>
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          <select
            value={activeState.fontSize}
            onMouseDown={() => {
              if (editor) {
                const { from, to } = editor.state.selection;
                savedSelectionRef.current = { from, to };
              }
            }}
            onChange={(event) => {
              const value = `${event.target.value}px`;
              applyCommand((chain) => chain.setFontSize(value));
            }}
            className="rounded-md border border-border bg-white px-2 py-1 text-xs text-ink-muted focus:outline-none"
          >
            <option value="">Str.</option>
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <div className="mx-0.5 h-5 w-px bg-border" />

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand((chain) => chain.toggleBold())}
            aria-pressed={activeState.bold}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${
              activeState.bold ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
            }`}
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand((chain) => chain.toggleItalic())}
            aria-pressed={activeState.italic}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-sm italic ${
              activeState.italic ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
            }`}
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand((chain) => chain.toggleUnderline())}
            aria-pressed={activeState.underline}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-sm underline ${
              activeState.underline ? "bg-surface-active text-ink" : "text-ink-muted hover:bg-surface-active"
            }`}
          >
            U
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
