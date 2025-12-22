
import React, { useState, useMemo } from 'react';
import { ScheduledJob, Asset } from '../types';
import SortableTable, { Column } from './SortableTable';

interface MonthlyJobsSectionProps {
  jobs: ScheduledJob[];
  assets: Asset[];
  onAddJob: () => void;
  onUpdateJob: (id: string, updates: Partial<ScheduledJob>) => void;
  onRemoveJob: (id: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyJobsSection: React.FC<MonthlyJobsSectionProps> = ({
  jobs,
  assets,
  onAddJob,
  onUpdateJob,
  onRemoveJob
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'all'>('month');

  // Filter jobs that are due in the selected month
  const filteredJobs = useMemo(() => {
    if (viewMode === 'all') return jobs;

    return jobs.filter(job => {
      const dueDate = new Date(job.dueDate);
      return dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear;
    });
  }, [jobs, selectedMonth, selectedYear, viewMode]);

  // Get job statistics for the current month
  const monthStats = useMemo(() => {
    const pending = filteredJobs.filter(j => j.status === 'Pending').length;
    const completed = filteredJobs.filter(j => j.status === 'Completed').length;
    const overdue = filteredJobs.filter(j => j.status === 'Overdue').length;
    return { pending, completed, overdue, total: filteredJobs.length };
  }, [filteredJobs]);

  // Calculate overdue status
  const getJobStatus = (job: ScheduledJob): ScheduledJob['status'] => {
    if (job.status === 'Completed') return 'Completed';
    const dueDate = new Date(job.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) return 'Overdue';
    return 'Pending';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const columns: Column<ScheduledJob>[] = [
    {
      key: 'dueDate',
      header: 'Due Date',
      width: 'w-28',
      render: (value) => (
        <span className="text-sm font-medium">{formatDate(value)}</span>
      )
    },
    {
      key: 'assetName',
      header: 'Asset',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-800">{value || 'Unassigned'}</div>
          <div className="text-xs text-slate-500">{row.location}</div>
        </div>
      )
    },
    {
      key: 'taskType',
      header: 'Task',
      render: (value) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'frequency',
      header: 'Frequency',
      width: 'w-24',
      render: (value) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          value === 'Weekly' ? 'bg-blue-100 text-blue-700' :
          value === 'Monthly' ? 'bg-green-100 text-green-700' :
          value === 'Quarterly' ? 'bg-amber-100 text-amber-700' :
          'bg-purple-100 text-purple-700'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-24',
      render: (_, row) => {
        const status = getJobStatus(row);
        return (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            status === 'Completed' ? 'bg-green-100 text-green-700' :
            status === 'Overdue' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {status}
          </span>
        );
      }
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      width: 'w-32',
      render: (value) => (
        <span className="text-sm text-slate-600">{value || '-'}</span>
      )
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      width: 'w-24',
      render: (_, row) => (
        <div className="flex gap-1">
          {row.status !== 'Completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateJob(row.id, { status: 'Completed' });
              }}
              className="text-green-600 hover:text-green-800 p-1"
              title="Mark Complete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveJob(row.id);
            }}
            className="text-red-400 hover:text-red-600 p-1"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            disabled={viewMode === 'all'}
          >
            {MONTHS.map((month, idx) => (
              <option key={month} value={idx}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            disabled={viewMode === 'all'}
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="flex bg-slate-100 p-1 rounded-lg ml-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'all' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              All Jobs
            </button>
          </div>
        </div>
        <button
          onClick={onAddJob}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Job
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-700">{monthStats.total}</div>
          <div className="text-xs text-slate-500">Total Jobs</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{monthStats.pending}</div>
          <div className="text-xs text-amber-600">Pending</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{monthStats.completed}</div>
          <div className="text-xs text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{monthStats.overdue}</div>
          <div className="text-xs text-red-600">Overdue</div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <SortableTable
          data={filteredJobs}
          columns={columns}
          keyField="id"
          emptyMessage={viewMode === 'month'
            ? `No jobs scheduled for ${MONTHS[selectedMonth]} ${selectedYear}`
            : 'No scheduled jobs. Add a job to get started.'}
        />
      </div>
    </div>
  );
};

export default MonthlyJobsSection;
