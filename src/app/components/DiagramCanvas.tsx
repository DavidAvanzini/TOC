import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Diagram, Milestone, Activity, Selection } from '../types';

const STATION_RADIUS = 18;
const GRID_SIZE = 40;

export interface DiagramCanvasHandle {
  exportPng: (title: string) => void;
}

interface Props {
  diagram: Diagram;
  computedActivities: Activity[];
  selection: Selection;
  onSelectMilestone: (id: string) => void;
  onSelectActivity: (id: string) => void;
  onMoveMilestone: (id: string, x: number, y: number) => void;
  onAddMilestone: (x: number, y: number) => void;
  tool: 'select' | 'add-milestone' | 'add-activity';
  onConnectMilestones: (fromId: string, toId: string) => void;
  showCritical: boolean;
  criticalFocus: boolean;
  theme: 'dark' | 'light';
  startMilestoneId?: string | null;
  endMilestoneId?: string | null;
}

function snapToGrid(v: number) {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

export const DiagramCanvas = forwardRef<DiagramCanvasHandle, Props>(function DiagramCanvas({
  diagram,
  computedActivities,
  selection,
  onSelectMilestone,
  onSelectActivity,
  onMoveMilestone,
  onAddMilestone,
  tool,
  onConnectMilestones,
  showCritical,
  criticalFocus,
  theme,
  startMilestoneId,
  endMilestoneId,
}, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; mx: number; my: number } | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1400, h: 700 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; vbx: number; vby: number } | null>(null);
  // Prevents mouseUp on the 2nd station from firing a duplicate connection after mouseDown already handled it
  const connectionMadeRef = useRef(false);

  const colors = theme === 'light' ? {
    canvasBg: '#f5f6fa',
    gridStroke: 'rgba(0,0,0,0.07)',
    stationFill: '#ffffff',
    stationStroke: '#1a1d27',
    selectedStroke: '#2a7ae2',
    ringStroke: 'rgba(0,0,0,0.15)',
    labelFill: '#1a1d27',
    selectedLabelFill: '#2a7ae2',
    actLabelFill: '#3a3f55',
    selectedActLabel: '#1a1d27',
    labelBg: '#f5f6fa',
    hintText: 'rgba(0,0,0,0.45)',
    connectingStroke: 'rgba(0,0,0,0.4)',
    centerDot: '#1a1d27',
  } : {
    canvasBg: '#0f1117',
    gridStroke: 'rgba(255,255,255,0.04)',
    stationFill: '#0f1117',
    stationStroke: '#e8eaf0',
    selectedStroke: '#4f9cf9',
    ringStroke: 'rgba(255,255,255,0.15)',
    labelFill: '#e8eaf0',
    selectedLabelFill: '#4f9cf9',
    actLabelFill: '#c8ccd8',
    selectedActLabel: '#fff',
    labelBg: '#0f1117',
    hintText: 'rgba(255,255,255,0.45)',
    connectingStroke: 'rgba(255,255,255,0.4)',
    centerDot: '#e8eaf0',
  };

  // Milestones that sit on at least one critical activity — used for dimming in criticalFocus mode
  const criticalMilestoneIds = useMemo(() => {
    if (!criticalFocus) return null;
    const ids = new Set<string>();
    computedActivities.forEach(a => {
      if (a.isCritical) { ids.add(a.fromMilestoneId); ids.add(a.toMilestoneId); }
    });
    return ids;
  }, [criticalFocus, computedActivities]);

  useImperativeHandle(ref, () => ({
    exportPng(title: string) {
      const svg = svgRef.current;
      if (!svg || diagram.milestones.length === 0) return;

      const PADDING = 80;
      const xs = diagram.milestones.map(m => m.x);
      const ys = diagram.milestones.map(m => m.y);
      const minX = Math.min(...xs) - PADDING;
      const minY = Math.min(...ys) - PADDING;
      const maxX = Math.max(...xs) + PADDING;
      const maxY = Math.max(...ys) + PADDING;
      const vbW = Math.max(maxX - minX, 600);
      const vbH = Math.max(maxY - minY, 300);

      // 2× resolution — sharp on retina and in PowerPoint
      const SCALE = 2;
      const W = vbW * SCALE;
      const H = vbH * SCALE;

      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('viewBox', `${minX} ${minY} ${vbW} ${vbH}`);
      clone.setAttribute('width', String(W));
      clone.setAttribute('height', String(H));

      // Remove the scrolling grid — clean background for presentations
      const gridBg = clone.querySelector('.grid-bg');
      if (gridBg) gridBg.remove();
      const gridDef = clone.querySelector('#grid');
      if (gridDef) gridDef.remove();

      // Explicit background rect
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', String(minX));
      bgRect.setAttribute('y', String(minY));
      bgRect.setAttribute('width', String(vbW));
      bgRect.setAttribute('height', String(vbH));
      bgRect.setAttribute('fill', colors.canvasBg);
      clone.insertBefore(bgRect, clone.firstChild);

      const svgStr = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = colors.canvasBg;
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${title.replace(/\s+/g, '_')}.png`;
        a.click();
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    },
  }), [diagram.milestones, colors]);

  const toSVG = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    return {
      x: (clientX - rect.left) * scaleX + viewBox.x,
      y: (clientY - rect.top) * scaleY + viewBox.y,
    };
  }, [viewBox]);

  const getPath = (id: string) => diagram.paths.find(p => p.id === id);
  const getMilestone = (id: string) => diagram.milestones.find(m => m.id === id);

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as Element).classList.contains('grid-bg')) {
      if (tool === 'add-milestone') {
        const pos = toSVG(e.clientX, e.clientY);
        onAddMilestone(snapToGrid(pos.x), snapToGrid(pos.y));
        return;
      }
      if (tool === 'select') {
        setPanning({ startX: e.clientX, startY: e.clientY, vbx: viewBox.x, vby: viewBox.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging) {
      const pos = toSVG(e.clientX, e.clientY);
      onMoveMilestone(dragging.id, snapToGrid(pos.x - dragging.ox), snapToGrid(pos.y - dragging.oy));
    }
    if (connecting) {
      const pos = toSVG(e.clientX, e.clientY);
      setConnecting(c => c ? { ...c, mx: pos.x, my: pos.y } : null);
    }
    if (panning) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = (e.clientX - panning.startX) * (viewBox.w / rect.width);
      const dy = (e.clientY - panning.startY) * (viewBox.h / rect.height);
      setViewBox(v => ({ ...v, x: panning.vbx - dx, y: panning.vby - dy }));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setPanning(null);
    if (connecting) setConnecting(null);
  };

  const handleMilestoneMouseDown = (e: React.MouseEvent, m: Milestone) => {
    e.stopPropagation();
    if (tool === 'select') {
      onSelectMilestone(m.id);
      const pos = toSVG(e.clientX, e.clientY);
      setDragging({ id: m.id, ox: pos.x - m.x, oy: pos.y - m.y });
    } else if (tool === 'add-activity') {
      if (connecting && connecting.fromId !== m.id) {
        // Second click — complete the connection (click-to-click mode)
        connectionMadeRef.current = true;
        onConnectMilestones(connecting.fromId, m.id);
        setConnecting(null);
      } else {
        // First click — start a connection (works for both click-click and drag)
        connectionMadeRef.current = false;
        const pos = toSVG(e.clientX, e.clientY);
        setConnecting({ fromId: m.id, mx: pos.x, my: pos.y });
      }
    }
  };

  const handleMilestoneMouseUp = (e: React.MouseEvent, m: Milestone) => {
    e.stopPropagation();
    // Skip if mouseDown already completed this connection (click-to-click)
    if (connectionMadeRef.current) {
      connectionMadeRef.current = false;
      return;
    }
    if (connecting && connecting.fromId !== m.id) {
      // Drag-to-connect
      onConnectMilestones(connecting.fromId, m.id);
      setConnecting(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConnecting(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      setViewBox(v => {
        const nw = Math.min(3000, Math.max(400, v.w * factor));
        const nh = Math.min(2000, Math.max(300, v.h * factor));
        const nx = v.x + mx * (v.w - nw);
        const ny = v.y + my * (v.h - nh);
        return { x: nx, y: ny, w: nw, h: nh };
      });
    };
    const el = svgRef.current;
    el?.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, []);

  // Build activity route: straight lines with metro-style bends
  const buildPath = (act: Activity): string => {
    const from = getMilestone(act.fromMilestoneId);
    const to = getMilestone(act.toMilestoneId);
    if (!from || !to) return '';
    const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y;
    if (y1 === y2) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const midX = (x1 + x2) / 2;
    const r = 24;
    if (x2 > x1) {
      return `M ${x1} ${y1} L ${midX - r} ${y1} Q ${midX} ${y1} ${midX} ${y1 + (y2 > y1 ? r : -r)} L ${midX} ${y2 - (y2 > y1 ? r : -r)} Q ${midX} ${y2} ${midX + r} ${y2} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${midX + r} ${y1} Q ${midX} ${y1} ${midX} ${y1 + (y2 > y1 ? r : -r)} L ${midX} ${y2 - (y2 > y1 ? r : -r)} Q ${midX} ${y2} ${midX - r} ${y2} L ${x2} ${y2}`;
  };

  const actMidpoint = (act: Activity) => {
    const from = getMilestone(act.fromMilestoneId);
    const to = getMilestone(act.toMilestoneId);
    if (!from || !to) return null;
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  };

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: tool === 'add-milestone' ? 'crosshair' : tool === 'add-activity' ? 'cell' : 'default', background: colors.canvasBg }}
    >
      <style>{`
        @keyframes marchingAnts { to { stroke-dashoffset: -28; } }
        .activity-ongoing { animation: marchingAnts 0.7s linear infinite; }
      `}</style>

      <defs>
        <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke={colors.gridStroke} strokeWidth="1" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-strong">
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {diagram.paths.map(p => (
          <marker key={p.id} id={`arrow-${p.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={p.color} />
          </marker>
        ))}
        <marker id="arrow-connecting" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill={colors.connectingStroke} />
        </marker>
      </defs>

      {/* Grid */}
      <rect className="grid-bg" x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.w + 2000} height={viewBox.h + 2000} fill="url(#grid)" />

      {/* Click-to-click pending hint */}
      {connecting && (
        <text
          x={viewBox.x + viewBox.w / 2} y={viewBox.y + viewBox.h - 24}
          textAnchor="middle" fill={colors.hintText} fontSize="12"
          style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
        >
          Click another station to connect — or click empty canvas to cancel
        </text>
      )}

      {/* Connecting preview */}
      {connecting && (() => {
        const from = getMilestone(connecting.fromId);
        if (!from) return null;
        return (
          <line
            x1={from.x} y1={from.y}
            x2={connecting.mx} y2={connecting.my}
            stroke={colors.connectingStroke} strokeWidth="2" strokeDasharray="6 4"
            markerEnd="url(#arrow-connecting)"
          />
        );
      })()}

      {/* Activities */}
      {computedActivities.map(act => {
        const path = getPath(act.pathId);
        if (!path) return null;
        const d = buildPath(act);
        if (!d) return null;
        const isSelected = selection.type === 'activity' && selection.id === act.id;
        const isCritical = showCritical && act.isCritical;
        const dimmed = criticalFocus && !act.isCritical;
        const mid = actMidpoint(act);
        return (
          <g key={act.id} opacity={dimmed ? 0.1 : 1}>
            {/* Hit area */}
            <path
              d={d} fill="none" stroke="transparent" strokeWidth="16"
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onSelectActivity(act.id); }}
            />
            {/* Shadow for critical */}
            {isCritical && (
              <path d={d} fill="none" stroke="#ffcc00" strokeWidth={criticalFocus ? 10 : 6} opacity={criticalFocus ? 0.45 : 0.3} filter="url(#glow-strong)" />
            )}
            {/* Main line */}
            <path
              d={d} fill="none"
              stroke={path.color}
              strokeWidth={isSelected ? 5 : 3}
              markerEnd={`url(#arrow-${path.id})`}
              filter={isSelected ? 'url(#glow)' : undefined}
              opacity={isSelected ? 1 : 0.85}
            />
            {/* Critical overlay */}
            {isCritical && (
              <path d={d} fill="none" stroke="#ffcc00" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.9" />
            )}
            {/* Ongoing (in-progress) marching-ants overlay */}
            {act.isOngoing && (
              <path
                className="activity-ongoing"
                d={d} fill="none"
                stroke="#22c55e" strokeWidth="3"
                strokeDasharray="8 6" opacity="0.9"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Activity label */}
            {mid && (
              <g>
                <rect
                  x={mid.x - act.name.length * 3.5 - 4} y={mid.y - 11}
                  width={act.name.length * 7 + 8} height={16}
                  fill={colors.labelBg} rx="3" opacity="0.85"
                />
                <text
                  x={mid.x} y={mid.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={isSelected ? colors.selectedActLabel : colors.actLabelFill}
                  fontSize="11"
                  style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
                >
                  {act.name}
                </text>
                {act.duration > 0 && (
                  <text
                    x={mid.x} y={mid.y + 13}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={path.color}
                    fontSize="10"
                    style={{ fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}
                  >
                    {act.duration}d
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* Milestones (stations) */}
      {diagram.milestones.map(m => {
        const isSelected = selection.type === 'milestone' && selection.id === m.id;
        const pathColors = computedActivities
          .filter(a => a.fromMilestoneId === m.id || a.toMilestoneId === m.id)
          .map(a => getPath(a.pathId)?.color)
          .filter(Boolean) as string[];
        const uniqueColors = [...new Set(pathColors)];

        const mDimmed = criticalFocus && !criticalMilestoneIds?.has(m.id);
        return (
          <g
            key={m.id}
            opacity={mDimmed ? 0.15 : 1}
            style={{ cursor: tool === 'select' ? 'grab' : 'crosshair' }}
            onMouseDown={e => handleMilestoneMouseDown(e, m)}
            onMouseUp={e => handleMilestoneMouseUp(e, m)}
            onClick={e => { e.stopPropagation(); if (tool === 'select') onSelectMilestone(m.id); }}
          >
            {/* Start / Target role rings + badges */}
            {startMilestoneId === m.id && (
              <>
                <circle cx={m.x} cy={m.y} r={STATION_RADIUS + 10} fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.9" />
                <circle cx={m.x} cy={m.y} r={STATION_RADIUS + 6} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
                <rect x={m.x - 20} y={m.y - STATION_RADIUS - 28} width={40} height={15} rx="4" fill="#22c55e" opacity="0.9" />
                <text x={m.x} y={m.y - STATION_RADIUS - 18} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="9" fontWeight="700" style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', letterSpacing: '0.05em' }}>START</text>
              </>
            )}
            {endMilestoneId === m.id && (
              <>
                <circle cx={m.x} cy={m.y} r={STATION_RADIUS + 10} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.9" />
                <circle cx={m.x} cy={m.y} r={STATION_RADIUS + 6} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
                <rect x={m.x - 23} y={m.y - STATION_RADIUS - 28} width={46} height={15} rx="4" fill="#f59e0b" opacity="0.9" />
                <text x={m.x} y={m.y - STATION_RADIUS - 18} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="9" fontWeight="700" style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', letterSpacing: '0.05em' }}>TARGET</text>
              </>
            )}
            {/* Outer ring for transfer stations */}
            {uniqueColors.length > 1 && (
              <circle cx={m.x} cy={m.y} r={STATION_RADIUS + 6} fill="none" stroke={colors.ringStroke} strokeWidth="2" />
            )}
            {/* Glow when selected */}
            {isSelected && (
              <circle cx={m.x} cy={m.y} r={STATION_RADIUS + 4} fill="none" stroke={colors.selectedStroke} strokeWidth="2" filter="url(#glow)" opacity="0.7" />
            )}
            {/* Station circle */}
            <circle
              cx={m.x} cy={m.y} r={STATION_RADIUS}
              fill={colors.stationFill} stroke={isSelected ? colors.selectedStroke : colors.stationStroke}
              strokeWidth={isSelected ? 3 : 2}
            />
            {/* Color segments for multi-path stations */}
            {uniqueColors.slice(0, 4).map((color, i) => {
              const segAngle = (Math.PI * 2) / uniqueColors.length;
              const startAngle = i * segAngle - Math.PI / 2;
              const endAngle = startAngle + segAngle;
              const r = STATION_RADIUS - 4;
              const x1 = m.x + r * Math.cos(startAngle);
              const y1 = m.y + r * Math.sin(startAngle);
              const x2 = m.x + r * Math.cos(endAngle);
              const y2 = m.y + r * Math.sin(endAngle);
              const largeArc = segAngle > Math.PI ? 1 : 0;
              if (uniqueColors.length === 1) {
                return <circle key={color} cx={m.x} cy={m.y} r={r} fill={color} opacity="0.6" />;
              }
              return (
                <path
                  key={color}
                  d={`M ${m.x} ${m.y} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={color} opacity="0.6"
                />
              );
            })}
            {/* Station dot */}
            <circle cx={m.x} cy={m.y} r={4} fill={isSelected ? colors.selectedStroke : colors.centerDot} />
            {/* Label */}
            <text
              x={m.x} y={m.y + STATION_RADIUS + 14}
              textAnchor="middle"
              fill={isSelected ? colors.selectedLabelFill : colors.labelFill}
              fontSize="12"
              fontWeight={isSelected ? '600' : '500'}
              style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
            >
              {m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
