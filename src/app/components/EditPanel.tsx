import React, { useState, useEffect } from 'react';
import { Milestone, Activity, Path, Diagram, ConsistencyIssue } from '../types';
import { Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const PATH_COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#a8dadc',
  '#c77dff', '#06d6a0', '#ff6b6b', '#ffd166', '#118ab2',
  '#ef476f', '#80b918',
];

interface Props {
  diagram: Diagram;
  selection: { type: string | null; id: string | null };
  computedActivities: Activity[];
  consistencyIssues: ConsistencyIssue[];
  onUpdateMilestone: (id: string, data: Partial<Milestone>) => void;
  onDeleteMilestone: (id: string) => void;
  onUpdateActivity: (id: string, data: Partial<Activity>) => void;
  onDeleteActivity: (id: string) => void;
  onUpdatePath: (id: string, data: Partial<Path>) => void;
  onDeletePath: (id: string) => void;
  onAddPath: () => void;
  activeTab: 'element' | 'paths' | 'consistency';
  onTabChange: (t: 'element' | 'paths' | 'consistency') => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="bg-secondary border border-border rounded px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      className="bg-secondary border border-border rounded px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full resize-none"
      rows={3}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      className="bg-secondary border border-border rounded px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm w-full mono"
      value={value}
      min={0}
      onChange={e => onChange(Number(e.target.value))}
    />
  );
}

