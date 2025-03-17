import { NextRequest, NextResponse } from 'next/server';

// Store to track user uploads with timestamps
const userUploadTracker = new Map<string, number>(); // Key: identifier, Value: timestamp (ms)
const processingRequests = new Set<string>();

// Time limit: 24 hours in milliseconds
const UPLOAD_COOLDOWN = 24 * 60 * 60 * 1000; // Adjust for testing (e.g., 1 * 60 * 1000 for 1 minute)

// Helper to get unique user identifier
function getUserIdentifier(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
  const cookies = request.cookies;
  const cookieId = cookies.get('user_id')?.value || `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  return `${ip}-${cookieId}`;
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Identify the user and check cooldown
    const userIdentifier = getUserIdentifier(request);
    console.log(`User identifier: ${userIdentifier}`);

    const lastUploadTime = userUploadTracker.get(userIdentifier);
    const currentTime = Date.now();
    
    if (lastUploadTime) {
      const timeSinceLastUpload = currentTime - lastUploadTime;
      console.log(`Last upload time: ${lastUploadTime}, Time since: ${timeSinceLastUpload}ms`);
      
      if (timeSinceLastUpload < UPLOAD_COOLDOWN) {
        const remainingTime = Math.ceil((UPLOAD_COOLDOWN - timeSinceLastUpload) / (60 * 1000)); // in minutes
        console.log(`Cooldown active. Remaining time: ${remainingTime} minutes`);
        return NextResponse.json(
          { error: `Upload limit reached. Please wait ${remainingTime} minutes before uploading again.` },
          { status: 403 }
        );
      } else {
        console.log('Cooldown expired, allowing new upload');
      }
    } else {
      console.log('No previous upload found for this user');
    }

    // Step 2: Parse request data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configData = JSON.parse(formData.get('configData') as string);

    // Step 3: Determine folder name (used as the config folder)
    let folderName = '';
    const mainJsonFile = files.find(f => f.name === 'main.json');
    if (mainJsonFile) {
      const mainJsonText = await mainJsonFile.text();
      const mainJson = JSON.parse(mainJsonText) as { name?: string };
      folderName = mainJson.name?.trim() || configData.name?.trim() || `config-${Date.now()}`;
    } else {
      folderName = configData.name?.trim() || `config-${Date.now()}`;
    }
    if (!folderName) throw new Error('Invalid folder name');
    console.log(`Folder name: ${folderName}`);

    // Step 4: Check for duplicate processing
    if (processingRequests.has(folderName)) {
      console.log(`Duplicate upload detected for folder: ${folderName}`);
      return NextResponse.json({ error: 'Upload already in progress' }, { status: 429 });
    }
    processingRequests.add(folderName);

    // Step 5: GitHub setup
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) throw new Error('GitHub token not configured');

    const repoOwner = 'flarialmc';
    const repoName = 'scripting-marketplace';
    const baseBranch = 'main';
    const newBranch = `config/add-${folderName}-${Date.now()}`;
    const githubApiBase = 'https://api.github.com';
    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    // Step 6: Get the latest commit SHA
    const refResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`, { headers });
    if (!refResponse.ok) throw new Error(`Failed to get base branch ref: ${await refResponse.text()}`);
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;
    console.log(`Base SHA: ${baseSha}`);

    // Step 7: Create a new branch
    const createBranchResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
    });
    if (!createBranchResponse.ok) throw new Error(`Failed to create branch: ${await createBranchResponse.text()}`);
    console.log(`Branch created: ${newBranch}`);

    // Step 8: Prepare files for commit (including auto-generated manifest if needed)
    const updatedFiles = mainJsonFile ? files : [
      ...files,
      new File([JSON.stringify({
        id: configData.id,
        name: configData.name,
        version: configData.version,
        author: configData.author,
        createdAt: new Date().toISOString(),
      }, null, 2)], 'manifest.json', { type: 'application/json' }),
    ];

    const treeItems = [];
    for (const file of updatedFiles) {
      const fileContent = Buffer.from(await file.arrayBuffer()).toString('base64');
      const filePath = `backend/configs/${folderName}/${file.name}`; // Place files directly under folderName
      console.log(`Staging file: ${filePath}`);
      const blobResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: fileContent, encoding: 'base64' }),
      });
      if (!blobResponse.ok) throw new Error(`Failed to create blob: ${await blobResponse.text()}`);
      const blobData = await blobResponse.json();
      treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blobData.sha });
    }

    // Step 9: Create new tree and commit
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
      body: JSON.stringify({ message: `Add ${folderName} configuration`, tree: treeData.sha, parents: [baseSha] }),
    });
    if (!commitResponse.ok) throw new Error(`Failed to create commit: ${await commitResponse.text()}`);
    const commitData = await commitResponse.json();

    // Step 10: Update branch reference
    const updateRefResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs/heads/${newBranch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha }),
    });
    if (!updateRefResponse.ok) throw new Error(`Failed to update branch ref: ${await updateRefResponse.text()}`);

    // Step 11: Create pull request
    const prResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Add config: ${folderName}`,
        head: newBranch,
        base: baseBranch,
        body: `This PR adds the ${folderName} configuration to backend/configs/. Please review and merge.`,
      }),
    });
    if (!prResponse.ok) throw new Error(`Failed to create PR: ${await prResponse.text()}`);
    console.log('Pull request created successfully');

    // Step 12: Record upload timestamp
    userUploadTracker.set(userIdentifier, currentTime);
    console.log(`Upload recorded for ${userIdentifier} at ${currentTime}`);

    // Step 13: Set cookie and return response
    const response = NextResponse.json({ message: 'Pull request created successfully' }, { status: 200 });
    if (!request.cookies.get('user_id')) {
      response.cookies.set('user_id', userIdentifier.split('-')[1], { httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
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
    console.log('Processing requests cleared');
  }
}
