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
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="scr-title">{title}</h1>
        {subtitle && <p className="scr-sub">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
