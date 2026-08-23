'use client';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 ring-1 ring-primary-500/25">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary-500" />
      </div>
      <p className="text-sm font-medium text-admin-fg">{title}</p>
      {description ? <p className="mt-1 text-sm text-admin-fg-subtle">{description}</p> : null}
    </div>
  );
}
