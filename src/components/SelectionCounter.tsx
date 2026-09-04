interface SelectionCounterProps {
  count: number;
}

export function SelectionCounter({ count }: SelectionCounterProps) {
  return (
    <span className="text-[13px] whitespace-nowrap">
      <span className="font-semibold text-ink">{count}</span>{" "}
      <span className="text-ink-muted">valgt</span>
    </span>
  );
}
