interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, subtitle, rightSlot }: PageHeaderProps) {
  return (
    // pt-16 (i stedet for py-5) under md-breakpointet giver plads til
    // Sidebar.tsx's faste hamburger-knap (top-4, h-9), som ellers ville
    // overlappe titlen – uændret py-5 fra md og opefter, hvor knappen slet
    // ikke vises.
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 pt-16 pb-4 md:px-8 md:py-5">
      <div>
        <h1 className="text-[17px] font-semibold text-ink">{title}</h1>
        {subtitle && <p className="pt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
      </div>
      {rightSlot && <div className="flex flex-wrap items-center gap-3">{rightSlot}</div>}
    </div>
  );
}