export function EditPanel({
  diagram, selection, computedActivities, consistencyIssues,
  onUpdateMilestone, onDeleteMilestone,
  onUpdateActivity, onDeleteActivity,
  onUpdatePath, onDeletePath, onAddPath,
  activeTab, onTabChange,
}: Props) {
  const selectedMilestone = selection.type === 'milestone' ? diagram.milestones.find(m => m.id === selection.id) : null;
  const selectedActivity = selection.type === 'activity' ? diagram.activities.find(a => a.id === selection.id) : null;
  const computedAct = selectedActivity ? computedActivities.find(a => a.id === selectedActivity.id) : null;

  const getMilestoneName = (id: string) => diagram.milestones.find(m => m.id === id)?.name ?? '?';
  const getPathName = (id: string) => diagram.paths.find(p => p.id === id)?.name ?? '?';

  const tabBase = "px-3 py-1.5 text-xs uppercase tracking-widest border-b-2 transition-colors cursor-pointer";
  const tabActive = `${tabBase} border-primary text-primary`;
  const tabInactive = `${tabBase} border-transparent text-muted-foreground hover:text-foreground`;

  const errorCount = consistencyIssues.filter(i => i.type === 'error').length;
  const warnCount = consistencyIssues.filter(i => i.type === 'warning').length;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border" style={{ width: 280 }}>
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button className={activeTab === 'element' ? tabActive : tabInactive} onClick={() => onTabChange('element')}>
          {selection.id ? 'Edit' : 'Info'}
        </button>
        <button className={activeTab === 'paths' ? tabActive : tabInactive} onClick={() => onTabChange('paths')}>
          Paths
        </button>
        <button className={activeTab === 'consistency' ? tabActive : tabInactive} onClick={() => onTabChange('consistency')}>
          Check
          {(errorCount > 0 || warnCount > 0) && (
            <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${errorCount > 0 ? 'bg-destructive text-white' : 'bg-yellow-600 text-white'}`}>
              {errorCount + warnCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* ELEMENT TAB */}
        {activeTab === 'element' && (
          <>
            {!selection.id && (
              <div className="text-muted-foreground text-xs text-center mt-8">
                <p className="mb-1">Click a milestone or activity</p>
                <p>to edit its properties.</p>
              </div>
            )}

            {selectedMilestone && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Milestone</span>
                  <button
                    className="text-destructive hover:text-red-400 p-1 rounded"
                    onClick={() => onDeleteMilestone(selectedMilestone.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <Field label="Name">
                  <TextInput value={selectedMilestone.name} onChange={v => onUpdateMilestone(selectedMilestone.id, { name: v })} placeholder="Milestone name" />
                </Field>
                <Field label="Description">
                  <TextArea value={selectedMilestone.description} onChange={v => onUpdateMilestone(selectedMilestone.id, { description: v })} placeholder="Optional description" />
                </Field>
                <div className="border border-border rounded p-2 text-xs text-muted-foreground flex flex-col gap-1">
                  <span>Position: <span className="text-foreground mono">{selectedMilestone.x}, {selectedMilestone.y}</span></span>
                  <span>Connected activities: <span className="text-foreground">{diagram.activities.filter(a => a.fromMilestoneId === selectedMilestone.id || a.toMilestoneId === selectedMilestone.id).length}</span></span>
                </div>
              </div>
            )}

            {selectedActivity && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Activity</span>
                  <button
                    className="text-destructive hover:text-red-400 p-1 rounded"
                    onClick={() => onDeleteActivity(selectedActivity.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <Field label="Name">
                  <TextInput value={selectedActivity.name} onChange={v => onUpdateActivity(selectedActivity.id, { name: v })} placeholder="Activity name" />
                </Field>
                <Field label="Description">
                  <TextArea value={selectedActivity.description} onChange={v => onUpdateActivity(selectedActivity.id, { description: v })} placeholder="Optional description" />
                </Field>
                <Field label="Duration (days)">
                  <NumberInput value={selectedActivity.duration} onChange={v => onUpdateActivity(selectedActivity.id, { duration: v })} />
                </Field>
                <Field label="Path">
                  <select
                    className="bg-secondary border border-border rounded px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedActivity.pathId}
                    onChange={e => onUpdateActivity(selectedActivity.id, { pathId: e.target.value })}
                  >
                    {diagram.paths.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="border border-border rounded p-2 text-xs flex flex-col gap-1">
                  <span className="text-muted-foreground">From: <span className="text-foreground">{getMilestoneName(selectedActivity.fromMilestoneId)}</span></span>
                  <span className="text-muted-foreground">To: <span className="text-foreground">{getMilestoneName(selectedActivity.toMilestoneId)}</span></span>
                  <span className="text-muted-foreground">Line: <span className="text-foreground">{getPathName(selectedActivity.pathId)}</span></span>
                </div>
                {computedAct && (
                  <div className="border border-border rounded p-2 text-xs flex flex-col gap-1 bg-secondary">
                    <span className="text-muted-foreground uppercase tracking-widest mb-1">CPM Analysis</span>
                    <span className="text-muted-foreground">Early Start: <span className="text-foreground mono">{computedAct.earlyStart ?? '—'}</span></span>
                    <span className="text-muted-foreground">Early Finish: <span className="text-foreground mono">{computedAct.earlyFinish ?? '—'}</span></span>
                    <span className="text-muted-foreground">Late Start: <span className="text-foreground mono">{computedAct.lateStart ?? '—'}</span></span>
                    <span className="text-muted-foreground">Late Finish: <span className="text-foreground mono">{computedAct.lateFinish ?? '—'}</span></span>
                    <span className="text-muted-foreground">Total Float: <span className={`mono ${computedAct.totalFloat === 0 ? 'text-yellow-400' : 'text-foreground'}`}>{computedAct.totalFloat ?? '—'}</span></span>
                    {computedAct.isCritical && (
                      <span className="text-yellow-400 font-medium mt-1">⚡ Critical Path</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* PATHS TAB */}
        {activeTab === 'paths' && (
          <div className="flex flex-col gap-3">
            {diagram.paths.map(path => (
              <PathEditor
                key={path.id}
                path={path}
                activityCount={diagram.activities.filter(a => a.pathId === path.id).length}
                onUpdate={data => onUpdatePath(path.id, data)}
                onDelete={() => onDeletePath(path.id)}
                isSelected={selection.type === 'path' && selection.id === path.id}
              />
            ))}
            <button
              onClick={onAddPath}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary text-sm transition-colors"
            >
              + Add Path
            </button>
          </div>
        )}

        {/* CONSISTENCY TAB */}
        {activeTab === 'consistency' && (
          <div className="flex flex-col gap-2">
            {consistencyIssues.length === 0 ? (
              <div className="flex flex-col items-center gap-2 mt-8 text-center">
                <CheckCircle size={28} className="text-green-400" />
                <span className="text-green-400 text-sm">No issues found</span>
                <span className="text-muted-foreground text-xs">Diagram is consistent</span>
              </div>
            ) : (
              consistencyIssues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex gap-2 p-2 rounded border text-xs ${issue.type === 'error' ? 'border-destructive/40 bg-destructive/10 text-red-300' : 'border-yellow-600/40 bg-yellow-900/20 text-yellow-300'}`}
                >
                  {issue.type === 'error'
                    ? <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    : <Info size={12} className="shrink-0 mt-0.5" />
                  }
                  <span>{issue.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PathEditor({ path, activityCount, onUpdate, onDelete, isSelected }: {
  path: Path;
  activityCount: number;
  onUpdate: (d: Partial<Path>) => void;
  onDelete: () => void;
  isSelected?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isSelected) setOpen(true);
  }, [isSelected]);
  return (
    <div className="border border-border rounded overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: path.color }} />
        <span className="text-sm flex-1 truncate">{path.name}</span>
        <span className="text-xs text-muted-foreground">{activityCount}</span>
        {open ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
      </div>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border bg-secondary/30">
          <div className="flex flex-col gap-1 pt-2">
            <label className="text-xs text-muted-foreground uppercase tracking-widest">Name</label>
            <input
              className="bg-secondary border border-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={path.name}
              onChange={e => onUpdate({ name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground uppercase tracking-widest">Description</label>
            <textarea
              className="bg-secondary border border-border rounded px-2 py-1 text-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
              value={path.description}
              onChange={e => onUpdate({ description: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground uppercase tracking-widest">Color</label>
            <div className="flex gap-1 flex-wrap">
              {PATH_COLORS.map(c => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full transition-transform ${path.color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                  style={{ background: c }}
                  onClick={() => onUpdate({ color: c })}
                />
              ))}
              <input
                type="color"
                className="w-6 h-6 rounded-full border-0 cursor-pointer bg-transparent"
                value={path.color}
                onChange={e => onUpdate({ color: e.target.value })}
                title="Custom color"
              />
            </div>
          </div>
          <button
            className="flex items-center gap-1 text-destructive hover:text-red-400 text-xs mt-1"
            onClick={onDelete}
          >
            <Trash2 size={12} /> Delete path
          </button>
        </div>
      )}
    </div>
  );
}
