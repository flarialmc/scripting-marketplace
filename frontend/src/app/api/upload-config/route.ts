import { NextRequest, NextResponse } from 'next/server';
import NextAuth, { AuthOptions, TokenSet, Session } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { getToken } from "next-auth/jwt";
import { JWT } from "next-auth/jwt";

// Store to track user uploads with timestamps
const userUploadTracker = new Map<string, number>(); // Key: userId, Value: timestamp (ms)
const processingRequests = new Set<string>();

// Time limit: 24 hours in milliseconds
const UPLOAD_COOLDOWN = 24 * 60 * 60 * 1000;
const FLARIAL_DISCORD_ID = "YOUR_DISCORD_SERVER_ID"; // Replace with your server ID

// NextAuth configuration
const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: TokenSet | null }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      return session;
    },
  },
};

// Initialize NextAuth handler (not exported, used internally)
const authHandler = NextAuth(authOptions);

interface Guild {
  id: string;
  name: string;
}

async function checkDiscordMembership(accessToken: string): Promise<boolean> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return false;
  const guilds: Guild[] = await response.json();
  return guilds.some(guild => guild.id === FLARIAL_DISCORD_ID);
}

export async function POST(request: NextRequest) {
  // Get session token manually
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Step 1: Check authentication
  if (!token || !token.accessToken || !token.id) {
    return NextResponse.json({ error: "Unauthorized. Please sign in with Discord." }, { status: 401 });
  }

  // Step 2: Check Discord membership
  const isMember = await checkDiscordMembership(token.accessToken as string);
  if (!isMember) {
    return NextResponse.json(
      { error: "You must be a member of the Flarial Discord server to upload." },
      { status: 403 }
    );
  }

  // Step 3: Use user ID from token
  const userId = token.id as string;
  
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
    const mainJsonFile = files.find(f => f.name.toLowerCase() === 'main.json');
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
        author: token.name || "Unknown",
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
      body: JSON.stringify({ message: `Add ${folderName} configuration by ${token.name}`, tree: treeData.sha, parents: [baseSha] }),
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
        title: `Add config: ${folderName} by ${token.name}`,
        head: newBranch,
        base: baseBranch,
        body: `This PR adds the ${folderName} configuration to backend/configs/. Submitted by ${token.name}.`,
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

// Export the auth handler for GET and POST (for auth routes)
export const GET = authHandler;
export const POST_AUTH = authHandler;
