interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, subtitle, rightSlot }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-8 py-5">
      <div>
        <h1 className="text-[17px] font-semibold text-ink">{title}</h1>
        {subtitle && <p className="pt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
      </div>
      {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
    </div>
  );
}
