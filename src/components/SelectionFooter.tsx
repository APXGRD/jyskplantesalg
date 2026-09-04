import { ChevronRightIcon } from "./icons";

interface SelectionFooterProps {
  shown: number;
  total: number;
  nextDisabled: boolean;
  onNext?: () => void;
}

export function SelectionFooter({ shown, total, nextDisabled, onNext }: SelectionFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-8 pt-3 pb-4">
      <p className="text-[13px] text-ink-faint">
        {shown} af {total} produkter vist
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-100"
      >
        Næste
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
