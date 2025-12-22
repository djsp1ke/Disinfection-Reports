
import React, { useMemo } from 'react';
import { Asset, AssetAnalysis } from '../types';

interface AssetAnalysisGraphsProps {
  assets: Asset[];
}

// Simple bar chart component (no external library needed)
const BarChart = ({
  data,
  colors,
  title,
  horizontal = false
}: {
  data: { label: string; value: number }[];
  colors: string[];
  title: string;
  horizontal?: boolean;
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (horizontal) {
    return (
      <div className="space-y-3">
        <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
        {data.map((item, idx) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-medium">{item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
            </div>
            <div className="h-6 bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: colors[idx % colors.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-slate-700 text-sm text-center">{title}</h4>
      <div className="flex items-end justify-center gap-4 h-48">
        {data.map((item, idx) => (
          <div key={item.label} className="flex flex-col items-center">
            <span className="text-xs font-medium mb-1">{item.value}</span>
            <div
              className="w-12 rounded-t transition-all duration-500"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                minHeight: item.value > 0 ? '20px' : '4px',
                backgroundColor: colors[idx % colors.length]
              }}
            />
            <span className="text-[10px] text-slate-500 mt-2 text-center leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Donut chart component
const DonutChart = ({
  data,
  colors,
  title,
  size = 160
}: {
  data: { label: string; value: number }[];
  colors: string[];
  title: string;
  size?: number;
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90;
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;
  const center = size / 2;

  const segments = data.map((item, idx) => {
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return {
      path,
      color: colors[idx % colors.length],
      label: item.label,
      value: item.value,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    };
  });

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-slate-700 text-sm text-center">{title}</h4>
      <div className="flex items-center justify-center gap-4">
        <svg width={size} height={size} className="transform -rotate-0">
          {segments.map((seg, idx) => (
            <path
              key={idx}
              d={seg.path}
              fill={seg.color}
              className="transition-all duration-300 hover:opacity-80"
            />
          ))}
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-bold fill-slate-700"
          >
            {total}
          </text>
          <text
            x={center}
            y={center + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-slate-500"
          >
            Total
          </text>
        </svg>
        <div className="space-y-1">
          {segments.map((seg, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-slate-600">{seg.label}</span>
              <span className="font-medium">({seg.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AssetAnalysisGraphs: React.FC<AssetAnalysisGraphsProps> = ({ assets }) => {
  const analysis: AssetAnalysis = useMemo(() => {
    const byCondition = { Good: 0, Fair: 0, Poor: 0, Critical: 0 };
    const byRiskLevel = { Low: 0, Medium: 0, High: 0 };
    const byType: Record<string, number> = {};

    assets.forEach(asset => {
      byCondition[asset.condition]++;
      byRiskLevel[asset.riskLevel]++;
      byType[asset.type] = (byType[asset.type] || 0) + 1;
    });

    return {
      totalAssets: assets.length,
      byCondition,
      byRiskLevel,
      byType
    };
  }, [assets]);

  const conditionColors = ['#22c55e', '#eab308', '#f97316', '#ef4444']; // green, yellow, orange, red
  const riskColors = ['#22c55e', '#eab308', '#ef4444']; // green, yellow, red
  const typeColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  const conditionData = [
    { label: 'Good', value: analysis.byCondition.Good },
    { label: 'Fair', value: analysis.byCondition.Fair },
    { label: 'Poor', value: analysis.byCondition.Poor },
    { label: 'Critical', value: analysis.byCondition.Critical }
  ];

  const riskData = [
    { label: 'Low', value: analysis.byRiskLevel.Low },
    { label: 'Medium', value: analysis.byRiskLevel.Medium },
    { label: 'High', value: analysis.byRiskLevel.High }
  ];

  const typeData = Object.entries(analysis.byType).map(([label, value]) => ({ label, value }));

  if (assets.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-medium text-slate-500">No Assets Registered</h3>
        <p className="text-sm text-slate-400 mt-1">Add assets to see analysis graphs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold">{analysis.totalAssets}</div>
          <div className="text-sm opacity-90">Total Assets</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold">{analysis.byCondition.Good}</div>
          <div className="text-sm opacity-90">Good Condition</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold">{analysis.byRiskLevel.High}</div>
          <div className="text-sm opacity-90">High Risk</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 text-center">
          <div className="text-3xl font-bold">{analysis.byCondition.Critical}</div>
          <div className="text-sm opacity-90">Critical</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <DonutChart
            data={conditionData}
            colors={conditionColors}
            title="Assets by Condition"
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <DonutChart
            data={riskData}
            colors={riskColors}
            title="Assets by Risk Level"
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <BarChart
            data={typeData}
            colors={typeColors}
            title="Assets by Type"
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <BarChart
          data={conditionData}
          colors={conditionColors}
          title="Condition Breakdown"
          horizontal
        />
      </div>
    </div>
  );
};

export default AssetAnalysisGraphs;
