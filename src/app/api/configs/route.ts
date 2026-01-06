import { NextResponse } from 'next/server';

interface ConfigIndexEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloadUrl: string;
  iconUrl: string;
  filename: string;
  directory: string;
}

interface ConfigMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloadUrl: string;
  iconUrl: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
}

async function fetchConfigIndex(): Promise<ConfigIndexEntry[]> {
  const indexUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/config-index.json`;

  const response = await fetch(indexUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch config index: ${response.statusText}`);
  }

  return response.json();
}

function convertIndexEntryToMetadata(entry: ConfigIndexEntry): ConfigMetadata {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description || '',
    author: entry.author || '',
    version: entry.version || '1.0.0',
    downloadUrl: entry.downloadUrl,
    iconUrl: entry.iconUrl,
    filename: entry.filename,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const indexEntries = await fetchConfigIndex();
    const configs = indexEntries.map(convertIndexEntryToMetadata);

    return NextResponse.json({ configs }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return NextResponse.json({ configs: [] }, { status: 200 });
  }
}
