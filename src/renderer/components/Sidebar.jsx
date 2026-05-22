import React from 'react';
import { Layers, Image as ImageIcon, Type, Square, Play } from 'lucide-react';

export default function Sidebar() {
  const tools = [
    { icon: <Layers size={20} />, label: 'Layers' },
    { icon: <Type size={20} />, label: 'Text' },
    { icon: <ImageIcon size={20} />, label: 'Media' },
    { icon: <Square size={20} />, label: 'Shapes' },
  ];

  return (
    <div className="w-16 bg-surface border-r border-border flex flex-col items-center py-4 gap-4 flex-shrink-0">
      {tools.map((tool, idx) => (
        <button 
          key={idx}
          className="p-3 rounded-xl text-muted hover:text-white hover:bg-white/10 transition-all group relative"
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      
      <div className="mt-auto mb-4">
        <button className="p-3 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/20">
          <Play size={20} className="ml-1" />
        </button>
      </div>
    </div>
  );
}
