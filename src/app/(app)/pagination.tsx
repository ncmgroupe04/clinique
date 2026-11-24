"use client";

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
      <span className="text-xs text-muted">
        Page {page} sur {totalPages} · {total} résultat(s)
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-secondary"
          style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12 }}
        >
          Précédent
        </button>
        {pages.map((n, idx, arr) => {
          const prev = arr[idx - 1];
          const ellipsis = prev && n - prev > 1;
          return (
            <span key={n} className="flex items-center gap-1">
              {ellipsis && <span className="px-1 text-muted">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(n)}
                className={n === page ? "go" : "btn-secondary"}
                style={{ height: 32, width: 32, padding: 0, borderRadius: 10, fontSize: 12 }}
              >
                {n}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-secondary"
          style={{ height: 32, padding: "0 12px", borderRadius: 10, fontSize: 12 }}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
