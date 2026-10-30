"use client";

// Inline-redigering af rig tekst direkte i nyhedsbrevets preview (brødtekst
// og tekst-blokken): samme Tiptap-udvidelser som sidepanelets
// TextBlockEditor, så de to læser/skriver præcis samme HTML og holdes i synk
// via content-prop'en. Fed/kursiv/understreget via tastaturgenveje (Cmd/
// Ctrl+B/I/U) – ingen værktøjslinje ved blokken; skrifttype, størrelse,
// farve og justering rettes i sidepanelet. Escape gendanner teksten fra før
// redigeringen; klik udenfor gemmer (ændringer sendes løbende).

import { useEffect, useRef, type CSSProperties } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { EDITOR_EXTENSIONS } from "@/components/TextBlockEditor";

interface InlineTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  // Fokus i teksten (klik) vælger blokken, så sidepanelet viser den.
  onFocus: () => void;
  onBlur: () => void;
  // Sat udefra (Enter på blokken via tastaturet) → markøren i teksten.
  editing: boolean;
  placeholder?: string;
  ariaLabel: string;
  className: string;
  style: CSSProperties;
}

export function InlineTextEditor({
  content,
  onChange,
  onFocus,
  onBlur,
  editing,
  placeholder,
  ariaLabel,
  className,
  style,
}: InlineTextEditorProps) {
  // Teksten fra før redigeringen – gendannes ved Escape.
  const originalRef = useRef(content);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        ...EDITOR_EXTENSIONS,
        Placeholder.configure({ placeholder: placeholder || "Skriv her…", emptyEditorClass: "is-editor-empty" }),
      ],
      content,
      editorProps: {
        attributes: {
          // Fokus-stil som de øvrige inline-felter; outline flytter ikke
          // layoutet. tabindex -1: man tabber til blokken (og trykker Enter)
          // i stedet for direkte ind i teksten.
          class:
            "cursor-text rounded-[2px] outline-none focus:outline-1 focus:outline-offset-2 focus:outline-current focus:outline-dashed",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": ariaLabel,
          tabindex: "-1",
        },
        handleKeyDown: (view, event) => {
          if (event.key !== "Escape") return false;
          // Escape: gendan teksten fra før redigeringen – i editoren og i
          // blokken (og dermed sidepanelet) – og forlad feltet.
          const original = originalRef.current;
          editorRef.current?.commands.setContent(original, { emitUpdate: false });
          onChange(original);
          (view.dom as HTMLElement).blur();
          return true;
        },
      },
      onCreate: ({ editor }) => {
        editorRef.current = editor;
      },
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      onFocus: ({ editor }) => {
        originalRef.current = editor.getHTML();
        onFocus();
      },
      onBlur: () => onBlur(),
    },
    [],
  );

  // Ændringer udefra (sidepanelets felt, "Regenerér tekst", global
  // skrifttype osv.) vises her, uden at almindelig skrivning nulstiller
  // markøren.
  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Enter på blokken (tastatur) → markøren sidst i teksten.
  useEffect(() => {
    if (!editor || !editing || editor.isFocused) return;
    editor.commands.focus("end");
  }, [editor, editing]);

  if (!editor) {
    // Indtil editoren er klar (første render i browseren) vises den statiske
    // tekst, så blokken ikke blinker tom.
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return <EditorContent editor={editor} className={className} style={style} />;
}
