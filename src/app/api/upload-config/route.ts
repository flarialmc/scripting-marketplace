
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';


const userUploadTracker = new Map<string, number>();
const ipConfigTracker = new Map<string, string>();
const githubConfigTracker = new Map<string, string>();
const processingRequests = new Set<string>();


const UPLOAD_COOLDOWN = 24 * 60 * 60 * 1000;


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
  "raand", "randi", "chuda", "madarchod", "anshul", "chutiya", "ammi", "bari", "ashank", "mbg", "test"
].map(word => word.toLowerCase());


interface DiscordEmbed {
  title: string;
  fields: { name: string; value: string; inline: boolean }[];
  color: number;
  timestamp: string;
}


interface GitHubPR {
  title: string;
}


function getUserIdentifier(request: NextRequest, githubId: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
  const cookies = request.cookies;
  const cookieId = cookies.get('user_id')?.value || `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  return `${ip}-${githubId}-${cookieId}`;
}


function generateIdFromName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}


function containsBadWords(name: string): boolean {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BAD_WORDS.some(badWord => normalizedName.includes(badWord));
}


async function checkExistingPR(name: string, githubToken: string): Promise<boolean> {
  const repoOwner = 'flarialmc';
  const repoName = 'configs';
  const githubApiBase = 'https://api.github.com';
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
  };

  const normalizedName = generateIdFromName(name);
  const prsResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/pulls?state=all`, { headers });
  if (!prsResponse.ok) {
    return false;
  }
  const prs: GitHubPR[] = await prsResponse.json();
  return prs.some(pr => generateIdFromName(pr.title.replace('Add config: ', '')) === normalizedName);
}


async function sendWebhookNotification(ip: string, configName: string, username: string) {
  const webhookUrl = process.env.WEBHOOK;
  if (!webhookUrl) {
    return;
  }

  const embed: DiscordEmbed = {
    title: 'New Config Uploaded',
    fields: [
      { name: 'Config Name', value: configName, inline: true },
      { name: 'Username', value: username, inline: true },
      { name: 'IP', value: ip, inline: true },
    ],
    color: 0x00ff00,
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
  } catch {
  }
}

