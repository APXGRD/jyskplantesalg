interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: (props: { className?: string }) => React.JSX.Element;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface-badge p-0.5">
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-white text-ink shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
