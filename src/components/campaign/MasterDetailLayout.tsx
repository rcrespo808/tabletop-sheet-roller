"use client";

export function MasterDetailLayout({
  aside,
  children
}: {
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">{aside}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
