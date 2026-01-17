import React, { useMemo } from 'react';
import CategoryCard from './CategoryCard';

export default function CategoryRail({ categories = [], onCategoryClick, trackRef }) {
  const columns = useMemo(() => {
    const colsPerRow = 7;
    const rows = 2;
    const perPage = colsPerRow * rows;

    const result = [];
    for (let start = 0; start < categories.length; start += perPage) {
      const page = categories.slice(start, start + perPage);
      for (let c = 0; c < colsPerRow; c += 1) {
        const top = page[c] || null;
        const bottom = page[c + colsPerRow] || null;
        if (!top && !bottom) continue;
        result.push({ top, bottom, key: `${start}-${c}` });
      }
    }
    return result;
  }, [categories]);

  return (
    <div className="homepage__categories-rail" aria-label="Category navigation">
      <div className="homepage__categories-rail-track" role="list" ref={trackRef}>
        {columns.map((col) => (
          <div key={col.key} className="homepage__categories-column" role="listitem">
            {col.top ? (
              <CategoryCard category={col.top} onClick={onCategoryClick} />
            ) : (
              <div className="homepage__categories-spacer" aria-hidden="true" />
            )}
            {col.bottom ? (
              <CategoryCard category={col.bottom} onClick={onCategoryClick} />
            ) : (
              <div className="homepage__categories-spacer" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
