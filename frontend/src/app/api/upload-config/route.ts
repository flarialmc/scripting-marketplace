import { NextRequest, NextResponse } from 'next/server';

// Store to track user uploads and configs
const userUploadTracker = new Map<string, number>(); // Key: identifier, Value: timestamp (ms)
const ipConfigTracker = new Map<string, string>(); // Key: IP, Value: config name
const discordConfigTracker = new Map<string, string>(); // Key: Discord ID, Value: config name
const processingRequests = new Set<string>();

// Time limit: 24 hours in milliseconds
const UPLOAD_COOLDOWN = 24 * 60 * 60 * 1000;

// Bad words list (expand as needed)
const BAD_WORDS = [     
  "nigger", "nigga", "fuck", "shit", "bitch", "asshole", "cunt", "faggot", "retard", "whore",
  "dick", "pussy", "bastard", "slut", "hell", "cock", "tits", "prick", "chink",
  "spic", "kike", "wop", "gook", "jap", "cracker", "freak", "douche", "skank", "tramp",
  "piss", "crap", "twat", "wanker", "arse", "bollocks", "bugger", "fart", "shag", "tosser",
  "dyke", "queer", "homo", "coon", "redskin", "wetback", "beaner", "gringo", "honky", "mick",
  "dago", "kraut", "yid", "paki", "raghead", "sandnigger", "towelhead", "cameljockey", "zipperhead", "slope",
  "nazi", "klan", "savage", "injun", "negro", "mulatto", "halfbreed", "mongoloid", "darkie", "sambo",
  "jewboy", "heeb", "shylock", "gyp", "gypsy", "tranny", "shemale", "pedophile", "rapist", "pervert",
  "skullfuck", "shithead", "fuckface", "dumbass", "jackass", "motherfucker", "cocksucker", "asswipe", "shitbag", "cum",
  "jizz", "spunk", "clit", "smegma", "buttfuck", "rimjob", "blowjob", "handjob", "fucktard", "dipshit",
  "pissflaps", "shitstain", "fuckwit", "arsehole", "bellend", "knob", "prat", "git", "minger", "slapper",
  "cholo", "uncle tom", "house nigger", "porch monkey", "jungle bunny", "tar baby", "pickaninny", "coonass", "nigglet",
  "fudgepacker", "carpetmuncher", "lezbo", "breeder", "pansy", "poof", "fairy", "butch", "sissy", "nancy",
  "whigger", "wigger", "whitey", "bluegum", "buckwheat", "jigaboo", "zip coon", "moon cricket", "spook", "boogie",
  "fuckoff", "piss off", "shitface", "asshat", "cocktease", "cumslut", "dickhead", "fucker", "shithead", "twatface",
  "bint", "slag", "tart","weasel", "scumbag", "bkl", "gaand", "madarchod", "bhokachoda", "chut", "lund", "lele", "bhosdike", "bhosad",
  "raand", "randi", "chuda", "madarchod", "anshul", "chutiya", "ammi", "bari", "ashank", "mbg" 
].map(word => word.toLowerCase());

// Discord Embed interface
interface DiscordEmbed {
  title: string;
  fields: { name: string; value: string; inline: boolean }[];
  color: number;
  timestamp: string;
}

// GitHub PR interface (simplified)
interface GitHubPR {
  title: string;
}

// Helper to get unique user identifier
function getUserIdentifier(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
  const cookies = request.cookies;
  const cookieId = cookies.get('user_id')?.value || `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  return `${ip}-${cookieId}`;
}

// Helper to get Discord ID from formData
function getDiscordId(formData: FormData): string | null {
  return formData.get('discordId') as string | null;
}

// Helper to generate ID from name
function generateIdFromName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

// Helper to check for bad words anywhere in the name
function containsBadWords(name: string): boolean {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BAD_WORDS.some(badWord => normalizedName.includes(badWord));
}

// Helper to check for existing PRs with the same name (case-insensitive)
async function checkExistingPR(name: string, githubToken: string): Promise<boolean> {
  const repoOwner = 'flarialmc';
  const repoName = 'scripting-marketplace';
  const githubApiBase = 'https://api.github.com';
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
  };

  const normalizedName = generateIdFromName(name);
  const prsResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/pulls?state=all`, { headers });
  if (!prsResponse.ok) {
    console.error(`Failed to fetch PRs: ${await prsResponse.text()}`);
    return false;
  }
  const prs: GitHubPR[] = await prsResponse.json();
  return prs.some(pr => generateIdFromName(pr.title.replace('Add config: ', '')) === normalizedName);
}

