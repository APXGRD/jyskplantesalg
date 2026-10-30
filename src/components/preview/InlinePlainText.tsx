"use client";

// Inline-redigering af ren tekst på én linje direkte i previewet –
// overskriften og CTA-knappens tekst. Bruger et contentEditable=
// "plaintext-only"-element i stedet for Tiptap (rig tekst), fordi teksten
// skal være uformateret; samme element som den viste tekst, så blokken ikke
// ændrer størrelse eller flytter sig. Ændringer sendes løbende (onTextChange
// → block.content), så sidepanelets felt følger med med det samme. Enter/
// klik udenfor afslutter, Escape gendanner teksten fra før redigeringen.

import { useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { limitPlainText } from "@/lib/newsletterBlocks";

// Tegntælleren vises, når teksten nærmer sig grænsen (fra 80 %).
const COUNTER_THRESHOLD = 0.8;

interface InlinePlainTextProps {
  // Den viste tekst (block.content som HTML) – vises uændret, indtil der
  // redigeres, så ældre formatering ikke forsvinder ved blot at se på den.
  html: string;
  // Samme tekst som ren tekst – udgangspunkt, når redigeringen starter.
  text: string;
  maxLength: number;
  placeholder?: string;
  ariaLabel: string;
  // "block" til overskriften (hele bredden), "inline" i knappen.
  display: "block" | "inline";
  editing: boolean;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onTextChange: (text: string) => void;
}

export function InlinePlainText({
  html,
  text,
  maxLength,
  placeholder,
  ariaLabel,
  display,
  editing,
  onStartEditing,
  onStopEditing,
  onTextChange,
}: InlinePlainTextProps) {
  const elementRef = useRef<HTMLElement>(null);
  const originalRef = useRef(text);
  const lastRef = useRef(text);
  const startedRef = useRef(false);
  const [length, setLength] = useState(text.length);

  // Ved start: fyld feltet med den aktuelle tekst, giv det fokus og sæt
  // markøren til sidst. Kører kun én gang pr. redigering (startedRef).
  useLayoutEffect(() => {
    if (!editing) {
      startedRef.current = false;
      return;
    }
    const element = elementRef.current;
    if (!element || startedRef.current) return;
    startedRef.current = true;
    originalRef.current = text;
    lastRef.current = text;
    element.textContent = text;
    element.focus();
    placeCaretAtEnd(element);
    setLength(text.length);
  }, [editing, text]);

  function handleInput() {
    const element = elementRef.current;
    if (!element) return;
    const raw = element.textContent ?? "";
    const next = limitPlainText(raw, lastRef.current, maxLength);
    if (next !== raw) {
      element.textContent = next;
      placeCaretAtEnd(element);
    }
    lastRef.current = next;
    setLength(next.length);
    onTextChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      elementRef.current?.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      lastRef.current = originalRef.current;
      onTextChange(originalRef.current);
      elementRef.current?.blur();
    }
  }

  function handleBlur() {
    const trimmed = lastRef.current.trim();
    if (trimmed !== lastRef.current) onTextChange(trimmed);
    onStopEditing();
  }

  // Indsat tekst: altid ren tekst på én linje (også i browsere uden
  // plaintext-only); grænsen håndhæves af handleInput.
  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " ");
    document.execCommand("insertText", false, pasted);
  }

  const Tag = display === "block" ? "div" : "span";
  const showCounter = editing && length >= maxLength * COUNTER_THRESHOLD;

  if (editing) {
    return (
      <Tag className="relative">
        <Tag
          key="edit"
          ref={(element: HTMLElement | null) => {
            elementRef.current = element;
          }}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          role="textbox"
          aria-label={ariaLabel}
          aria-multiline="false"
          data-placeholder={placeholder || "Skriv her…"}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onDrop={(event) => event.preventDefault()}
          className="cursor-text rounded-[2px] outline-1 outline-offset-2 outline-current outline-dashed empty:before:italic empty:before:content-[attr(data-placeholder)]"
        />
        {/* Diskret tegntæller, når grænsen nærmes – lagt ovenpå (absolut),
            så den ikke flytter layoutet. */}
        {showCounter && (
          <span
            aria-live="polite"
            className="pointer-events-none absolute top-full right-0 z-10 mt-1 rounded-xs bg-ink-deep/85 px-1.5 py-0.5 font-sans text-[10px] leading-none font-normal text-white not-italic tabular-nums"
          >
            {length}/{maxLength}
          </span>
        )}
      </Tag>
    );
  }

  return (
    <Tag key="view" onClick={onStartEditing} className="cursor-text">
      {html ? (
        <Tag dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="italic">{placeholder}</span>
      )}
    </Tag>
  );
}

function placeCaretAtEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
