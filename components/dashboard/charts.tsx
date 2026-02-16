'use client';

import React from 'react';

interface StackedAreaChartProps {
  series: Array<{ name: string; color: string; data: number[] }>;
  xLabels: string[];
  yMax: number;
  height?: number;
}

export function StackedAreaChart({ series, xLabels, yMax, height = 200 }: StackedAreaChartProps) {
  const width = 350;
  const padding = { top: 10, right: 10, bottom: 30, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const points = xLabels.length;

  const stacked = series.map((s, si) => ({
    ...s,
    stackedData: s.data.map((val, i) =>
      series.slice(0, si + 1).reduce((sum, prev) => sum + prev.data[i], 0)
    ),
  }));

  const getX = (i: number) => padding.left + (i / (points - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - (val / yMax) * chartH;

  const makeSmoothPath = (data: number[]) => {
    return data.map((v, i) => {
      if (i === 0) return `${getX(i)},${getY(v)}`;
      const prevX = getX(i - 1);
      const currX = getX(i);
      const cpX = (prevX + currX) / 2;
      return `C${cpX},${getY(data[i - 1])} ${cpX},${getY(v)} ${currX},${getY(v)}`;
    }).join(' ');
  };

  const makeAreaPath = (topData: number[], bottomData: number[]) => {
    const forward = `M${makeSmoothPath(topData)}`;
    const backData = [...bottomData].reverse();
    const backIndices = bottomData.map((_, i) => bottomData.length - 1 - i);
    const backward = backData.map((v, i) => {
      const idx = backIndices[i];
      if (i === 0) return `L${getX(idx)},${getY(v)}`;
      const prevIdx = backIndices[i - 1];
      const prevX = getX(prevIdx);
      const currX = getX(idx);
      const cpX = (prevX + currX) / 2;
      return `C${cpX},${getY(backData[i - 1])} ${cpX},${getY(v)} ${currX},${getY(v)}`;
    }).join(' ');
    return `${forward} ${backward} Z`;
  };

  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padding.left} y1={getY(tick)} x2={width - padding.right} y2={getY(tick)} stroke="#EDF2F7" strokeWidth="0.5" />
          <text x={padding.left - 5} y={getY(tick) + 3} textAnchor="end" fontSize="8" fill="#A0AEC0">
            {(tick / 1000).toFixed(0)}
          </text>
        </g>
      ))}

      {[...stacked].reverse().map((s, ri) => {
        const si = stacked.length - 1 - ri;
        const baseline = si === 0 ? s.data.map(() => 0) : stacked[si - 1].stackedData;
        return (
          <path key={s.name} d={makeAreaPath(s.stackedData, baseline)} fill={s.color} opacity={0.85} />
        );
      })}

      {xLabels.map((label, i) => (
        <text key={i} x={getX(i)} y={height - 8} textAnchor="middle" fontSize="8" fill="#A0AEC0">
          {label}
        </text>
      ))}
    </svg>
  );
}

interface BarChartProps {
  data: Array<{ category: string; value: number; color: string }>;
  yMax: number;
  height?: number;
}

export function BarChart({ data, yMax, height = 180 }: BarChartProps) {
  const width = 300;
  const padding = { top: 10, right: 20, bottom: 30, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barWidth = Math.min(36, chartW / data.length - 24);
  const yTicks = [0, 10, 20, 30, 40, 50];

  const getY = (val: number) => padding.top + chartH - (val / yMax) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padding.left} y1={getY(tick)} x2={width - padding.right} y2={getY(tick)} stroke="#EDF2F7" strokeWidth="0.5" />
          <text x={padding.left - 5} y={getY(tick) + 3} textAnchor="end" fontSize="8" fill="#A0AEC0">
            {tick}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = padding.left + (i + 0.5) * (chartW / data.length) - barWidth / 2;
        const barH = (d.value / yMax) * chartH;
        return (
          <g key={d.category}>
            <rect x={x} y={getY(d.value)} width={barWidth} height={barH} rx={3} fill={d.color} />
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="9" fill="#4A5568" fontWeight="500">
              {d.category}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface MultiLineChartProps {
  series: Array<{ name: string; color: string; data: number[] }>;
  xLabels: string[];
  yMax: number;
  height?: number;
}

export function MultiLineChart({ series, xLabels, yMax, height = 180 }: MultiLineChartProps) {
  const width = 300;
  const padding = { top: 10, right: 15, bottom: 30, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (i: number, len: number) => padding.left + (i / (len - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - (val / yMax) * chartH;

  const buildPath = (data: number[]) => {
    return data.map((v, i) => {
      if (i === 0) return `M${getX(i, data.length)},${getY(v)}`;
      const prevX = getX(i - 1, data.length);
      const currX = getX(i, data.length);
      const cpX = (prevX + currX) / 2;
      return `C${cpX},${getY(data[i - 1])} ${cpX},${getY(v)} ${currX},${getY(v)}`;
    }).join(' ');
  };

  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padding.left} y1={getY(tick)} x2={width - padding.right} y2={getY(tick)} stroke="#EDF2F7" strokeWidth="0.5" />
        </g>
      ))}

      {series.map((s) => (
        <g key={s.name}>
          <path d={buildPath(s.data)} fill="none" stroke={s.color} strokeWidth="2" opacity={0.9} />
          {s.data.map((v, i) => (
            <circle key={i} cx={getX(i, s.data.length)} cy={getY(v)} r="2" fill={s.color} />
          ))}
        </g>
      ))}

      {xLabels.map((label, i) => (
        <text key={i} x={getX(i, xLabels.length)} y={height - 8} textAnchor="middle" fontSize="8" fill="#A0AEC0">
          {label}
        </text>
      ))}
    </svg>
  );
}

interface LineChartProps {
  data: number[];
  xLabels: string[];
  yMax: number;
  lineColor?: string;
  areaColor?: string;
  height?: number;
}

export function LineChart({ data, xLabels, yMax, lineColor = '#A0AEC0', areaColor = 'rgba(160, 174, 192, 0.1)', height = 180 }: LineChartProps) {
  const width = 300;
  const padding = { top: 10, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - (val / yMax) * chartH;

  const linePath = data.map((v, i) => {
    if (i === 0) return `M${getX(i)},${getY(v)}`;
    const prevX = getX(i - 1);
    const currX = getX(i);
    const cpX = (prevX + currX) / 2;
    return `C${cpX},${getY(data[i - 1])} ${cpX},${getY(v)} ${currX},${getY(v)}`;
  }).join(' ');

  const areaPath = `${linePath} L${getX(data.length - 1)},${padding.top + chartH} L${getX(0)},${padding.top + chartH} Z`;

  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padding.left} y1={getY(tick)} x2={width - padding.right} y2={getY(tick)} stroke="#F7FAFC" strokeWidth="1" />
          <text x={padding.left - 6} y={getY(tick) + 4} textAnchor="end" fontSize="9" fill="#A0AEC0">
            {tick}
          </text>
        </g>
      ))}
      <path d={areaPath} fill={areaColor} />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" />
      {data.map((v, i) => (
        <circle key={i} cx={getX(i)} cy={getY(v)} r="3" fill={lineColor} />
      ))}
      {xLabels.map((label, i) => (
        <text key={i} x={getX(i)} y={height - 6} textAnchor="middle" fontSize="9" fill="#A0AEC0">
          {label}
        </text>
      ))}
    </svg>
  );
}
