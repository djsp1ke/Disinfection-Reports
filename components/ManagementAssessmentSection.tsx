
import React, { useState } from 'react';
import { ManagementAssessment, ManagementPerson, ManagementQuestion } from '../types';
import SortableTable, { Column } from './SortableTable';

interface ManagementAssessmentSectionProps {
  assessment: ManagementAssessment;
  onUpdateAssessment: (updates: Partial<ManagementAssessment>) => void;
  onAddPerson: () => void;
  onUpdatePerson: (id: string, updates: Partial<ManagementPerson>) => void;
  onRemovePerson: (id: string) => void;
  onUpdateQuestion: (id: string, updates: Partial<ManagementQuestion>) => void;
}

// Default questions for management control assessment
const DEFAULT_QUESTIONS: ManagementQuestion[] = [
  // Governance & Responsibility
  { id: 'q1', category: 'Governance', question: 'Is there a named "Responsible Person" for water safety?', response: '', evidence: '', notes: '' },
  { id: 'q2', category: 'Governance', question: 'Is there a named "Duty Holder" with overall accountability?', response: '', evidence: '', notes: '' },
  { id: 'q3', category: 'Governance', question: 'Is there a written policy for water safety management?', response: '', evidence: '', notes: '' },
  { id: 'q4', category: 'Governance', question: 'Is the Water Safety Group/Committee established?', response: '', evidence: '', notes: '' },
  { id: 'q5', category: 'Governance', question: 'Are roles and responsibilities clearly defined and documented?', response: '', evidence: '', notes: '' },

  // Risk Assessment
  { id: 'q6', category: 'Risk Assessment', question: 'Is there a current Legionella Risk Assessment in place?', response: '', evidence: '', notes: '' },
  { id: 'q7', category: 'Risk Assessment', question: 'Is the risk assessment reviewed at least every 2 years?', response: '', evidence: '', notes: '' },
  { id: 'q8', category: 'Risk Assessment', question: 'Are significant changes triggering risk assessment reviews?', response: '', evidence: '', notes: '' },
  { id: 'q9', category: 'Risk Assessment', question: 'Are all water systems included in the risk assessment?', response: '', evidence: '', notes: '' },

  // Written Scheme
  { id: 'q10', category: 'Written Scheme', question: 'Is there a Written Scheme of Control in place?', response: '', evidence: '', notes: '' },
  { id: 'q11', category: 'Written Scheme', question: 'Does the scheme detail monitoring frequencies?', response: '', evidence: '', notes: '' },
  { id: 'q12', category: 'Written Scheme', question: 'Are corrective actions clearly defined?', response: '', evidence: '', notes: '' },

  // Monitoring & Records
  { id: 'q13', category: 'Monitoring', question: 'Are temperature monitoring records maintained?', response: '', evidence: '', notes: '' },
  { id: 'q14', category: 'Monitoring', question: 'Are water sampling records available?', response: '', evidence: '', notes: '' },
  { id: 'q15', category: 'Monitoring', question: 'Are all monitoring activities documented appropriately?', response: '', evidence: '', notes: '' },
  { id: 'q16', category: 'Monitoring', question: 'Is there a system for tracking out-of-specification results?', response: '', evidence: '', notes: '' },

  // Training & Competence
  { id: 'q17', category: 'Training', question: 'Have all relevant staff received Legionella awareness training?', response: '', evidence: '', notes: '' },
  { id: 'q18', category: 'Training', question: 'Are training records maintained and up to date?', response: '', evidence: '', notes: '' },
  { id: 'q19', category: 'Training', question: 'Is refresher training provided at appropriate intervals?', response: '', evidence: '', notes: '' },

  // Contractor Management
  { id: 'q20', category: 'Contractors', question: 'Are water treatment contractors properly vetted?', response: '', evidence: '', notes: '' },
  { id: 'q21', category: 'Contractors', question: 'Are contractor qualifications and competencies verified?', response: '', evidence: '', notes: '' },
  { id: 'q22', category: 'Contractors', question: 'Is contractor performance regularly reviewed?', response: '', evidence: '', notes: '' },

  // Communication
  { id: 'q23', category: 'Communication', question: 'Is there a process for reporting water safety incidents?', response: '', evidence: '', notes: '' },
  { id: 'q24', category: 'Communication', question: 'Are water safety issues communicated to senior management?', response: '', evidence: '', notes: '' },
  { id: 'q25', category: 'Communication', question: 'Is there a process for tenant/user communication on water safety?', response: '', evidence: '', notes: '' }
];

