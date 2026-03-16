export default function BrowserFrame({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-n-200 bg-n-0 shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-n-100 bg-n-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-mint-300" />
        {label && (
          <span className="mx-auto text-[12px] font-mono text-n-400">
            {label}
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
