import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';

interface DeletableEdgeData {
  onDelete?: (id: string) => void;
  timeGap?: number | null; // Time gap in minutes between tasks
}

// Format time gap for display
const formatTimeGap = (minutes: number): string => {
  const absMinutes = Math.abs(minutes);
  if (absMinutes >= 60) {
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    if (mins === 0) {
      return `${minutes < 0 ? '-' : ''}${hours}h`;
    }
    return `${minutes < 0 ? '-' : ''}${hours}h ${mins}m`;
  }
  return `${minutes}m`;
};

const DeletableEdge: React.FC<EdgeProps<DeletableEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Get stroke color from style or use default
  const strokeColor = (style as React.CSSProperties)?.stroke as string || '#6366f1';

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  // Determine label color based on time gap
  const timeGap = data?.timeGap;
  const hasTimeGap = timeGap !== null && timeGap !== undefined;
  const isOverlap = hasTimeGap && timeGap < 0;
  const isShortGap = hasTimeGap && timeGap >= 0 && timeGap <= 15;

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      {/* Visible edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...(style as React.CSSProperties),
          strokeWidth: isHovered ? 4 : 3,
          stroke: isHovered ? '#818cf8' : strokeColor,
          transition: 'stroke-width 0.2s, stroke 0.2s',
        }}
      />
      {/* Time gap label and delete button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex flex-col items-center gap-1.5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Time gap badge - always visible if data exists */}
          {hasTimeGap && (
            <div 
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg backdrop-blur-sm border ${
                isOverlap 
                  ? 'bg-red-500/80 text-white border-red-400/50' 
                  : isShortGap 
                    ? 'bg-amber-500/80 text-white border-amber-400/50'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/50 dark:border-white/10'
              }`}
            >
              {formatTimeGap(timeGap)}
            </div>
          )}
          {/* Delete button - visible on hover */}
          {isHovered && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-7 h-7 bg-red-500/90 hover:bg-red-600 text-white rounded-lg shadow-lg backdrop-blur-sm border border-red-400/50 transition-all hover:scale-110"
              title="Delete link"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default DeletableEdge;
