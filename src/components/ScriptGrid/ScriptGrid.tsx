'use client';

import { Script } from '@/types/script';
import { ScriptCard } from '../ScriptCard/ScriptCard';

interface ScriptGridProps {
  scripts: Script[];
}

export function ScriptGrid({ scripts }: ScriptGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scripts.map((script) => (
        <ScriptCard key={script.id} script={script} />
      ))}
    </div>
  );
}