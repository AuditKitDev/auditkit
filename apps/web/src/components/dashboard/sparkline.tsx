'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = '#818cf8',
  width = 120,
  height = 40,
  showArea = true,
  strokeWidth = 2,
  className = '',
}: SparklineProps) {
  const { path, areaPath, pathLength } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', areaPath: '', pathLength: 0 };
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((value, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - ((value - min) / range) * h,
    }));

    // Build smooth quadratic bezier path
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpx = (curr.x + next.x) / 2;
      d += ` Q ${curr.x + (next.x - curr.x) * 0.5},${curr.y} ${cpx},${(curr.y + next.y) / 2}`;
    }
    // Connect to last point
    const last = points[points.length - 1];
    d += ` L ${last.x},${last.y}`;

    // Area path
    const areaD = `${d} L ${last.x},${height - padding} L ${points[0].x},${height - padding} Z`;

    // Estimate path length
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }

    return { path: d, areaPath: areaD, pathLength: length };
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke={color}
          strokeWidth={1}
          opacity={0.3}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
          className="sparkline-area"
        />
      )}
      <defs>
        <linearGradient
          id={`sparkline-gradient-${color.replace('#', '')}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-line"
        style={{
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
          animation: 'sparkline-draw 1s ease-out forwards',
        }}
      />
    </svg>
  );
}

interface HorizontalBarProps {
  value: number;
  max: number;
  color?: string;
  height?: number;
  className?: string;
}

export function HorizontalBar({
  value,
  max,
  color = '#818cf8',
  height = 6,
  className = '',
}: HorizontalBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ height, backgroundColor: `${color}15` }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
          animation: 'sparkline-bar-grow 0.8s ease-out forwards',
        }}
      />
    </div>
  );
}
