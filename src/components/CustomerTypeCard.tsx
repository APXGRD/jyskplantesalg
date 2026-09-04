interface CustomerTypeCardProps {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function CustomerTypeCard({ title, description, selected, onSelect }: CustomerTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-start rounded-xl border-2 p-5 text-left transition-colors ${
        selected ? "border-ink bg-primary" : "border-border bg-white hover:border-ink-faintest"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-ink bg-ink" : "border-ink-faintest bg-transparent"
          }`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className={`text-sm font-semibold ${selected ? "text-white" : "text-ink"}`}>{title}</span>
      </span>
      <span className={`pt-2.5 pl-6 text-xs leading-relaxed ${selected ? "text-white" : "text-ink-muted"}`}>
        {description}
      </span>
    </button>
  );
}