function createProgressStream() {
  return {
    sendProgress: (step: string, percentage: number, details?: string) => {
      const data = { type: 'progress', step, percentage, details };
      return `data: ${JSON.stringify(data)}\n\n`;
    },
    sendComplete: (data: Record<string, unknown>) => {
      return `data: ${JSON.stringify({ type: 'complete', ...data })}\n\n`;
    },
    sendError: (error: string) => {
      return `data: ${JSON.stringify({ type: 'error', error })}\n\n`;
    }
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const progress = createProgressStream();
  
  const stream = new ReadableStream({
    start(controller) {
      handleUpload(request, controller, progress, encoder).catch(error => {
        controller.enqueue(encoder.encode(progress.sendError(error instanceof Error ? error.message : String(error))));
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function handleUpload(
  request: NextRequest, 
  controller: ReadableStreamDefaultController<Uint8Array>,
  progress: ReturnType<typeof createProgressStream>,
  encoder: TextEncoder
) {
  try {
    controller.enqueue(encoder.encode(progress.sendProgress('Authenticating...', 5)));
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id || !session.accessToken) {
        throw new Error('Unauthorized: Please sign in with GitHub');
    }

    controller.enqueue(encoder.encode(progress.sendProgress('Processing request...', 10)));
    const githubId = session.user.id;
    const username = session.user.name || 'Unknown';
    const githubLogin = session.user.login || username;
    const userIdentifier = getUserIdentifier(request, githubId);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const configData = JSON.parse(formData.get('configData') as string);
    const name = configData.name?.trim();
    if (!name) throw new Error('Config name is required');
    const generatedId = generateIdFromName(name);

    controller.enqueue(encoder.encode(progress.sendProgress('Validating config...', 15)));
    if (containsBadWords(name)) {
      throw new Error('Config name contains prohibited words');
    }

    controller.enqueue(encoder.encode(progress.sendProgress('Checking for existing configs...', 20)));
    const userGithubToken = session.accessToken;
    const prExists = await checkExistingPR(name, userGithubToken);
    if (prExists) {
      throw new Error('A pull request with this config name already exists');
    }

    controller.enqueue(encoder.encode(progress.sendProgress('Checking upload limits...', 25)));
    const lastUploadTime = userUploadTracker.get(userIdentifier);
    const currentTime = Date.now();
    if (lastUploadTime && (currentTime - lastUploadTime) < UPLOAD_COOLDOWN) {
      const remainingTime = Math.ceil((UPLOAD_COOLDOWN - (currentTime - lastUploadTime)) / (60 * 1000));
      throw new Error(`Upload limit reached. Please wait ${remainingTime} minutes before uploading again.`);
    }

    const folderName = generatedId;
    if (processingRequests.has(folderName)) {
      throw new Error('Upload already in progress');
    }
    processingRequests.add(folderName);
    
    controller.enqueue(encoder.encode(progress.sendProgress('Initializing GitHub operations...', 30)));

    const repoOwner = 'flarialmc';
    const repoName = 'configs';
    const baseBranch = 'main';
    const newBranch = `config/add-${folderName}-${Date.now()}`;
    const githubApiBase = 'https://api.github.com';
    const headers = {
      Authorization: `Bearer ${userGithubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    controller.enqueue(encoder.encode(progress.sendProgress('Getting repository information...', 35)));
    const refResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`, { headers });
    if (!refResponse.ok) throw new Error(`Failed to get base branch ref: ${await refResponse.text()}`);
    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    controller.enqueue(encoder.encode(progress.sendProgress('Creating new branch...', 40, `Branch: ${newBranch}`)));
    const createBranchResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseSha }),
    });
    if (!createBranchResponse.ok) throw new Error(`Failed to create branch: ${await createBranchResponse.text()}`);

    controller.enqueue(encoder.encode(progress.sendProgress('Preparing configuration files...', 50)));
    const mainJsonContent = JSON.stringify({
      id: generatedId,
      name: configData.name,
      version: configData.version,
      author: username,
      createdAt: new Date().toISOString(),
    }, null, 2);
    const updatedFiles = [
      new File([mainJsonContent], 'main.json', { type: 'application/json' }),
      ...files.filter(f => f.name !== 'main.json'),
    ];

    controller.enqueue(encoder.encode(progress.sendProgress('Uploading files to GitHub...', 60, `Processing ${updatedFiles.length} files`)));
    const treeItems = [];
    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i];
      const fileProgress = 60 + (i / updatedFiles.length) * 20;
      controller.enqueue(encoder.encode(progress.sendProgress('Uploading files to GitHub...', Math.round(fileProgress), `Processing ${file.name}...`)));
      
      const fileContent = Buffer.from(await file.arrayBuffer()).toString('base64');
      const baseFileName = file.name.split('/').pop() || file.name;
      const filePath = `configs/${folderName}/${baseFileName}`;
      const blobResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: fileContent, encoding: 'base64' }),
      });
      if (!blobResponse.ok) throw new Error(`Failed to create blob: ${await blobResponse.text()}`);
      const blobData = await blobResponse.json();
      treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blobData.sha });
    }

    controller.enqueue(encoder.encode(progress.sendProgress('Creating file tree...', 80)));
    const treeResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ base_tree: baseSha, tree: treeItems }),
    });
    if (!treeResponse.ok) throw new Error(`Failed to create tree: ${await treeResponse.text()}`);
    const treeData = await treeResponse.json();

    controller.enqueue(encoder.encode(progress.sendProgress('Creating commit...', 85)));
    const commitResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        message: `Add ${folderName} configuration`, 
        tree: treeData.sha, 
        parents: [baseSha],
        author: {
          name: username,
          email: session.user.email || `${githubLogin}@users.noreply.github.com`,
          date: new Date().toISOString()
        }
      }),
    });
    if (!commitResponse.ok) throw new Error(`Failed to create commit: ${await commitResponse.text()}`);
    const commitData = await commitResponse.json();

    controller.enqueue(encoder.encode(progress.sendProgress('Updating branch...', 90)));
    const updateRefResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/git/refs/heads/${newBranch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha }),
    });
    if (!updateRefResponse.ok) throw new Error(`Failed to update branch ref: ${await updateRefResponse.text()}`);

    controller.enqueue(encoder.encode(progress.sendProgress('Creating pull request...', 95)));
    const prResponse = await fetch(`${githubApiBase}/repos/${repoOwner}/${repoName}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Add config: ${folderName}`,
        head: newBranch,
        base: baseBranch,
        body: `This PR adds the ${folderName} configuration to configs/.\n\nSubmitted by: @${githubLogin}\nConfig Name: ${configData.name}\nVersion: ${configData.version}\nAuthor: ${username}\n\nPlease review and merge.`,
      }),
    });
    if (!prResponse.ok) throw new Error(`Failed to create PR: ${await prResponse.text()}`);

    controller.enqueue(encoder.encode(progress.sendProgress('Finalizing...', 98)));
    await sendWebhookNotification(ip, name, username);

    ipConfigTracker.set(ip, folderName);
    githubConfigTracker.set(githubId, folderName);
    userUploadTracker.set(userIdentifier, currentTime);

    controller.enqueue(encoder.encode(progress.sendComplete({ message: 'Pull request created successfully' })));
    controller.close();
  } catch (error) {
    throw error;
  } finally {
    processingRequests.clear();
  }
}