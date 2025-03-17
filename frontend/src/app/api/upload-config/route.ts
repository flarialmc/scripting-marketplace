import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// Store to track user uploads with timestamps
const userUploadTracker = new Map<string, number>(); // Key: userId, Value: timestamp (ms)
const processingRequests = new Set<string>();

// Time limit: 24 hours in milliseconds
const UPLOAD_COOLDOWN = 24 * 60 * 60 * 1000;
const FLARIAL_DISCORD_ID = "YOUR_DISCORD_SERVER_ID"; // Replace with your server ID

async function checkDiscordMembership(accessToken: string): Promise<boolean> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return false;
  const guilds = await response.json();
  return guilds.some((guild: any) => guild.id === FLARIAL_DISCORD_ID);
}

export async function POST(request: NextRequest) {
  // Step 1: Check authentication
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized. Please sign in with Discord." }, { status: 401 });
  }

  // Step 2: Check Discord membership
  const isMember = await checkDiscordMembership(session.accessToken);
  if (!isMember) {
    return NextResponse.json(
      { error: "You must be a member of the Flarial Discord server to upload." },
      { status: 403 }
    );
  }

  // Step 3: Use user ID from session instead of IP/cookie
  const userId = session.user.id;
  
  // Step 4: Check cooldown
  const lastUploadTime = userUploadTracker.get(userId);
  const currentTime = Date.now();

  if (lastUploadTime) {
    const timeSinceLastUpload = currentTime - lastUploadTime;
    if (timeSinceLastUpload < UPLOAD_COOLDOWN) {
      const remainingTime = Math.ceil((UPLOAD_COOLDOWN - timeSinceLastUpload) / (60 * 1000));
      return NextResponse.json(
        { error: `Upload limit reached. Please wait ${remainingTime} minutes before uploading again.` },
        { status: 403 }
      );
    }
  }

  // Step 5: Parse request data
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configData = JSON.parse(formData.get('configData') as string);

    // Step 6: Determine folder name
    let folderName = '';
    const mainJsonFile = files.find(f => f.name === 'main.json');
    if (mainJsonFile) {
      const mainJsonText = await mainJsonFile.text();
      const mainJson = JSON.parse(mainJsonText) as { name?: string };
      folderName = configData.id?.trim() || configData.name?.trim() || mainJson.name?.trim() || `config-${Date.now()}`;
    } else {
      folderName = configData.id?.trim() || configData.name?.trim() || `config-${Date.now()}`;
    }
    if (!folderName) throw new Error('Invalid folder name');

    // Step 7: Check for duplicate processing
    if (processingRequests.has(folderName)) {
      return NextResponse.json({ error: 'Upload already in progress' }, { status: 429 });
    }
    processingRequests.add(folderName);

    // Step 8: GitHub setup
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

    // Step 9: Get the latest commit SHA
    const refResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`, { headers });
    if (!refResponse.ok) throw new Error(`Failed to get base branch ref: ${await refResponse.text()}`);
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    // Step 10: Create a new branch
    const createBranchResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
    });
    if (!createBranchResponse.ok) throw new Error(`Failed to create branch: ${await createBranchResponse.text()}`);

    // Step 11: Prepare files for commit
    const updatedFiles = mainJsonFile ? files : [
      ...files,
      new File([JSON.stringify({
        id: configData.id,
        name: configData.name,
        version: configData.version,
        author: session.user.name || "Unknown", // Use Discord username
        createdAt: new Date().toISOString(),
      }, null, 2)], 'manifest.json', { type: 'application/json' }),
    ];

    const treeItems = [];
    for (const file of updatedFiles) {
      const fileContent = Buffer.from(await file.arrayBuffer()).toString('base64');
      const baseFileName = file.name.split('/').pop() || file.name;
      const filePath = `backend/configs/${folderName}/${baseFileName}`;
      
      const blobResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: fileContent, encoding: 'base64' }),
      });
      if (!blobResponse.ok) throw new Error(`Failed to create blob: ${await blobResponse.text()}`);
      const blobData = await blobResponse.json();
      treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blobData.sha });
    }

    // Step 12: Create new tree and commit
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
      body: JSON.stringify({ message: `Add ${folderName} configuration by ${session.user.name}`, tree: treeData.sha, parents: [baseSha] }),
    });
    if (!commitResponse.ok) throw new Error(`Failed to create commit: ${await commitResponse.text()}`);
    const commitData = await commitResponse.json();

    // Step 13: Update branch reference
    const updateRefResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs/heads/${newBranch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha }),
    });
    if (!updateRefResponse.ok) throw new Error(`Failed to update branch ref: ${await updateRefResponse.text()}`);

    // Step 14: Create pull request
    const prResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Add config: ${folderName} by ${session.user.name}`,
        head: newBranch,
        base: baseBranch,
        body: `This PR adds the ${folderName} configuration to backend/configs/. Submitted by ${session.user.name}.`,
      }),
    });
    if (!prResponse.ok) throw new Error(`Failed to create PR: ${await prResponse.text()}`);

    // Step 15: Record upload timestamp
    userUploadTracker.set(userId, currentTime);

    return NextResponse.json({ message: 'Pull request created successfully' }, { status: 200 });
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
