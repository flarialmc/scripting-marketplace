'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';

interface ConfigFormData {
  id: string;
  name: string;
  version: string;
  author: string;
}

interface ConfigCardProps {
  config: {
    id: string;
    name: string;
    author: string;
    createdAt: string;
  };
  iconPreview: string | null;
}

const ConfigCard = ({ config, iconPreview }: ConfigCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="group relative p-4 rounded-lg bg-[#201a1b]/80 transition-all hover:scale-[1.05] hover:z-10 shadow-md">
      {/* Config Image with Hover Preview */}
      <div 
        className="relative w-full h-40 bg-gray-800 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {iconPreview ? (
          <Image
            src={iconPreview}
            alt="Config Image Preview"
            unoptimized={true}
            className="w-full h-full object-cover"
            width={160}
            height={160}
          />
        ) : (
          <div className="text-gray-500">No Icon in Folder</div>
        )}

        {/* Hover Full Image Preview */}
        {isHovered && iconPreview && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
              <div className="relative bg-[#201a1b] p-4 rounded-xl shadow-lg">
                <Image
                  src={iconPreview}
                  alt="Full Config Image Preview"
                  width={600}
                  height={337}
                  unoptimized={true}
                  className="w-[600px] h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Config Info */}
      <div className="flex justify-between mt-3">
        <div className="p-2 bg-black/20 rounded-md text-gray-300 text-sm">
          <p>Author: {config.author || 'Unknown'}</p>
          <p>Name: {config.name || 'Unnamed Config'}</p>
          <p>Uploaded: {config.createdAt}</p>
        </div>
      </div>
    </div>
  );
};

export default function ConfigUploadPage() {
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
  const [iconPreview, setIconPreview] = useState<string | null>(null);

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
      return !allowedExtensions.includes(extension) || 
             (extension === '.json' && file.name !== 'main.json') ||
             (extension === '.png' && file.name !== 'icon.png');
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
    if (iconFile && iconFile.size > 0) { // Ensure it's not the default empty file
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
    setIsUploading(true);
    const formDataToSend = new FormData();
    files.forEach(file => formDataToSend.append('files', file));
    formDataToSend.append('configData', JSON.stringify(formData));

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
    setFormData({ id: '', name: '', version: '', author: '' });
    setShowForm(false);
    setIconPreview(null);
    setError(null);
  };

  // Config object for preview, updating in real-time
  const previewConfig = {
    id: formData.id,
    name: formData.name,
    author: formData.author,
    createdAt: new Date().toLocaleDateString(), // Use current date for preview
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#121212]">
      <div className="max-w-4xl w-full p-6 bg-[#201a1b] rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-semibold text-white mb-4">Upload Config Folder</h1>
        
        <input
          type="file"
          // @ts-expect-error webkitdirectory is not in standard TS types
          webkitdirectory="true"
          directory=""
          multiple
          onChange={handleFolderUpload}
          className="mb-4 w-full text-white bg-[#3a2f30] p-2 rounded-md cursor-pointer hover:bg-[#4C3F40]"
        />

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Form Section */}
          <div className="flex-1">
            {showForm && (
              <div className="mb-4 p-4 bg-black/20 rounded-md">
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
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isUploading || files.length === 0 || (showForm && !formData.id)}
              className="bg-[#d32f2f] text-white px-6 py-2 rounded-md hover:bg-[#b71c1c] disabled:opacity-50 transition-all"
            >
              {isUploading ? 'Uploading...' : 'Submit Config'}
            </button>
          </div>

          {/* Preview Section */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Preview</h2>
            <ConfigCard config={previewConfig} iconPreview={iconPreview} />
          </div>
        </div>
      </div>
    </div>
  );
}
