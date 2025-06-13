'use client';

import { useState, ChangeEvent, useEffect, useRef } from 'react';
import Image from 'next/image';
import { signIn, signOut, useSession, SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { useRouter } from 'next/navigation';


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
  name: string;
  version: string;
  author: string;
}

function ConfigUploadInner() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    name: '',
    version: '',
    author: '',
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<boolean>(false);
  const [croppedImage, setCroppedImage] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

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
    const hasDisallowedFiles = uploadedFiles.some(file => {
      const extension = file.name.slice(file.name.lastIndexOf('.'));
      return !allowedExtensions.includes(extension);
    });

    if (hasDisallowedFiles) {
      setError('Folder can only contain .json, .png, and .flarial files.');
      setFiles([]);
      setIconPreview(null);
      return;
    }

    const iconFile = uploadedFiles.find(f => f.name === 'icon.png');
    if (!iconFile || iconFile.size === 0) {
      setShowIconPicker(true);
    } else {
      setShowIconPicker(false);
      setIconPreview(URL.createObjectURL(iconFile));
    }
    setError(null);
  };

  const handleIconSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIconPreview(event.target?.result as string);
        setShowIconPicker(false);
      };
      reader.readAsDataURL(file);
      setCroppedImage(file);
    } else {
      setError('Please select a valid image file.');
    }
  };

  const cropImage = () => {
    if (!iconPreview || !canvasRef.current || !croppedImage) return;

    const img = new window.Image();
    img.src = iconPreview;
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = 64;
      canvas.height = 64;
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      ctx.drawImage(img, x, y, size, size, 0, 0, 64, 64);
      canvas.toBlob(blob => {
        if (blob) {
          const croppedFile = new File([blob], 'icon.png', { type: 'image/png' });
          setCroppedImage(croppedFile);
          setIconPreview(URL.createObjectURL(croppedFile));
        }
      }, 'image/png');
    };
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!session) {
      setError('Please sign in with GitHub to submit a config');
      return;
    }
    if (!formData.name) {
      setError('Config name is required');
      return;
    }

    setIsUploading(true);
    const formDataToSend = new FormData();
    const updatedFiles = croppedImage
      ? [...files.filter(f => f.name !== 'icon.png'), croppedImage]
      : files;
    updatedFiles.forEach(file => formDataToSend.append('files', file));
    formDataToSend.append('configData', JSON.stringify(formData));
    formDataToSend.append('githubId', session.user.id);
    formDataToSend.append('githubLogin', session.user.login || session.user.name || '');

    try {
      const response = await fetch('/api/upload-config', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `API request failed with status ${response.status}`);
      }

      const successMsg = `Pull request created successfully for ${formData.name}!`;
      setSuccessMessage(successMsg);
      setShowSuccessPopup(true);
      resetForm();
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setFormData({ name: '', version: '', author: session?.user?.name || '' });
    setIconPreview(null);
    setCroppedImage(null);
    setShowIconPicker(false);
    setError(null);
  };

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <Image src="/images/flarial-logo.png" alt="Loading" width={64} height={64} className="animate-spin" unoptimized />
          <p className="text-white mt-4 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center min-h-screen ${spaceGrotesk.className}`}
      style={{ backgroundImage: "url('/images/background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/80 z-0" />
      <div className="flex flex-col items-center justify-center w-full relative z-10">
        <div className="max-w-5xl w-full p-6 rounded-lg shadow-md text-center bg-[#201a1b]/90">
          {session && (
            <div className="mb-6 flex items-center justify-center gap-4">
              <Image src="/images/flarial-logo.png" alt="Flarial Scripts Logo" width={64} height={64} unoptimized />
              <h1 className="text-5xl font-bold text-white">Flarial Marketplace</h1>
            </div>
          )}

          {session ? (
            <h2 className="text-xl font-semibold text-white mb-6">Submit Config</h2>
          ) : (
            <h2 className="text-xl font-semibold text-white mb-6">Sign-in with GitHub to Submit Config</h2>
          )}

          <div className="mb-6">
            {session ? (
              <div className="flex items-center justify-center gap-4">
                <p className="text-white">Signed in as {session.user.name}</p>
                <button
                  onClick={() => signOut()}
                  className="bg-[#24292e] text-white px-4 py-2 rounded-md hover:bg-[#1b1f23] transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('github')}
                className="bg-[#24292e] text-white px-6 py-2 rounded-md hover:bg-[#1b1f23] transition-colors"
              >
                Sign in with GitHub
              </button>
            )}
          </div>

          {session && (
            <div className="mb-4 w-full">
              <label className="w-full text-white bg-[#2f2f2f] p-2 rounded-md cursor-pointer hover:bg-[#3f3f3f] transition-colors flex items-center justify-center">
                Choose Files
                <input
                  type="file"
                  webkitdirectory="true"
                  multiple
                  onChange={handleFolderUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {session && files.length > 0 && (
            <div className="mb-4 p-4 bg-black/20 rounded-md w-full">
              <h2 className="text-white mb-2">Config Details</h2>
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

          {showIconPicker && (
            <div className="mb-4 p-4 bg-black/20 rounded-md w-full">
              <h2 className="text-white mb-2">Select Icon</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleIconSelect}
                className="w-full mb-2 p-2 bg-[#3a2f30] text-white rounded-md"
              />
              {iconPreview && (
                <div>
                  <Image src={iconPreview} alt="Icon Preview" width={64} height={64} className="mb-2" unoptimized />
                  <button
                    onClick={cropImage}
                    className="bg-[#5865F2] text-white px-4 py-2 rounded-md hover:bg-[#4752C4]"
                  >
                    Crop to 64x64
                  </button>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 mb-4">{error}</p>}

          {session && (
            <button
              onClick={handleSubmit}
              disabled={isUploading || files.length === 0 || !formData.name}
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

        {showSuccessPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#201a1b] p-6 rounded-lg shadow-lg text-center max-w-md w-full">
              <h3 className="text-2xl font-bold text-white mb-4">Success!</h3>
              <p className="text-green-400 mb-6">{successMessage}</p>
              <button
                onClick={closeSuccessPopup}
                className="bg-[#d32f2f] text-white px-4 py-2 rounded-md hover:bg-[#b71c1c] transition-colors"
              >
                OK
              </button>
            </div>
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