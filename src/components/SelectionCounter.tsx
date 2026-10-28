interface SelectionCounterProps {
  count: number;
}

export function SelectionCounter({ count }: SelectionCounterProps) {
  return (
    <span className="text-sm whitespace-nowrap">
      <span className="font-semibold text-forest">{count}</span>{" "}
      <span className="text-stone">valgt</span>
    </span>
  );
}
