import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Diagram, Milestone, Activity, Path, Selection } from './types';
import { DiagramCanvas, DiagramCanvasHandle } from './components/DiagramCanvas';
import { EditPanel } from './components/EditPanel';
import { Toolbar } from './components/Toolbar';
import { computeCPM, checkConsistency } from './utils/cpm';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#c77dff', '#06d6a0',
];

function emptyDiagram(): Diagram {
  const pathId = uid();
  const pathId2 = uid();
  const m1 = uid(), m2 = uid(), m3 = uid(), m4 = uid(), m5 = uid(), m6 = uid();
  return {
    title: 'New Diagram',
    paths: [
      { id: pathId, name: 'Line A', description: '', color: '#e63946' },
      { id: pathId2, name: 'Line B', description: '', color: '#2a9d8f' },
    ],
    milestones: [
      { id: m1, name: 'Start', description: 'Project kickoff', x: 120, y: 240 },
      { id: m2, name: 'Design', description: '', x: 320, y: 160 },
      { id: m3, name: 'Dev', description: '', x: 560, y: 240 },
      { id: m4, name: 'Test', description: '', x: 560, y: 360 },
      { id: m5, name: 'Review', description: '', x: 760, y: 200 },
      { id: m6, name: 'End', description: 'Project complete', x: 960, y: 240 },
    ],
    activities: [
      { id: uid(), name: 'Planning', description: '', fromMilestoneId: m1, toMilestoneId: m2, pathId, duration: 5 },
      { id: uid(), name: 'Build UI', description: '', fromMilestoneId: m2, toMilestoneId: m3, pathId, duration: 10 },
      { id: uid(), name: 'Backend', description: '', fromMilestoneId: m1, toMilestoneId: m4, pathId: pathId2, duration: 12 },
      { id: uid(), name: 'Integrate', description: '', fromMilestoneId: m3, toMilestoneId: m5, pathId, duration: 7 },
      { id: uid(), name: 'QA', description: '', fromMilestoneId: m4, toMilestoneId: m5, pathId: pathId2, duration: 6 },
      { id: uid(), name: 'Ship', description: '', fromMilestoneId: m5, toMilestoneId: m6, pathId, duration: 3 },
    ],
  };
}

