'use client';

import { Config } from '@/types/config';
import { ConfigCard } from '../ConfigCard/ConfigCard';

interface ConfigGridProps {
  configs: Config[];
}

export function ConfigGrid({ configs }: ConfigGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {configs.map((config) => (
        <ConfigCard key={config.name} config={config} />
      ))}
    </div>
  );
}