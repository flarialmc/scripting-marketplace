'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { signIn, signOut, useSession, SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';

// Extend HTMLInputElement to include webkitdirectory
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string | boolean;
  }
}

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface ConfigFormData {
  id: string;
  name: string;
  version: string;
  author: string;
}

function ConfigUploadInner() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    id: '',
    name: '',
    version: '',
    author: '',
  });
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setFormData(prev => ({
        ...prev,
        author: session.user.name ?? '',
      }));
    }
  }, [session]);

  const handleFolderUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    setFiles(uploadedFiles);
    validateFolder(uploadedFiles);
  };

  const validateFolder = (uploadedFiles: File[]) => {
    const allowedExtensions = ['.json', '.png', '.flarial'];
    const fileNames = uploadedFiles.map(file => file.webkitRelativePath.split('/').pop() || '');

    const hasDisallowedFiles = uploadedFiles.some(file => {
      const extension = file.name.slice(file.name.lastIndexOf('.'));
      return (
        !allowedExtensions.includes(extension) ||
        (extension === '.json' && file.name !== 'main.json') ||
        (extension === '.png' && file.name !== 'icon.png')
      );
    });

    if (hasDisallowedFiles) {
      setError('Folder can only contain main.json, icon.png, and .flarial files.');
      setFiles([]);
      setIconPreview(null);
      setShowForm(false);
      return;
    }

    const hasMainJson = fileNames.includes('main.json');
    const hasIcon = fileNames.includes('icon.png');

    if (!hasIcon) {
      const defaultIcon = new File([], 'icon.png', { type: 'image/png' });
      setFiles(prevFiles => [...prevFiles, defaultIcon]);
    }

    if (!hasMainJson) {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    setError(null);
  };

  useEffect(() => {
    const iconFile = files.find(file => file.name === 'icon.png');
    if (iconFile && iconFile.size > 0) {
      const reader = new FileReader();
      reader.onload = (e) => setIconPreview(e.target?.result as string);
      reader.readAsDataURL(iconFile);
    } else {
      setIconPreview(null);
    }
  }, [files]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!session) {
      setError('Please sign in with Discord to submit a config');
      return;
    }

    setIsUploading(true);
    const formDataToSend = new FormData();
    files.forEach(file => formDataToSend.append('files', file));
    formDataToSend.append('configData', JSON.stringify(formData));
    formDataToSend.append('discordId', session.user.id);

    try {
      const response = await fetch('/api/upload-config', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${await response.text()}`);
      }

      setError(`Pull request created successfully for ${formData.name || 'Unnamed Config'}!`);
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      setError(`Error creating pull request: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setFormData({ id: '', name: '', version: '', author: session?.user?.name || '' });
    setShowForm(false);
    setIconPreview(null);
    setError(null);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <Image
            src="/images/flarial-logo.png"
            alt="Loading"
            width={64}
            height={64}
            className="animate-spin"
            unoptimized={true}
          />
          <p className="text-white mt-4 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center min-h-screen ${spaceGrotesk.className}`}
      style={{
        backgroundImage: "url('/images/background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/80 z-0" />
      <div className="flex flex-col items-center justify-center w-full relative z-10">
        <div className="max-w-5xl w-full p-6 rounded-lg shadow-md text-center bg-[#201a1b]/90">
          {session && (
            <div className="mb-6 flex items-center justify-center gap-4">
              <Image
                src="/images/flarial-logo.png"
                alt="Flarial Scripts Logo"
                width={64}
                height={64}
                unoptimized={true}
              />
              <h1 className="text-5xl font-bold text-white">Flarial Marketplace</h1>
            </div>
          )}

          {session ? (
            <h2 className="text-xl font-semibold text-white mb-6">Submit Config</h2>
          ) : (
            <h2 className="text-xl font-semibold text-white mb-6">Sign-in to Submit Config</h2>
          )}

          <div className="mb-6">
            {session ? (
              <div className="flex items-center justify-center gap-4">
                <p className="text-white">Signed in as {session.user.name}</p>
                <button
                  onClick={() => signOut()}
                  className="bg-[#5865F2] text-white px-4 py-2 rounded-md hover:bg-[#4752C4]"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="bg-[#5865F2] text-white px-6 py-2 rounded-md hover:bg-[#4752C4]"
              >
                Sign in with Discord
              </button>
            )}
          </div>

          {session && (
            <div className="mb-4 w-full">
              <label className="w-full text-white bg-[#2f2f2f] p-2 rounded-md cursor-pointer hover:bg-[#3f3f3f] transition-colors flex items-center justify-center">
                Choose Files
                <input
                  type="file"
                  webkitdirectory="true" // Now recognized by TypeScript
                  multiple
                  onChange={handleFolderUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {error && <p className="text-red-400 mb-4">{error}</p>}

          {showForm && (
            <div className="mb-4 p-4 bg-black/20 rounded-md w-full">
              <h2 className="text-white mb-2">Create main.json</h2>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                placeholder="Config ID"
                className="w-full mb-2 p-2 bg-[#3a2f30] text-white rounded-md"
              />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Config Name"
                className="w-full mb-2 p-2 bg-[#3a2f30] text-white rounded-md"
              />
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleInputChange}
                placeholder="Version"
                className="w-full mb-2 p-2 bg-[#3a2f30] text-white rounded-md"
              />
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Author"
                className="w-full mb-2 p-2 bg-[#3a2f30] text-white rounded-md"
                disabled={!!session}
              />
            </div>
          )}

          {session && (
            <button
              onClick={handleSubmit}
              disabled={isUploading || files.length === 0 || (showForm && !formData.id)}
              className="bg-[#d32f2f] text-white px-6 py-2 rounded-md hover:bg-[#b71c1c] disabled:opacity-50 transition-all mb-6 w-full max-w-xs mx-auto"
            >
              {isUploading ? 'Uploading...' : 'Submit Config'}
            </button>
          )}
        </div>

        {session && (
          <div className="mt-8 w-full flex justify-center">
            <Link href="/">
              <button className="bg-[#2f2f2f] text-white px-6 py-2 rounded-md hover:bg-[#3f3f3f] transition-colors">
                Back
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfigUploadPage() {
  return (
    <SessionProvider>
      <ConfigUploadInner />
    </SessionProvider>
  );
}