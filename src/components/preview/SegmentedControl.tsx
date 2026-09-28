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
    <div className="inline-flex items-center rounded-sm border border-[#dcdcd8] bg-[#f0f0ed] p-0.5 font-jetbrains text-xs">
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 rounded-[1px] border px-3 py-1 transition-colors ${
              isActive
                ? "border-neutral-300/80 bg-white font-semibold text-black shadow-xs"
                : "border-transparent text-neutral-600 hover:text-black"
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
