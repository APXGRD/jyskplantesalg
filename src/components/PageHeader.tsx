interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function PageHeader({ title, subtitle, rightSlot }: PageHeaderProps) {
  return (
    <section className="flex flex-col justify-between gap-4 pt-8 pb-6 md:flex-row md:items-end">
      <div>
        <h1 className="font-garamond text-[1.75rem] leading-[1.3] tracking-tight text-forest md:text-4xl md:leading-[1.25]">
          {title}
        </h1>
        {subtitle && <p className="pt-1 text-sm text-stone">{subtitle}</p>}
      </div>
      {rightSlot && <div className="flex flex-wrap items-center gap-3">{rightSlot}</div>}
    </section>
  );
}
