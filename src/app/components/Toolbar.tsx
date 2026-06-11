import React, { useRef, useState } from 'react';
import { MousePointer2, Circle, GitCommitHorizontal, Save, FolderOpen, Plus, Eye, EyeOff, Sun, Moon, FileImage, Info } from 'lucide-react';
import { Diagram, Path } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Props {
  tool: 'select' | 'add-milestone' | 'add-activity';
  onToolChange: (t: 'select' | 'add-milestone' | 'add-activity') => void;
  showCritical: boolean;
  onToggleCritical: () => void;
  title: string;
  onTitleChange: (t: string) => void;
  paths: Path[];
  activePathId: string | null;
  onActivePathChange: (id: string) => void;
  onSave: () => void;
  onLoad: (d: Diagram) => void;
  onNew: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onExport: () => void;
}

export function Toolbar({ tool, onToolChange, showCritical, onToggleCritical, title, onTitleChange, paths, activePathId, onActivePathChange, onSave, onLoad, onNew, theme, onToggleTheme, onExport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target?.result as string) as Diagram;
        onLoad(d);
      } catch {
        alert('Invalid diagram file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toolBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`;

  const actionBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors';

  return (
    <header className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0 z-10">
      {/* App name */}
      <span className="text-sm font-bold tracking-widest uppercase text-primary shrink-0">
        Train of Consequences
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Title */}
      <input
        className="bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base font-semibold min-w-0 flex-1 max-w-xs"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Untitled Diagram"
      />

      <div className="w-px h-6 bg-border mx-1" />

      {/* Drawing tools */}
      <div className="flex items-center gap-1">
        <button className={toolBtn(tool === 'select')} onClick={() => onToolChange('select')} title="Select / Pan">
          <MousePointer2 size={14} /> Select
        </button>
        <button className={toolBtn(tool === 'add-milestone')} onClick={() => onToolChange('add-milestone')} title="Add Milestone (click canvas)">
          <Circle size={14} /> Station
        </button>
        <button className={toolBtn(tool === 'add-activity')} onClick={() => onToolChange('add-activity')} title="Add Activity (drag between stations)">
          <GitCommitHorizontal size={14} /> Activity
        </button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Active path selection */}
      <div className="flex items-center gap-2">
        <select
          className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={activePathId ?? ''}
          onChange={e => onActivePathChange(e.target.value)}
        >
          <option value="" disabled>{paths.length ? 'Select line' : 'No lines available'}</option>
          {paths.map(path => (
            <option key={path.id} value={path.id}>{path.name}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* CPM view */}
      <button className={toolBtn(showCritical)} onClick={onToggleCritical} title="Highlight critical path">
        {showCritical ? <Eye size={14} /> : <EyeOff size={14} />}
        Critical
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* File actions */}
      <button className={actionBtn} onClick={onNew} title="New diagram">
        <Plus size={14} /> New
      </button>
      <button className={actionBtn} onClick={onSave} title="Save diagram (JSON)">
        <Save size={14} /> Save
      </button>
      <button className={actionBtn} onClick={() => fileRef.current?.click()} title="Load diagram">
        <FolderOpen size={14} /> Load
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleLoad} />

      <div className="w-px h-6 bg-border mx-1" />

      {/* Export PNG */}
      <button className={actionBtn} onClick={onExport} title="Export as PNG (for PowerPoint / email)">
        <FileImage size={14} /> Export PNG
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Theme toggle */}
      <button className={actionBtn} onClick={onToggleTheme} title="Toggle light / dark theme">
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* About */}
      <button className={actionBtn} onClick={() => setAboutOpen(true)} title="About">
        <Info size={14} /> About
      </button>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="tracking-wide uppercase text-primary">Train of Consequences</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A browser-based Critical Path Method (CPM) diagram editor. Build project networks from stations and activities — the CPM engine highlights the critical path in real time.
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Author</span>
              <span className="text-foreground font-medium">David Avanzini</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">LinkedIn</span>
              <a href="https://www.linkedin.com/in/davidavanzini/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">davidavanzini</a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">GitHub</span>
              <a href="https://github.com/DavidAvanzini/TOC" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DavidAvanzini/TOC</a>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">License</span>
              <span className="text-foreground">MIT © 2026 David Avanzini</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
