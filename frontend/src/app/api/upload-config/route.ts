import { NextRequest, NextResponse } from 'next/server';

// Store to track user uploads with timestamps
const userUploadTracker = new Map<string, number>(); // Key: identifier, Value: timestamp (ms)
const processingRequests = new Set<string>();

// Time limit in milliseconds (e.g., 24 hours)
const UPLOAD_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

function getUserIdentifier(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
  const cookies = request.cookies;
  const cookieId = cookies.get('user_id')?.value || `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  return `${ip}-${cookieId}`;
}

export async function POST(request: NextRequest) {
  try {
    const userIdentifier = getUserIdentifier(request);
    
    // Check if user has uploaded and if cooldown has expired
    const lastUploadTime = userUploadTracker.get(userIdentifier);
    const currentTime = Date.now();
    
    if (lastUploadTime) {
      const timeSinceLastUpload = currentTime - lastUploadTime;
      if (timeSinceLastUpload < UPLOAD_COOLDOWN) {
        const remainingTime = Math.ceil((UPLOAD_COOLDOWN - timeSinceLastUpload) / (60 * 1000)); // in minutes
        return NextResponse.json(
          { error: `Upload limit reached. Please wait ${remainingTime} minutes before uploading again.` },
          { status: 403 }
        );
      }
      // If cooldown has expired, allow the upload and update the timestamp later
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configData = JSON.parse(formData.get('configData') as string);

    let configName = '';
    const mainJsonFile = files.find(f => f.name === 'main.json');
    if (mainJsonFile) {
      const mainJsonText = await mainJsonFile.text();
      const mainJson = JSON.parse(mainJsonText) as { name?: string };
      configName = mainJson.name?.trim() || configData.name?.trim() || `config-${Date.now()}`;
    } else {
      configName = configData.name?.trim() || `config-${Date.now()}`;
    }

    if (!configName) throw new Error('Invalid config name');

    if (processingRequests.has(configName)) {
      return NextResponse.json({ error: 'Upload already in progress' }, { status: 429 });
    }
    processingRequests.add(configName);

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) throw new Error('GitHub token not configured');

    const repoOwner = 'flarialmc';
    const repoName = 'scripting-marketplace';
    const baseBranch = 'main';
    const newBranch = `config/add-${configName}-${Date.now()}`;

    const githubApiBase = 'https://api.github.com';
    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    // GitHub API steps (unchanged)...
    const refResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`, { headers });
    if (!refResponse.ok) throw new Error(`Failed to get base branch ref: ${await refResponse.text()}`);
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    const createBranchResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
    });
    if (!createBranchResponse.ok) throw new Error(`Failed to create new branch: ${await createBranchResponse.text()}`);

    const updatedFiles = mainJsonFile ? files : [
      ...files,
      new File([JSON.stringify({
        id: configData.id,
        name: configData.name,
        version: configData.version,
        author: configData.author,
        createdAt: new Date().toISOString(),
      }, null, 2)], 'main.json', { type: 'application/json' }),
    ];

    const treeItems = [];
    for (const file of updatedFiles) {
      const fileContent = Buffer.from(await file.arrayBuffer()).toString('base64');
      const filePath = `backend/configs/${configName}/${file.name}`;
      const blobResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: fileContent, encoding: 'base64' }),
      });
      if (!blobResponse.ok) throw new Error(`Failed to create blob: ${await blobResponse.text()}`);
      const blobData = await blobResponse.json();
      treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blobData.sha });
    }

    const treeResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ base_tree: baseSha, tree: treeItems }),
    });
    if (!treeResponse.ok) throw new Error(`Failed to create tree: ${await treeResponse.text()}`);
    const treeData = await treeResponse.json();

    const commitResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: `Add ${configName} configuration`, tree: treeData.sha, parents: [baseSha] }),
    });
    if (!commitResponse.ok) throw new Error(`Failed to create commit: ${await commitResponse.text()}`);
    const commitData = await commitResponse.json();

    const updateRefResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs/heads/${newBranch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha }),
    });
    if (!updateRefResponse.ok) throw new Error(`Failed to update branch ref: ${await updateRefResponse.text()}`);

    const prResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Add config: ${configName}`,
        head: newBranch,
        base: baseBranch,
        body: `This PR adds the config-${configName} to backend/configs/. Please review and merge.`,
      }),
    });
    if (!prResponse.ok) throw new Error(`Failed to create PR: ${await prResponse.text()}`);

    // Update the user's last upload timestamp
    userUploadTracker.set(userIdentifier, Date.now());

    const response = NextResponse.json({ message: 'Pull request created successfully' }, { status: 200 });
    if (!request.cookies.get('user_id')) {
      response.cookies.set('user_id', userIdentifier.split('-')[1], {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: `Failed to create pull request: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  } finally {
    processingRequests.clear();
  }
}
