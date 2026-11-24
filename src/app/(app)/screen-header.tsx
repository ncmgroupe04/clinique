export default function ScreenHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="scr-title">{title}</h1>
        {subtitle && <p className="scr-sub">{subtitle}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-end justify-end gap-3 mr-7">{children}</div>}
    </header>
  );
}
