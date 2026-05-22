import React from 'react';
import useEditorStore from '../../store/useEditorStore';

export default function PropertiesPanel() {
  const { canvasSize, setCanvasSize } = useEditorStore();

  return (
    <div className="w-64 bg-surface border-l border-border flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold tracking-wide text-text/90 uppercase">Properties</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* Canvas Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted uppercase">Layout Size</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-muted">WIDTH</label>
              <input 
                type="number" 
                value={canvasSize.width}
                onChange={(e) => setCanvasSize(Number(e.target.value), canvasSize.height)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted">HEIGHT</label>
              <input 
                type="number" 
                value={canvasSize.height}
                onChange={(e) => setCanvasSize(canvasSize.width, Number(e.target.value))}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Example Background Setting */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted uppercase">Background</h3>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-black border border-border cursor-pointer"></div>
            <span className="text-sm text-text/80 font-mono">#000000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
