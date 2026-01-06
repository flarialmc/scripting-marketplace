import { NextRequest, NextResponse } from 'next/server';

interface ScriptIndexEntry {
  filename: string;
  name: string;
  path: string;
}

async function fetchScriptIndex(scriptType: 'module' | 'command'): Promise<ScriptIndexEntry[]> {
  const indexUrl = `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}-index.json`;
  const response = await fetch(indexUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${scriptType} index`);
  }
  return response.json();
}

async function fetchScriptContent(scriptType: 'module' | 'command', filename: string): Promise<string> {
  const scriptUrl = `https://cdn.statically.io/gh/flarialmc/scripts/main/${scriptType}/${filename}`;
  const response = await fetch(scriptUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error('Script not found');
  }
  return response.text();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const { params: pathParams } = await params;

  if (!pathParams || pathParams.length < 2) {
    return NextResponse.json(
      { error: 'Invalid request path - specify type (module/command) and script name' },
      { status: 400 }
    );
  }

  const [scriptType, scriptName, action] = pathParams;

  if (scriptType !== 'module' && scriptType !== 'command') {
    return NextResponse.json(
      { error: 'Invalid script type - must be "module" or "command"' },
      { status: 400 }
    );
  }

  try {
    const indexEntries = await fetchScriptIndex(scriptType as 'module' | 'command');
    const entry = indexEntries.find(
      (e) => e.filename.replace('.lua', '').toLowerCase() === scriptName.toLowerCase()
    );

    if (!entry) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    const content = await fetchScriptContent(scriptType as 'module' | 'command', entry.filename);

    if (action === 'download') {
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${entry.filename}"`,
        },
      });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error fetching script:', error);
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }
}