export default function App() {
  const [diagram, setDiagram] = useState<Diagram>(emptyDiagram);
  const [selection, setSelection] = useState<Selection>({ type: null, id: null });
  const [tool, setTool] = useState<'select' | 'add-milestone' | 'add-activity'>('select');
  const [showCritical, setShowCritical] = useState(true);
  const [panelTab, setPanelTab] = useState<'element' | 'paths' | 'consistency'>('element');
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [criticalFocus, setCriticalFocus] = useState(false);
  const canvasRef = useRef<DiagramCanvasHandle>(null);

  useEffect(() => {
    if (diagram.paths.length === 0) {
      setActivePathId(null);
      return;
    }
    if (!activePathId || !diagram.paths.some(p => p.id === activePathId)) {
      setActivePathId(diagram.paths[0].id);
    }
  }, [diagram.paths, activePathId]);

  useEffect(() => {
    const stored = window.localStorage.getItem('toc-diagram');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Diagram;
      if (parsed && parsed.milestones && parsed.activities && parsed.paths) {
        setDiagram(parsed);
      }
    } catch {
      // ignore invalid saved state
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('toc-diagram', JSON.stringify(diagram));
  }, [diagram]);

  const computedActivities = useMemo(
    () => computeCPM(diagram.milestones, diagram.activities),
    [diagram.milestones, diagram.activities]
  );

  const consistencyIssues = useMemo(
    () => checkConsistency(diagram.milestones, diagram.activities, diagram.paths),
    [diagram.milestones, diagram.activities, diagram.paths]
  );

  const handleAddMilestone = useCallback((x: number, y: number) => {
    const id = uid();
    setDiagram(d => ({ ...d, milestones: [...d.milestones, { id, name: 'Station', description: '', x, y }] }));
    setSelection({ type: 'milestone', id });
    setTool('select');
    setPanelTab('element');
  }, []);

  const handleMoveMilestone = useCallback((id: string, x: number, y: number) => {
    setDiagram(d => ({ ...d, milestones: d.milestones.map(m => m.id === id ? { ...m, x, y } : m) }));
  }, []);

  const handleUpdateMilestone = useCallback((id: string, data: Partial<Milestone>) => {
    setDiagram(d => ({ ...d, milestones: d.milestones.map(m => m.id === id ? { ...m, ...data } : m) }));
  }, []);

  const handleDeleteMilestone = useCallback((id: string) => {
    setDiagram(d => ({
      ...d,
      milestones: d.milestones.filter(m => m.id !== id),
      activities: d.activities.filter(a => a.fromMilestoneId !== id && a.toMilestoneId !== id),
    }));
    setSelection({ type: null, id: null });
  }, []);

  const handleConnectMilestones = useCallback((fromId: string, toId: string) => {
    const pathId = activePathId ?? diagram.paths[0]?.id;
    if (!pathId) return;
    const id = uid();
    setDiagram(d => ({
      ...d,
      activities: [...d.activities, {
        id, name: 'Activity', description: '',
        fromMilestoneId: fromId, toMilestoneId: toId,
        pathId, duration: 1,
      }],
    }));
    setSelection({ type: 'activity', id });
    setTool('select');
    setPanelTab('element');
  }, [activePathId, diagram.paths]);

  const handleUpdateActivity = useCallback((id: string, data: Partial<Activity>) => {
    setDiagram(d => ({ ...d, activities: d.activities.map(a => a.id === id ? { ...a, ...data } : a) }));
  }, []);

  const handleDeleteActivity = useCallback((id: string) => {
    setDiagram(d => ({ ...d, activities: d.activities.filter(a => a.id !== id) }));
    setSelection({ type: null, id: null });
  }, []);

  const handleAddPath = useCallback(() => {
    const id = uid();
    setDiagram(d => {
      const colorIdx = d.paths.length % DEFAULT_COLORS.length;
      return { ...d, paths: [...d.paths, { id, name: `Line ${String.fromCharCode(65 + d.paths.length)}`, description: '', color: DEFAULT_COLORS[colorIdx] }] };
    });
    setActivePathId(id);
  }, []);

  const handleUpdatePath = useCallback((id: string, data: Partial<Path>) => {
    setDiagram(d => ({ ...d, paths: d.paths.map(p => p.id === id ? { ...p, ...data } : p) }));
  }, []);

  const handleDeletePath = useCallback((id: string) => {
    setDiagram(d => ({
      ...d,
      paths: d.paths.filter(p => p.id !== id),
      activities: d.activities.filter(a => a.pathId !== id),
    }));
  }, []);

  const handleSave = useCallback(() => {
    const blob = new Blob([JSON.stringify(diagram, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [diagram]);

  const handleLoad = useCallback((d: Diagram) => {
    setDiagram(d);
    setSelection({ type: null, id: null });
  }, []);

  const handleExport = useCallback(() => {
    canvasRef.current?.exportPng(diagram.title);
  }, [diagram.title]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setSelection({ type: null, id: null });
        setCriticalFocus(false);
        return;
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selection.id) return;
      e.preventDefault();
      if (selection.type === 'milestone') handleDeleteMilestone(selection.id);
      else if (selection.type === 'activity') handleDeleteActivity(selection.id);
      else if (selection.type === 'path') handleDeletePath(selection.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, handleDeleteMilestone, handleDeleteActivity, handleDeletePath]);

  const handleNew = useCallback(() => {
    if (confirm('Create a new diagram? Unsaved changes will be lost.')) {
      setDiagram(emptyDiagram());
      setSelection({ type: null, id: null });
    }
  }, []);

  return (
    <div className={`${theme} flex flex-col h-screen bg-background text-foreground overflow-hidden`}>{/* MARKER-MAKE-KIT-INVOKED */}
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        showCritical={showCritical}
        onToggleCritical={() => setShowCritical(v => !v)}
        title={diagram.title}
        onTitleChange={t => setDiagram(d => ({ ...d, title: t }))}
        paths={diagram.paths}
        activePathId={activePathId}
        onActivePathChange={setActivePathId}
        onSave={handleSave}
        onLoad={handleLoad}
        onNew={handleNew}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onExport={handleExport}
      />

      {/* Path legend */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-card border-b border-border shrink-0 overflow-x-auto">
        {diagram.paths.map(p => (
          <button
            key={p.id}
            className="flex items-center gap-1.5 shrink-0 hover:opacity-100 opacity-70 transition-opacity cursor-pointer"
            title="Click to edit this line"
            onClick={() => { setPanelTab('paths'); setSelection({ type: 'path', id: p.id }); }}
          >
            <div className="w-8 h-0.5" style={{ background: p.color }} />
            <span className="text-xs text-muted-foreground">{p.name}</span>
          </button>
        ))}
        {showCritical && (
          <div className="flex items-center gap-1.5 shrink-0 ml-2 border-l border-border pl-4">
            <div className="w-8 border-t-2 border-dashed border-yellow-400" />
            <span className="text-xs text-yellow-400">Critical Path</span>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span>{diagram.milestones.length} stations · {diagram.activities.length} activities</span>
          {diagram.activities.filter(a => a.isOngoing).length > 0 && (
            <span className="text-green-400">· {diagram.activities.filter(a => a.isOngoing).length} ongoing</span>
          )}
          {showCritical && computedActivities.filter(a => a.isCritical).length > 0 && (
            <button
              onClick={() => setCriticalFocus(v => !v)}
              title={criticalFocus ? 'Click to deselect critical path focus' : 'Click to focus on critical path'}
              className={`px-2 py-0.5 rounded transition-all ${criticalFocus ? 'bg-yellow-400/20 text-yellow-300 ring-1 ring-yellow-400/40' : 'text-yellow-400 hover:bg-yellow-400/10'}`}
            >
              · {computedActivities.filter(a => a.isCritical).length} critical
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <DiagramCanvas
            ref={canvasRef}
            diagram={diagram}
            computedActivities={computedActivities}
            selection={selection}
            onSelectMilestone={id => { setSelection({ type: 'milestone', id }); setPanelTab('element'); }}
            onSelectActivity={id => { setSelection({ type: 'activity', id }); setPanelTab('element'); }}
            onMoveMilestone={handleMoveMilestone}
            onAddMilestone={handleAddMilestone}
            tool={tool}
            onConnectMilestones={handleConnectMilestones}
            showCritical={showCritical}
            criticalFocus={criticalFocus}
            theme={theme}
          />
          {tool !== 'select' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-4 py-2 text-xs text-muted-foreground pointer-events-none shadow-lg">
              {tool === 'add-milestone' && '🖱 Click on the canvas to place a station'}
              {tool === 'add-activity' && '🖱 Click a station to start — then click another or drag to connect'}
            </div>
          )}
        </div>

        <EditPanel
          diagram={diagram}
          selection={selection}
          computedActivities={computedActivities}
          consistencyIssues={consistencyIssues}
          onUpdateMilestone={handleUpdateMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onUpdateActivity={handleUpdateActivity}
          onDeleteActivity={handleDeleteActivity}
          onUpdatePath={handleUpdatePath}
          onDeletePath={handleDeletePath}
          onAddPath={handleAddPath}
          activeTab={panelTab}
          onTabChange={setPanelTab}
        />
      </div>
    </div>
  );
}
