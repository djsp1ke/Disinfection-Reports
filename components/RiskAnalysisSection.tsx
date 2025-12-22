
import React, { useState } from 'react';
import { SiteRiskAnalysis, ControlMeasure, ManagementPerson } from '../types';
import SortableTable, { Column } from './SortableTable';

interface RiskAnalysisSectionProps {
  riskAnalysis: SiteRiskAnalysis;
  onUpdateRiskAnalysis: (updates: Partial<SiteRiskAnalysis>) => void;
  onAddControlMeasure: () => void;
  onUpdateControlMeasure: (id: string, updates: Partial<ControlMeasure>) => void;
  onRemoveControlMeasure: (id: string) => void;
  managementTeam: ManagementPerson[];
}

const HAZARD_CATEGORIES = [
  'Legionella - Hot Water',
  'Legionella - Cold Water',
  'Legionella - Cooling Tower',
  'Legionella - Spa/Pool',
  'Scalding Risk',
  'Chemical Storage',
  'Water Quality',
  'Stagnation',
  'Dead Legs',
  'Temperature Control',
  'Backflow/Cross Connection',
  'Other'
];

const RiskAnalysisSection: React.FC<RiskAnalysisSectionProps> = ({
  riskAnalysis,
  onUpdateRiskAnalysis,
  onAddControlMeasure,
  onUpdateControlMeasure,
  onRemoveControlMeasure,
  managementTeam
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Very High': return 'bg-red-600 text-white';
      case 'High': return 'bg-red-500 text-white';
      case 'Medium': return 'bg-amber-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getRiskBorderColor = (risk: string) => {
    switch (risk) {
      case 'Very High': return 'border-red-500';
      case 'High': return 'border-red-400';
      case 'Medium': return 'border-amber-400';
      default: return 'border-green-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-green-100 text-green-700';
      case 'Implemented': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Calculate risk stats
  const stats = {
    veryHigh: riskAnalysis.controlMeasures.filter(cm => cm.riskRating === 'Very High').length,
    high: riskAnalysis.controlMeasures.filter(cm => cm.riskRating === 'High').length,
    medium: riskAnalysis.controlMeasures.filter(cm => cm.riskRating === 'Medium').length,
    low: riskAnalysis.controlMeasures.filter(cm => cm.riskRating === 'Low').length,
    pending: riskAnalysis.controlMeasures.filter(cm => cm.status === 'Pending').length,
    implemented: riskAnalysis.controlMeasures.filter(cm => cm.status === 'Implemented').length,
    verified: riskAnalysis.controlMeasures.filter(cm => cm.status === 'Verified').length
  };

  const columns: Column<ControlMeasure>[] = [
    {
      key: 'hazard',
      header: 'Hazard',
      render: (value, row) => (
        <div>
          <div className="font-medium text-slate-800">{value}</div>
          <div className="text-xs text-slate-500 line-clamp-1">{row.riskDescription}</div>
        </div>
      )
    },
    {
      key: 'riskRating',
      header: 'Risk',
      width: 'w-24',
      render: (value) => (
        <span className={`text-xs px-2 py-1 rounded ${getRiskColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'currentControls',
      header: 'Controls',
      render: (value) => (
        <span className="text-sm line-clamp-1">{value}</span>
      )
    },
    {
      key: 'responsiblePerson',
      header: 'Responsible',
      width: 'w-32',
      render: (value) => (
        <span className="text-sm">{value || '-'}</span>
      )
    },
    {
      key: 'targetDate',
      header: 'Target Date',
      width: 'w-28',
      render: (value) => (
        <span className="text-sm">{formatDate(value)}</span>
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
      key: 'id',
      header: '',
      sortable: false,
      width: 'w-20',
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(editingId === row.id ? null : row.id);
            }}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveControlMeasure(row.id);
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
      {/* Header with Overall Risk */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-red-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Site Risk Analysis</h3>
          <p className="text-sm text-slate-500">{riskAnalysis.siteName || 'Current Site'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase">Overall Risk</div>
            <select
              value={riskAnalysis.overallRiskRating}
              onChange={(e) => onUpdateRiskAnalysis({ overallRiskRating: e.target.value as SiteRiskAnalysis['overallRiskRating'] })}
              className={`mt-1 font-bold text-center rounded px-3 py-1 border-0 ${getRiskColor(riskAnalysis.overallRiskRating)}`}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase">Review Date</div>
            <input
              type="date"
              value={riskAnalysis.reviewDate}
              onChange={(e) => onUpdateRiskAnalysis({ reviewDate: e.target.value })}
              className="mt-1 border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="bg-red-600 text-white rounded-lg p-2 text-center">
          <div className="text-xl font-bold">{stats.veryHigh}</div>
          <div className="text-[10px] opacity-90">Very High</div>
        </div>
        <div className="bg-red-500 text-white rounded-lg p-2 text-center">
          <div className="text-xl font-bold">{stats.high}</div>
          <div className="text-[10px] opacity-90">High</div>
        </div>
        <div className="bg-amber-500 text-white rounded-lg p-2 text-center">
          <div className="text-xl font-bold">{stats.medium}</div>
          <div className="text-[10px] opacity-90">Medium</div>
        </div>
        <div className="bg-green-500 text-white rounded-lg p-2 text-center">
          <div className="text-xl font-bold">{stats.low}</div>
          <div className="text-[10px] opacity-90">Low</div>
        </div>
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-slate-600">{stats.pending}</div>
          <div className="text-[10px] text-slate-500">Pending</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-blue-600">{stats.implemented}</div>
          <div className="text-[10px] text-blue-600">Implemented</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-green-600">{stats.verified}</div>
          <div className="text-[10px] text-green-600">Verified</div>
        </div>
      </div>

      {/* Controls and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase">Assessor</label>
            <input
              type="text"
              value={riskAnalysis.assessor}
              onChange={(e) => onUpdateRiskAnalysis({ assessor: e.target.value })}
              className="border rounded px-2 py-1 text-sm"
              placeholder="Assessor name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase">Assessment Date</label>
            <input
              type="date"
              value={riskAnalysis.assessmentDate}
              onChange={(e) => onUpdateRiskAnalysis({ assessmentDate: e.target.value })}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'cards' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              Table
            </button>
          </div>
          <button
            onClick={onAddControlMeasure}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Control Measure
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <SortableTable
            data={riskAnalysis.controlMeasures}
            columns={columns}
            keyField="id"
            emptyMessage="No control measures added yet"
            onRowClick={(row) => setEditingId(editingId === row.id ? null : row.id)}
          />
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {riskAnalysis.controlMeasures.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-500">No Control Measures</h3>
              <p className="text-sm text-slate-400">Add control measures to document risk mitigation</p>
            </div>
          ) : (
            riskAnalysis.controlMeasures.map(cm => (
              <div
                key={cm.id}
                className={`border-l-4 ${getRiskBorderColor(cm.riskRating)} bg-white border border-slate-200 rounded-lg overflow-hidden`}
              >
                {/* Card Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                  onClick={() => setEditingId(editingId === cm.id ? null : cm.id)}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded ${getRiskColor(cm.riskRating)}`}>
                      {cm.riskRating}
                    </span>
                    <div>
                      <div className="font-medium text-slate-800">{cm.hazard}</div>
                      <div className="text-sm text-slate-500">{cm.riskDescription}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-medium text-slate-700">{cm.responsiblePerson || 'Unassigned'}</div>
                      <div className="text-xs text-slate-400">Due: {formatDate(cm.targetDate)}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(cm.status)}`}>
                      {cm.status}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${editingId === cm.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Edit Form */}
                {editingId === cm.id && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Hazard Category</label>
                        <select
                          value={cm.hazard}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { hazard: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          {HAZARD_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Risk Rating</label>
                        <select
                          value={cm.riskRating}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { riskRating: e.target.value as ControlMeasure['riskRating'] })}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Very High">Very High</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Responsible Person</label>
                        <select
                          value={cm.responsiblePerson}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { responsiblePerson: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">Select person...</option>
                          {managementTeam.map(p => (
                            <option key={p.id} value={p.name}>{p.name} - {p.role}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs font-medium text-slate-500 uppercase">Risk Description</label>
                        <textarea
                          value={cm.riskDescription}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { riskDescription: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm h-16 resize-none"
                          placeholder="Describe the risk..."
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs font-medium text-slate-500 uppercase">Current Controls</label>
                        <textarea
                          value={cm.currentControls}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { currentControls: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm h-16 resize-none"
                          placeholder="What controls are currently in place?"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2 lg:col-span-3">
                        <label className="text-xs font-medium text-slate-500 uppercase">Additional Controls Required</label>
                        <textarea
                          value={cm.additionalControls}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { additionalControls: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm h-16 resize-none"
                          placeholder="What additional controls are needed?"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Target Date</label>
                        <input
                          type="date"
                          value={cm.targetDate}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { targetDate: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                        <select
                          value={cm.status}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { status: e.target.value as ControlMeasure['status'] })}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Implemented">Implemented</option>
                          <option value="Verified">Verified</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase">Verification Date</label>
                        <input
                          type="date"
                          value={cm.verificationDate || ''}
                          onChange={(e) => onUpdateControlMeasure(cm.id, { verificationDate: e.target.value })}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          disabled={cm.status !== 'Verified'}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => onRemoveControlMeasure(cm.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete Control Measure
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RiskAnalysisSection;
