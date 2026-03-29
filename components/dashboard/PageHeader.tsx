interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="heading-display text-3xl mb-1">{title}</h1>
        <p className="text-editorial text-bf-text-secondary max-w-xl">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
