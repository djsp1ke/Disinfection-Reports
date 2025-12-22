
import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  className?: string;
  emptyMessage?: string;
  striped?: boolean;
  compact?: boolean;
  onRowClick?: (row: T) => void;
}

type SortDirection = 'asc' | 'desc' | null;

function SortableTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  className = '',
  emptyMessage = 'No data available',
  striped = true,
  compact = false,
  onRowClick
}: SortableTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle dates
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const dateA = Date.parse(aValue);
        const dateB = Date.parse(bValue);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      if (sortDirection === 'asc') {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    });
  }, [data, sortColumn, sortDirection]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortColumn !== columnKey) {
      return (
        <svg className="w-4 h-4 text-slate-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-blue-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getValue = (row: T, key: string): any => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj, k) => obj?.[k], row as any);
    }
    return row[key];
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase bg-slate-50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`${compact ? 'py-2 px-2' : 'py-3 px-4'} ${column.width || ''} ${
                  column.sortable !== false ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                } ${column.className || ''}`}
                onClick={() => column.sortable !== false && handleSort(String(column.key))}
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable !== false && <SortIcon columnKey={String(column.key)} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-400 italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr
                key={String(row[keyField])}
                className={`border-b border-slate-100 last:border-0 ${
                  striped && index % 2 === 1 ? 'bg-slate-50/50' : ''
                } ${onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={`${String(row[keyField])}-${String(column.key)}`}
                    className={`${compact ? 'py-2 px-2' : 'py-3 px-4'} ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(getValue(row, String(column.key)), row, index)
                      : getValue(row, String(column.key)) ?? '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SortableTable;
