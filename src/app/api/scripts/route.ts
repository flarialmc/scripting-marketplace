import { NextResponse } from 'next/server';

interface ScriptIndexEntry {
  filename: string;
  name: string;
  description: string;
  author: string;
  version: string;
  type: 'module' | 'command';
  path: string;
}

interface ScriptMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  type: 'module' | 'command';
  version: string;
  downloadUrl: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
}

async function fetchScriptIndex(scriptType: 'module' | 'command'): Promise<ScriptIndexEntry[]> {
  const indexUrl = `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}-index.json`;

  const response = await fetch(indexUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${scriptType} index: ${response.statusText}`);
  }

  return response.json();
}

function convertIndexEntryToMetadata(entry: ScriptIndexEntry): ScriptMetadata {
  return {
    id: `${entry.type}-${entry.filename.replace('.lua', '')}`,
    name: entry.name || entry.filename.replace('.lua', ''),
    description: entry.description || '',
    author: entry.author || '',
    type: entry.type,
    version: entry.version || '1.0.0',
    downloadUrl: `https://cdn.statically.io/gh/flarialmc/scripts/main/${entry.path}`,
    filename: entry.filename.replace('.lua', ''),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageUrl: '',
  };
}

export async function GET() {
  try {
    const [moduleIndex, commandIndex] = await Promise.all([
      fetchScriptIndex('module'),
      fetchScriptIndex('command'),
    ]);

    const moduleScripts = moduleIndex.map(convertIndexEntryToMetadata);
    const commandScripts = commandIndex.map(convertIndexEntryToMetadata);

    return NextResponse.json({
      module: moduleScripts,
      command: commandScripts,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json({ module: [], command: [] }, { status: 200 });
  }
}
