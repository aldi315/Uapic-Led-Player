import React from 'react';
import { Save, FolderOpen, Settings, LayoutGrid } from 'lucide-react';
import useEditorStore from '../../store/useEditorStore';

export default function Toolbar() {
  const { zoomLevel, setZoomLevel } = useEditorStore();

  return (
    <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors">
          <FolderOpen size={16} /> Open
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors">
          <Save size={16} /> Save
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
            onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
          >-</button>
          <span className="text-xs font-mono w-12 text-center">{zoomLevel}%</span>
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
          >+</button>
        </div>

        <div className="h-6 w-px bg-border mx-2"></div>

        <button className="p-2 rounded text-muted hover:text-white hover:bg-white/10 transition-colors">
          <LayoutGrid size={18} />
        </button>
        <button className="p-2 rounded text-muted hover:text-white hover:bg-white/10 transition-colors">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