const ManagementAssessmentSection: React.FC<ManagementAssessmentSectionProps> = ({
  assessment,
  onUpdateAssessment,
  onAddPerson,
  onUpdatePerson,
  onRemovePerson,
  onUpdateQuestion
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'questions' | 'summary'>('team');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Calculate score
  const calculateScore = () => {
    const answeredQuestions = assessment.questions.filter(q => q.response && q.response !== '');
    const yesCount = assessment.questions.filter(q => q.response === 'Yes').length;
    const partialCount = assessment.questions.filter(q => q.response === 'Partial').length;
    const totalApplicable = assessment.questions.filter(q => q.response !== 'N/A' && q.response !== '').length;

    if (totalApplicable === 0) return 0;
    return Math.round(((yesCount + partialCount * 0.5) / totalApplicable) * 100);
  };

  const score = calculateScore();
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Group questions by category
  const questionsByCategory = assessment.questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, ManagementQuestion[]>);

  const managementColumns: Column<ManagementPerson>[] = [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'responsibilities',
      header: 'Responsibilities',
      render: (value: string[]) => (
        <div className="text-xs">
          {value?.slice(0, 2).join(', ')}
          {value?.length > 2 && ` +${value.length - 2} more`}
        </div>
      )
    },
    {
      key: 'id',
      header: '',
      sortable: false,
      width: 'w-16',
      render: (_, row) => (
        <button
          onClick={() => onRemovePerson(row.id)}
          className="text-red-400 hover:text-red-600 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header with Score */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Management Control Assessment</h3>
          <p className="text-sm text-slate-500">HSE ACoP L8 & HSG274 Compliance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}%</div>
            <div className="text-xs text-slate-500">Compliance Score</div>
          </div>
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
            score >= 80 ? 'border-green-500 bg-green-50' :
            score >= 60 ? 'border-amber-500 bg-amber-50' :
            'border-red-500 bg-red-50'
          }`}>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score >= 80 ? 'A' : score >= 60 ? 'B' : 'C'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {(['team', 'questions', 'summary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
              activeTab === tab ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab === 'team' ? 'Management Team' : tab === 'questions' ? 'Assessment Questions' : 'Summary'}
          </button>
        ))}
      </div>

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-slate-700">Management Structure</h4>
            <button
              onClick={onAddPerson}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Person
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <SortableTable
              data={assessment.managementTeam}
              columns={managementColumns}
              keyField="id"
              emptyMessage="No management team members added yet"
            />
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {Object.entries(questionsByCategory).map(([category, questions]) => {
            const categoryScore = questions.filter(q => q.response === 'Yes').length;
            const categoryTotal = questions.filter(q => q.response && q.response !== 'N/A').length;
            const isExpanded = expandedCategory === category;

            return (
              <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium text-slate-800">{category}</span>
                    <span className="text-xs text-slate-500">({questions.length} questions)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">
                      {categoryScore}/{categoryTotal || '0'}
                    </span>
                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${categoryTotal > 0 && categoryScore === categoryTotal ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: categoryTotal > 0 ? `${(categoryScore / categoryTotal) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="p-4 bg-white">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 font-medium mb-2">
                              {idx + 1}. {q.question}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(['Yes', 'No', 'Partial', 'N/A'] as const).map(option => (
                                <button
                                  key={option}
                                  onClick={() => onUpdateQuestion(q.id, { response: option })}
                                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                    q.response === option
                                      ? option === 'Yes' ? 'bg-green-100 border-green-500 text-green-700' :
                                        option === 'No' ? 'bg-red-100 border-red-500 text-red-700' :
                                        option === 'Partial' ? 'bg-amber-100 border-amber-500 text-amber-700' :
                                        'bg-slate-100 border-slate-400 text-slate-600'
                                      : 'border-slate-200 text-slate-500 hover:border-slate-400'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              placeholder="Evidence reference..."
                              value={q.evidence || ''}
                              onChange={(e) => onUpdateQuestion(q.id, { evidence: e.target.value })}
                              className="w-full text-xs border rounded px-2 py-1.5"
                            />
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={q.notes || ''}
                              onChange={(e) => onUpdateQuestion(q.id, { notes: e.target.value })}
                              className="w-full text-xs border rounded px-2 py-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Category Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-700 mb-4">Category Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(questionsByCategory).map(([category, questions]) => {
                const yes = questions.filter(q => q.response === 'Yes').length;
                const partial = questions.filter(q => q.response === 'Partial').length;
                const no = questions.filter(q => q.response === 'No').length;
                const na = questions.filter(q => q.response === 'N/A').length;
                const unanswered = questions.filter(q => !q.response).length;

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-slate-500">
                        {yes} Yes | {partial} Partial | {no} No | {na} N/A | {unanswered} Pending
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                      <div className="bg-green-500" style={{ width: `${(yes / questions.length) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(partial / questions.length) * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${(no / questions.length) * 100}%` }} />
                      <div className="bg-slate-300" style={{ width: `${(na / questions.length) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-700 mb-2">Recommendations</h4>
            <textarea
              value={assessment.recommendations || ''}
              onChange={(e) => onUpdateAssessment({ recommendations: e.target.value })}
              placeholder="Enter recommendations based on the assessment..."
              className="w-full h-32 text-sm border rounded-lg p-3 resize-none"
            />
          </div>

          {/* Assessment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Assessment Date</label>
              <input
                type="date"
                value={assessment.assessmentDate}
                onChange={(e) => onUpdateAssessment({ assessmentDate: e.target.value })}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Assessor</label>
              <input
                type="text"
                value={assessment.assessor}
                onChange={(e) => onUpdateAssessment({ assessor: e.target.value })}
                placeholder="Assessor name"
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DEFAULT_QUESTIONS };
export default ManagementAssessmentSection;
