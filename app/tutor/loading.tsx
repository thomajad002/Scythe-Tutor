function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

export default function TutorLoading() {
  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-4 rounded-3xl border border-border bg-surface p-4">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-8 w-64" />
          </div>
          <SkeletonBlock className="aspect-[980/640] w-full max-w-[980px]" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
          <SkeletonBlock className="h-11 w-40" />
        </section>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-3xl border border-border bg-surface p-4">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-2 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </section>
        </aside>
      </div>
    </main>
  );
}
