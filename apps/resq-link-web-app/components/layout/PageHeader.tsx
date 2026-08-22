import type { ReactNode } from 'react';

/**
 * Optional in-page toolbar for Super Admin pages.
 * Page title/description live in AdminHeader to avoid duplication.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  if (!title && !description && !actions) return null;

  const showCopy = Boolean(title || description);

  return (
    <div
      className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${
        showCopy ? '' : 'sm:justify-end'
      }`}
    >
      {showCopy ? (
        <div className="min-w-0">
          {title ? <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1> : null}
          {description ? (
            <p className={`max-w-2xl text-sm leading-relaxed text-slate-500 ${title ? 'mt-1.5' : ''}`}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
