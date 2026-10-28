import { SpinnerIcon } from "@/components/icons";

// Delt loading-/fejl-tilstand for sider, der henter data direkte fra Shopify
// ved indlæsning (Vælg produkter, Kunder) – samme visuelle mønster begge
// steder, så brugeren aldrig bare ser en tom, uforklaret liste, mens der
// hentes, eller hvis kaldet fejler.

export function LoadingCard({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 py-16 text-stone">
        <SpinnerIcon className="h-6 w-6 animate-spin" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

export function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-md flex-col gap-3 rounded-xs border border-hairline bg-white p-6">
        <h2 className="font-garamond text-2xl leading-[1.35] font-medium text-forest">{title}</h2>
        <p className="text-sm text-rose-ink">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-10 w-fit items-center gap-2 rounded-xs bg-plant px-5 text-[11px] font-semibold tracking-[0.06em] text-white uppercase transition-colors hover:bg-plant-hover"
        >
          Prøv igen
        </button>
      </div>
    </div>
  );
}
