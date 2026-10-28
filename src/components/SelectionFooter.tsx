import { ChevronRightIcon } from "./icons";

interface SelectionFooterProps {
  shown: number;
  total: number;
  nextDisabled: boolean;
  onNext?: () => void;
}

export function SelectionFooter({ shown, total, nextDisabled, onNext }: SelectionFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm text-stone">
        {shown} af {total} produkter vist
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex h-10 items-center gap-2 rounded-xs bg-plant px-5 text-[11px] font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-plant-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-plant"
      >
        Næste
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
