import React from 'react';
import {
  InboxIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const DEFAULT_ROWS_PER_PAGE = 10;

const AppTable = ({
  columns,
  rows,
  rowKey = 'id',
  loading = false,
  emptyMessage = 'No items found.',
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  showToolbar,
  page = 0,
  rowsPerPage = DEFAULT_ROWS_PER_PAGE,
  totalRows = 0,
  onPageChange,
  minWidth = 900,
  showPagination = true,
  showHeader = true,
}) => {
  const getRowKey = (row, index) => (typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey]);

  const firstResult = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const lastResult = Math.min((page + 1) * rowsPerPage, totalRows);
  const canGoBack = page > 0;
  const canGoForward = lastResult < totalRows;
  const shouldShowToolbar = showToolbar ?? Boolean(onSearchChange || filters?.length);

  return (
    <div style={styles.card}>
      {/* Toolbar */}
      {shouldShowToolbar && (
        <div style={styles.toolbar}>
          {onSearchChange && (
            <div style={styles.searchWrap}>
              <MagnifyingGlassIcon style={styles.searchIcon} aria-hidden />
              <input
                type="text"
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}

          {filters?.length > 0 && (
            <div style={styles.filterBar}>
              {filters.map((filter) => {
                const active = activeFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => onFilterChange?.(filter.value)}
                    style={{
                      ...styles.filterBtn,
                      ...(active ? styles.filterBtnActive : {}),
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Loading...</p>
        </div>
      ) : rows.length === 0 ? (
        <div style={styles.emptyState}>
          <InboxIcon style={styles.emptyIcon} aria-hidden />
          <p style={styles.emptyText}>{emptyMessage}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...styles.table, minWidth }}>
            {showHeader && (
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} style={{ ...styles.th, ...col.headerStyle }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, index) => (
                <tr key={getRowKey(row, index)} style={styles.tr}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ ...styles.td, ...col.cellStyle }}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {showPagination && (
        <div style={styles.footer}>
          <span style={styles.resultText}>
            {totalRows === 0 ? 'No results' : `Showing ${firstResult} to ${lastResult} of ${totalRows} results`}
          </span>

          <div style={styles.pagination}>
            <button
              type="button"
              onClick={() => canGoBack && onPageChange?.(null, page - 1)}
              disabled={!canGoBack}
              aria-label="Previous page"
              style={{
                ...styles.pgBtn,
                ...(!canGoBack ? styles.pgBtnDisabled : {}),
              }}
            >
              <ChevronLeftIcon style={styles.pgIcon} />
            </button>

            <span style={styles.pgCurrent}>{page + 1}</span>

            <button
              type="button"
              onClick={() => canGoForward && onPageChange?.(null, page + 1)}
              disabled={!canGoForward}
              aria-label="Next page"
              style={{
                ...styles.pgBtn,
                ...(!canGoForward ? styles.pgBtnDisabled : {}),
              }}
            >
              <ChevronRightIcon style={styles.pgIcon} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: 'var(--surface)',
    border: '0.5px solid var(--gray-200)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '0.5px solid var(--gray-200)',
    flexWrap: 'wrap',
  },
  searchWrap: {
    position: 'relative',
    width: 'min(100%, 320px)',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 16,
    color: 'var(--gray-400)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: 36,
    padding: '0 12px 0 32px',
    border: '0.5px solid var(--gray-200)',
    borderRadius: 8,
    background: 'var(--gray-50)',
    fontSize: 14,
    color: 'var(--gray-900)',
    outline: 'none',
    fontFamily: 'inherit',
  },
  filterBar: {
    display: 'flex',
    gap: 4,
    background: 'var(--gray-100)',
    padding: 3,
    borderRadius: 8,
    border: '0.5px solid var(--gray-200)',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '5px 12px',
    border: '0.5px solid transparent',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 400,
    background: 'transparent',
    color: 'var(--gray-500)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: 'var(--surface)',
    color: 'var(--gray-900)',
    fontWeight: 500,
    borderColor: 'var(--gray-200)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--gray-400)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderBottom: '0.5px solid var(--gray-200)',
    whiteSpace: 'nowrap',
  },
  tr: {},
  td: {
    padding: '13px 16px',
    fontSize: 14,
    color: 'var(--gray-900)',
    borderBottom: '0.5px solid var(--gray-100)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    color: 'var(--gray-300)',
    margin: '0 auto 12px',
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--gray-500)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderTop: '0.5px solid var(--gray-200)',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultText: {
    fontSize: 13,
    color: 'var(--gray-500)',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pgBtn: {
    width: 36,
    height: 36,
    padding: 0,
    borderRadius: '50%',
    border: '1px solid var(--gray-200)',
    background: 'var(--surface)',
    color: 'var(--gray-700)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s',
  },
  pgIcon: {
    width: 16,
    height: 16,
    strokeWidth: 2.4,
  },
  pgBtnDisabled: {
    opacity: 1,
    color: 'var(--gray-300)',
    background: 'var(--gray-50)',
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  pgCurrent: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'var(--rra-blue)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 500,
  },
};

export default AppTable;