// Helper to send Discord webhook notification (no icon)
async function sendWebhookNotification(ip: string, configName: string, username: string) {
  const webhookUrl = process.env.WEBHOOK;
  if (!webhookUrl) {
    console.error('Webhook URL not configured in .env');
    return;
  }

  const embed: DiscordEmbed = {
    title: 'New Config Uploaded',
    fields: [
      { name: 'Config Name', value: configName, inline: true },
      { name: 'Username', value: username, inline: true },
      { name: 'IP', value: ip, inline: true },
    ],
    color: 0x00ff00, // Green
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!response.ok) {
      throw new Error(`Webhook failed: ${await response.text()}`);
    }
    console.log('Webhook notification sent successfully');
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userIdentifier = getUserIdentifier(request);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    const formData = await request.formData();
    const discordId = getDiscordId(formData);
    console.log(`User identifier: ${userIdentifier}, IP: ${ip}, Discord ID: ${discordId || 'none'}`);

    const files = formData.getAll('files') as File[];
    const configData = JSON.parse(formData.get('configData') as string);
    const name = configData.name?.trim();
    if (!name) throw new Error('Config name is required');
    const generatedId = generateIdFromName(name);

    if (containsBadWords(name)) {
      console.log(`Blocked upload: Name "${name}" contains prohibited words`);
      return NextResponse.json({ error: 'Config name contains prohibited words' }, { status: 400 });
    }

    if (ipConfigTracker.has(ip)) {
      console.log(`Blocked upload: IP ${ip} already has config "${ipConfigTracker.get(ip)}"`);
      return NextResponse.json({ error: 'Only one config upload allowed per IP' }, { status: 403 });
    }

    if (discordId && discordConfigTracker.has(discordId)) {
      console.log(`Blocked upload: Discord user ${discordId} already has config "${discordConfigTracker.get(discordId)}"`);
      return NextResponse.json({ error: 'Only one config upload allowed per Discord user' }, { status: 403 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) throw new Error('GitHub token not configured');
    const prExists = await checkExistingPR(name, githubToken);
    if (prExists) {
      console.log(`Blocked upload: PR with name "${name}" (ID: ${generatedId}) already exists`);
      return NextResponse.json({ error: 'A pull request with this config name already exists' }, { status: 409 });
    }

    const lastUploadTime = userUploadTracker.get(userIdentifier);
    const currentTime = Date.now();
    if (lastUploadTime && (currentTime - lastUploadTime) < UPLOAD_COOLDOWN) {
      const remainingTime = Math.ceil((UPLOAD_COOLDOWN - (currentTime - lastUploadTime)) / (60 * 1000));
      return NextResponse.json(
        { error: `Upload limit reached. Please wait ${remainingTime} minutes before uploading again.` },
        { status: 403 }
      );
    }

    const folderName = generatedId;
    if (processingRequests.has(folderName)) {
      return NextResponse.json({ error: 'Upload already in progress' }, { status: 429 });
    }
    processingRequests.add(folderName);

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

    const refResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`, { headers });
    if (!refResponse.ok) throw new Error(`Failed to get base branch ref: ${await refResponse.text()}`);
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    const createBranchResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
    });
    if (!createBranchResponse.ok) throw new Error(`Failed to create branch: ${await createBranchResponse.text()}`);

    // Always generate main.json from form data
    const mainJsonContent = JSON.stringify({
      id: generatedId,
      name: configData.name,
      version: configData.version,
      author: configData.author,
      createdAt: new Date().toISOString(),
    }, null, 2);
    const updatedFiles = [
      new File([mainJsonContent], 'main.json', { type: 'application/json' }),
      ...files.filter(f => f.name !== 'main.json'), // Override existing main.json if present
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
        title: `Add config: ${folderName}`,
        head: newBranch,
        base: baseBranch,
        body: `This PR adds the ${folderName} configuration to backend/configs/. Please review and merge.`,
      }),
    });
    if (!prResponse.ok) throw new Error(`Failed to create PR: ${await prResponse.text()}`);

    // Send Discord webhook notification (no icon)
    await sendWebhookNotification(ip, name, configData.author || 'Unknown');

    ipConfigTracker.set(ip, folderName);
    if (discordId) discordConfigTracker.set(discordId, folderName);
    userUploadTracker.set(userIdentifier, currentTime);

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
  }
}