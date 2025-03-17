'use client';
import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { ConfigGrid } from '@/components/ConfigGrid/ConfigGrid';
import { listScripts } from '@/services/scripts';
import { listConfigs } from '@/services/configs';
import { Script } from '@/types/script';
import { Config } from '@/types/config';
import Image from 'next/image';
import { Space_Grotesk } from 'next/font/google';
import { FaSearch, FaChevronDown } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';

export const dynamic = 'force-dynamic';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'] });
const flarialLogo = "/images/flarial-logo.png";
const FLARIAL_DISCORD_ID = "YOUR_DISCORD_SERVER_ID"; // Replace with your Flarial Discord server ID

interface ConfigFormData {
  id: string;
  name: string;
  version: string;
  author: string;
}

export default function Home() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("Scripts");
  const [canUpload, setCanUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ConfigFormData>({
    id: '',
    name: '',
    version: '',
    author: '',
  });
  const searchRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    async function fetchData() {
      try {
        if (selectedOption === "Scripts") {
          const data = await listScripts();
          setScripts(data);
        } else {
          const data = await listConfigs();
          setConfigs(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      }
    }
    fetchData();
  }, [selectedOption]);

  useEffect(() => {
    async function checkDiscordMembership() {
      if (status === "authenticated" && session?.accessToken) {
        try {
          const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          });
          if (!response.ok) throw new Error('Failed to fetch guilds');
          const guilds = await response.json();
          const isMember = guilds.some((guild: any) => guild.id === FLARIAL_DISCORD_ID);
          setCanUpload(isMember);
          localStorage.setItem(`discord_member_${session.user?.id}`, JSON.stringify(isMember));
        } catch (err) {
          setCanUpload(false);
          console.error('Error checking Discord membership:', err);
        }
      } else {
        setCanUpload(false);
      }
    }
    checkDiscordMembership();
  }, [session, status]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && event.target instanceof Node && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredScripts = scripts.filter(script =>
    script.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConfigs = configs.filter(config =>
    config.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFolderUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    setSelectedFiles(uploadedFiles);
    validateFolder(uploadedFiles);
  };

  const validateFolder = (uploadedFiles: File[]) => {
    const allowedExtensions = ['.json', '.png', '.flarial'];
    const fileNames = uploadedFiles.map(file => file.webkitRelativePath.split('/').pop() || file.name);

    const hasDisallowedFiles = uploadedFiles.some(file => {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      return !allowedExtensions.includes(extension) || 
             (extension === '.json' && file.name.toLowerCase() !== 'main.json') ||
             (extension === '.png' && file.name.toLowerCase() !== 'icon.png');
    });

    if (hasDisallowedFiles) {
      setError('Folder can only contain main.json, icon.png, and .flarial files.');
      setSelectedFiles([]);
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const hasMainJson = fileNames.some(name => name.toLowerCase() === 'main.json');
    const hasIcon = fileNames.some(name => name.toLowerCase() === 'icon.png');
    const hasFlarial = fileNames.some(name => name.toLowerCase().endsWith('.flarial'));

    if (!hasFlarial || !hasIcon) {
      setError('Folder must contain at least one .flarial file and icon.png.');
      setSelectedFiles([]);
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!hasMainJson) {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    setError(null);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUploadClick = async () => {
    if (status === "unauthenticated") {
      signIn("discord");
      return;
    }
    if (!canUpload) {
      setError("You must be a member of the Flarial Discord server to upload.");
      return;
    }
    if (selectedFiles.length === 0) {
      setError("Please select a folder containing .flarial files, main.json, and icon.png.");
      return;
    }
    if (showForm && (!formData.id || !formData.name)) {
      setError("Please fill in the required fields (ID and Name) for main.json.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formDataToSend = new FormData();
      let finalFiles = selectedFiles;

      if (showForm) {
        const mainJson = new File(
          [JSON.stringify({ ...formData, createdAt: new Date().toISOString() }, null, 2)],
          'main.json',
          { type: 'application/json' }
        );
        finalFiles = [...selectedFiles, mainJson];
      }

      finalFiles.forEach(file => formDataToSend.append('files', file));
      formDataToSend.append('configData', JSON.stringify({
        id: formData.id || `${selectedOption.toLowerCase()}-${Date.now()}`,
        name: formData.name || `New ${selectedOption}`,
        version: formData.version || "1.0.0",
        author: formData.author || session?.user?.name || "Unknown",
      }));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      alert(data.message);
      setSelectedFiles([]);
      setShowForm(false);
      setFormData({ id: '', name: '', version: '', author: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${spaceGrotesk.className}`}
      style={{ backgroundImage: "url('/images/background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/80 before:absolute before:inset-0 before:backdrop-blur-lg"></div>
      <main className="relative max-w-7xl mx-auto p-6 md:p-12">
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center space-x-3">
            <Image src={flarialLogo} alt="Flarial Logo" width={47} height={52} className="rounded" />
            <h1 className="text-5xl font-extrabold tracking-tight text-white leading-none">Flarial {selectedOption}</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
            Browse and download community-created {selectedOption.toLowerCase()} for Flarial
          </p>

          {/* Dropdown & Upload Controls */}
          <div className="relative mt-2 flex items-center space-x-4" ref={dropdownRef}>
            {/* Dropdown Menu */}
            <div className="relative">
              <button
                className="flex items-center px-4 py-2 bg-[#2d2526] text-white rounded-md shadow-md hover:bg-[#3a3032] border border-white/20"
                onClick={() => setIsDropdownOpen(prev => !prev)}
              >
                {selectedOption} <FaChevronDown className="ml-2" />
              </button>
              {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-[#201a1b] rounded-md shadow-lg z-10">
                  <ul>
                    <li
                      className="px-4 py-2 hover:bg-[#2a2223] text-white cursor-pointer"
                      onClick={() => { setSelectedOption("Scripts"); setIsDropdownOpen(false); }}
                    >
                      Scripts
                    </li>
                    <li
                      className="px-4 py-2 hover:bg-[#2a2223] text-white cursor-pointer"
                      onClick={() => { setSelectedOption("Configs"); setIsDropdownOpen(false); }}
                    >
                      Configs
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Auth and Upload Controls */}
            <div className="flex items-center space-x-4">
              {status === "authenticated" ? (
                <>
                  <span className="text-white">Welcome, {session.user?.name}</span>
                  <input
                    type="file"
                    // @ts-expect-error webkitdirectory is not in standard TS types
                    webkitdirectory="true"
                    directory=""
                    multiple
                    ref={fileInputRef}
                    onChange={handleFolderUpload}
                    className="text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:bg-[#2d2526] file:text-white file:border-0 file:hover:bg-[#3a3032]"
                    disabled={!canUpload || isUploading}
                  />
                  {showForm && (
                    <div className="flex flex-col space-y-2">
                      <input
                        type="text"
                        name="id"
                        value={formData.id}
                        onChange={handleInputChange}
                        placeholder="Config ID"
                        className="p-2 bg-[#3a2f30] text-white rounded-md"
                      />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Config Name"
                        className="p-2 bg-[#3a2f30] text-white rounded-md"
                      />
                      <input
                        type="text"
                        name="version"
                        value={formData.version}
                        onChange={handleInputChange}
                        placeholder="Version"
                        className="p-2 bg-[#3a2f30] text-white rounded-md"
                      />
                      <input
                        type="text"
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        placeholder="Author"
                        className="p-2 bg-[#3a2f30] text-white rounded-md"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleUploadClick}
                    className={`px-4 py-2 rounded-md text-white ${
                      canUpload && !isUploading ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'
                    }`}
                    disabled={!canUpload || isUploading}
                  >
                    {isUploading ? "Uploading..." : `Upload ${selectedOption}`}
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signIn("discord")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Sign in with Discord
                </button>
              )}
            </div>

            <div className="absolute top-[72px] right-6 flex items-center" ref={searchRef}>
              <motion.div
                initial={{ width: 40, height: 40 }}
                animate={{ width: isSearchOpen ? 250 : 40, height: 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="relative flex items-center bg-[#201a1b]/80 rounded-lg shadow-lg px-2"
              >
                <motion.input
                  type="text"
                  placeholder={`Search for ${selectedOption.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent text-white focus:outline-none transition-all ${
                    isSearchOpen ? "opacity-100 w-full pl-8" : "opacity-0 w-0"
                  }`}
                />
                <button
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center"
                >
                  <FaSearch size={18} className="text-white" />
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-200 dark:bg-red-900 border border-red-400 dark:border-red-700 mb-6">
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {selectedOption === "Scripts" ? (
          filteredScripts.length > 0 ? (
            <ScriptGrid scripts={filteredScripts} />
          ) : (
            <div className="text-center py-12 mt-12">
              <p className="text-gray-600 dark:text-gray-400">No matching scripts found.</p>
            </div>
          )
        ) : (
          filteredConfigs.length > 0 ? (
            <ConfigGrid configs={filteredConfigs} />
          ) : (
            <div className="text-center py-12 mt-12">
              <p className="text-gray-600 dark:text-gray-400">No matching configs found.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
