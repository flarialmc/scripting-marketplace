import { NextRequest, NextResponse } from 'next/server';

async function fetchConfigArchive(configId: string): Promise<ArrayBuffer> {
  const zipUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/${configId}.zip`;
  const response = await fetch(zipUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error('Config archive not found');
  }
  return response.arrayBuffer();
}

async function fetchConfigIcon(configId: string): Promise<ArrayBuffer> {
  const iconUrl = `https://cdn.statically.io/gh/flarialmc/configs/main/${configId}/icon.png`;
  const response = await fetch(iconUrl, { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error('Icon not found');
  }
  return response.arrayBuffer();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const { params: pathParams } = await params;

  if (!pathParams || pathParams.length === 0) {
    return NextResponse.json({ error: 'Invalid request path' }, { status: 400 });
  }

  const path = pathParams.join('/');

  if (path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    if (path.endsWith('/download')) {
      const configId = path.replace('/download', '');
      const buffer = await fetchConfigArchive(configId);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${configId}.zip"`,
        },
      });
    } else if (path.endsWith('/icon.png')) {
      const configId = path.replace('/icon.png', '');
      const buffer = await fetchConfigIcon(configId);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
        },
      });
    } else {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching config resource:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Not found' },
      { status: 404 }
    );
  }
}
