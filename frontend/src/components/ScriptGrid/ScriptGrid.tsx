'use client';

import { Script } from '@/types/script';
import { ScriptCard } from '../ScriptCard/ScriptCard';

interface ScriptGridProps {
  scripts: Script[];
  containerClass?: string; // Allow containerClass as an optional prop
  cardClass?: string; // Allow cardClass as an optional prop
  buttonClass?: string; // Allow buttonClass as an optional prop
}

export function ScriptGrid({ scripts, containerClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", cardClass = "w-32 h-32 rounded-lg bg-gray-200/40 dark:bg-gray-800/40 border-2 border-white shadow-lg backdrop-blur-md", buttonClass = "bg-green-700 text-black font-bold py-2 px-4 rounded shadow-md hover:bg-green-800 transition mt-4" }: ScriptGridProps) {
  return (
    <div className={containerClass}>
      {scripts.map((script) => (
        <div key={script.id} className={cardClass}>
          <ScriptCard script={script} />
          <button className={buttonClass}>Download</button>
        </div>
      ))}
    </div>
  );
}
