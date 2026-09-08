import { SpinnerIcon } from "@/components/icons";

// Delt loading-/fejl-tilstand for sider, der henter data direkte fra Shopify
// ved indlæsning (Vælg produkter, Kunder) – samme visuelle mønster begge
// steder, så brugeren aldrig bare ser en tom, uforklaret liste, mens der
// hentes, eller hvis kaldet fejler.

export function LoadingCard({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-muted">
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
      <div className="flex max-w-md flex-col gap-3 rounded-xl border border-border bg-white p-6">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Prøv igen
        </button>
      </div>
    </div>
  );
}
