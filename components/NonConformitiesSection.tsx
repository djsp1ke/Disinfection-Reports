
import React, { useState } from 'react';
import { NonConformity, ActionItem } from '../types';
import SortableTable, { Column } from './SortableTable';

interface NonConformitiesSectionProps {
  nonConformities: NonConformity[];
  onAddNonConformity: () => void;
  onUpdateNonConformity: (id: string, updates: Partial<NonConformity>) => void;
  onRemoveNonConformity: (id: string) => void;
  onAddAction: (ncId: string) => void;
  onUpdateAction: (ncId: string, actionId: string, updates: Partial<ActionItem>) => void;
  onRemoveAction: (ncId: string, actionId: string) => void;
  managementTeam?: { id: string; name: string; role: string }[];
}

const NonConformitiesSection: React.FC<NonConformitiesSectionProps> = ({
  nonConformities,
  onAddNonConformity,
  onUpdateNonConformity,
  onRemoveNonConformity,
  onAddAction,
  onUpdateAction,
  onRemoveAction,
  managementTeam = []
}) => {
  const [expandedNC, setExpandedNC] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'nonconformities' | 'actions'>('nonconformities');

  // Get all actions from all non-conformities for the actions view
  const allActions = nonConformities.flatMap(nc =>
    nc.actions.map(action => ({
      ...action,
      ncId: nc.id,
      ncDescription: nc.description,
      ncCategory: nc.category,
      ncLocation: nc.location
    }))
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'Major': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed':
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-amber-500 text-white';
      case 'Medium': return 'bg-blue-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  // Calculate stats
  const stats = {
    open: nonConformities.filter(nc => nc.status === 'Open').length,
    inProgress: nonConformities.filter(nc => nc.status === 'In Progress').length,
    closed: nonConformities.filter(nc => nc.status === 'Closed').length,
    actionsOpen: allActions.filter(a => a.status !== 'Completed').length,
    actionsOverdue: allActions.filter(a => {
      if (a.status === 'Completed') return false;
      const dueDate = new Date(a.dueDate);
      return dueDate < new Date();
    }).length
  };

  const ncColumns: Column<NonConformity>[] = [
    {
      key: 'dateIdentified',
      header: 'Date',
      width: 'w-24',
      render: (value) => <span className="text-sm">{formatDate(value)}</span>
    },
    {
      key: 'category',
      header: 'Category',
      width: 'w-32'
    },
    {
      key: 'description',
      header: 'Description',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-800 line-clamp-1">{value}</div>
          <div className="text-xs text-slate-500">{row.location}</div>
        </div>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      width: 'w-24',
      render: (value) => (
        <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      render: (value) => (
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 'w-20',
      render: (value: ActionItem[]) => (
        <div className="text-center">
          <span className="text-sm font-medium">{value?.length || 0}</span>
          <span className="text-xs text-slate-400 ml-1">items</span>
        </div>
      )
    }
  ];

  const actionColumns: Column<typeof allActions[0]>[] = [
    {
      key: 'dueDate',
      header: 'Due Date',
      width: 'w-24',
      render: (value, row) => {
        const isOverdue = row.status !== 'Completed' && new Date(value) < new Date();
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
            {formatDate(value)}
            {isOverdue && <span className="block text-xs">Overdue</span>}
          </span>
        );
      }
    },
    {
      key: 'description',
      header: 'Action',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-800 line-clamp-1">{value}</div>
          <div className="text-xs text-slate-500">NC: {row.ncDescription?.substring(0, 30)}...</div>
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 'w-20',
      render: (value) => (
        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      width: 'w-32'
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      render: (value) => (
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.open}</div>
          <div className="text-xs text-amber-600">Open NCs</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-blue-600">In Progress</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
          <div className="text-xs text-green-600">Closed</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-600">{stats.actionsOpen}</div>
          <div className="text-xs text-slate-600">Open Actions</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.actionsOverdue}</div>
          <div className="text-xs text-red-600">Overdue Actions</div>
        </div>
      </div>

      {/* View Toggle and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('nonconformities')}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              viewMode === 'nonconformities' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            Non-Conformities ({nonConformities.length})
          </button>
          <button
            onClick={() => setViewMode('actions')}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              viewMode === 'actions' ? 'bg-white shadow text-blue-600' : 'text-slate-600'
            }`}
          >
            Actions Log ({allActions.length})
          </button>
        </div>
        {viewMode === 'nonconformities' && (
          <button
            onClick={onAddNonConformity}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report NC
          </button>
        )}
      </div>

      {/* Non-Conformities View */}
      {viewMode === 'nonconformities' && (
        <div className="space-y-4">
          {nonConformities.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-600">No Non-Conformities</h3>
              <p className="text-sm text-slate-400">Great work! No issues have been reported.</p>
            </div>
          ) : (
            nonConformities.map(nc => (
              <div key={nc.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                {/* NC Header */}
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100"
                  onClick={() => setExpandedNC(expandedNC === nc.id ? null : nc.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(nc.severity)}`}>
                      {nc.severity}
                    </span>
                    <div>
                      <div className="font-medium text-slate-800">{nc.description}</div>
                      <div className="text-xs text-slate-500">{nc.category} | {nc.location} | {formatDate(nc.dateIdentified)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(nc.status)}`}>
                      {nc.status}
                    </span>
                    <span className="text-sm text-slate-500">{nc.actions.length} actions</span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${expandedNC === nc.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedNC === nc.id && (
                  <div className="p-4 border-t border-slate-200">
                    {/* NC Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                        <select
                          value={nc.status}
                          onChange={(e) => onUpdateNonConformity(nc.id, { status: e.target.value as NonConformity['status'] })}
                          className="w-full border rounded px-2 py-1 text-sm mt-1"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Severity</label>
                        <select
                          value={nc.severity}
                          onChange={(e) => onUpdateNonConformity(nc.id, { severity: e.target.value as NonConformity['severity'] })}
                          className="w-full border rounded px-2 py-1 text-sm mt-1"
                        >
                          <option value="Minor">Minor</option>
                          <option value="Major">Major</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Root Cause</label>
                        <input
                          type="text"
                          value={nc.rootCause || ''}
                          onChange={(e) => onUpdateNonConformity(nc.id, { rootCause: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm mt-1"
                          placeholder="Enter root cause..."
                        />
                      </div>
                    </div>

                    {/* Actions List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-700">Actions</h4>
                        <button
                          onClick={() => onAddAction(nc.id)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          + Add Action
                        </button>
                      </div>

                      {nc.actions.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-2">No actions assigned yet</p>
                      ) : (
                        <div className="space-y-2">
                          {nc.actions.map(action => (
                            <div key={action.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div className="md:col-span-2">
                                  <input
                                    type="text"
                                    value={action.description}
                                    onChange={(e) => onUpdateAction(nc.id, action.id, { description: e.target.value })}
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    placeholder="Action description..."
                                  />
                                </div>
                                <select
                                  value={action.assignedTo}
                                  onChange={(e) => onUpdateAction(nc.id, action.id, { assignedTo: e.target.value })}
                                  className="border rounded px-2 py-1 text-sm"
                                >
                                  <option value="">Assign to...</option>
                                  {managementTeam.map(p => (
                                    <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                                  ))}
                                </select>
                                <div className="flex gap-2">
                                  <input
                                    type="date"
                                    value={action.dueDate}
                                    onChange={(e) => onUpdateAction(nc.id, action.id, { dueDate: e.target.value })}
                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                  />
                                  <select
                                    value={action.priority}
                                    onChange={(e) => onUpdateAction(nc.id, action.id, { priority: e.target.value as ActionItem['priority'] })}
                                    className="border rounded px-2 py-1 text-sm"
                                  >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <select
                                  value={action.status}
                                  onChange={(e) => onUpdateAction(nc.id, action.id, { status: e.target.value as ActionItem['status'] })}
                                  className={`text-xs border rounded px-2 py-1 ${getStatusColor(action.status)}`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>
                                <button
                                  onClick={() => onRemoveAction(nc.id, action.id)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete NC Button */}
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => onRemoveNonConformity(nc.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete Non-Conformity
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Actions Log View */}
      {viewMode === 'actions' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <SortableTable
            data={allActions}
            columns={actionColumns}
            keyField="id"
            emptyMessage="No actions recorded yet"
          />
        </div>
      )}
    </div>
  );
};

export default NonConformitiesSection;
