"use client"

import { useMemo } from "react"

interface RiskSpeedometerProps {
  riskLevel: "low" | "medium" | "high"
  size?: number
}

export function RiskSpeedometer({ riskLevel, size = 200 }: RiskSpeedometerProps) {
  const riskValue = useMemo(() => {
    switch (riskLevel) {
      case "low":
        return 20 // 0-33% range
      case "medium":
        return 50 // 34-66% range
      case "high":
        return 80 // 67-100% range
      default:
        return 50
    }
  }, [riskLevel])

  const riskColor = useMemo(() => {
    switch (riskLevel) {
      case "low":
        return "#10b981" // green
      case "medium":
        return "#f59e0b" // yellow
      case "high":
        return "#ef4444" // red
      default:
        return "#6b7280"
    }
  }, [riskLevel])

  // Calculate angle for the needle (0-180 degrees, where 0 is left, 180 is right)
  const angle = useMemo(() => {
    // Map risk value (0-100) to angle (0-180 degrees)
    // Low risk (20) = 0 degrees (left)
    // High risk (80) = 180 degrees (right)
    return (riskValue / 100) * 180
  }, [riskValue])

  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.35
  const needleLength = radius * 0.8

  // Calculate needle endpoint
  const needleX = centerX + needleLength * Math.cos((angle - 90) * (Math.PI / 180))
  const needleY = centerY + needleLength * Math.sin((angle - 90) * (Math.PI / 180))

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${size * 0.1} ${size * 0.7} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.7}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted opacity-20"
        />

        {/* Green section (low risk) */}
        <path
          d={`M ${size * 0.1} ${size * 0.7} A ${radius} ${radius} 0 0 1 ${size * 0.4} ${size * 0.3}`}
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Yellow section (medium risk) */}
        <path
          d={`M ${size * 0.4} ${size * 0.3} A ${radius} ${radius} 0 0 1 ${size * 0.6} ${size * 0.3}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Red section (high risk) */}
        <path
          d={`M ${size * 0.6} ${size * 0.3} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.7}`}
          fill="none"
          stroke="#ef4444"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={riskColor}
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-500"
        />

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r="8"
          fill={riskColor}
          className="transition-all duration-500"
        />

        {/* Risk labels */}
        <text
          x={size * 0.15}
          y={size * 0.78}
          className="text-[11px] font-semibold fill-green-600 dark:fill-green-400"
          textAnchor="middle"
        >
          LOW
        </text>
        <text
          x={size * 0.5}
          y={size * 0.22}
          className="text-[11px] font-semibold fill-yellow-600 dark:fill-yellow-400"
          textAnchor="middle"
        >
          MED
        </text>
        <text
          x={size * 0.85}
          y={size * 0.78}
          className="text-[11px] font-semibold fill-red-600 dark:fill-red-400"
          textAnchor="middle"
        >
          HIGH
        </text>
      </svg>

      {/* Risk level badge */}
      <div className="mt-4 text-center">
        <div
          className="inline-block px-4 py-2 rounded-lg font-semibold text-sm"
          style={{
            backgroundColor: `${riskColor}20`,
            color: riskColor,
            border: `1px solid ${riskColor}40`,
          }}
        >
          {riskLevel.toUpperCase()} RISK
        </div>
      </div>
    </div>
  )
}

