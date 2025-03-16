'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';
import { Script } from '@/types/script';
import { getScriptDownloadResponse } from '@/services/scripts';
import Image from 'next/image';

interface ScriptCardProps {
  script: Script;
}

export function ScriptCard({ script }: ScriptCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false); // Track hover state for image preview
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await getScriptDownloadResponse(script.id);
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+\.zip)"?/) || [];
      const filename = filenameMatch[1] || `${script.name}.zip`;
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error downloading script:', error);
    }
  };

  return (
    <div className="group relative p-6 rounded-lg bg-[#201a1b]/80 backdrop-blur-md transition-all duration-300 ease-in-out scale-100 hover:scale-[1.05] hover:z-10 hover:shadow-red-950 shadow-md">
      <div className="flex flex-col gap-4">
        
        {/* Image Preview Section */}
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Thumbnail Image */}
          <Image
            src={`https://1klcjc8um5aq.flarial.xyz/api/configs/${script.id}/icon.png`}
            alt="Config Image"
            width={200}
            height={120}
            className="w-full aspect-video object-cover rounded-md cursor-pointer"
          />

          {/* Hover Full Image Preview */}
          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                <div className="relative bg-[#201a1b] p-4 rounded-xl shadow-lg">
                  <Image
                    src={`https://1klcjc8um5aq.flarial.xyz/api/configs/${script.id}/icon.png`}
                    alt="Full Config Image"
                    width={600}
                    height={400}
                    className="w-[600px] h-auto rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1 text-gray-300">{script.name}</h2>
            <p className="text-sm text-gray-400">by {script.author}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-black/10 text-gray-300">
            v{script.version}
          </span>
        </div>

        <p className="text-sm text-gray-300">{script.description}</p>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="relative inline-flex rounded">
            <button
              onClick={() => window.location.href = `minecraft://flarial-scripting?scriptId=${script.id}`}
              className="flex items-center gap-2 bg-[#3a2f30] text-white px-4 py-2 text-sm hover:bg-[#4C3F40] transition-all duration-200 rounded-l font-medium"
              aria-label="Import script to Minecraft"
              title="Import directly into Minecraft"
            >
              <FontAwesomeIcon icon={faFile} className="text-white" />
              Import
            </button>

            <div className="w-px h-full bg-green-300/50" />
            <button
              ref={buttonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center px-3 py-2 bg-[#3a2f30] text-white hover:bg-[#4C3F40] transition-all duration-200 rounded-r font-medium "
              aria-label="Show download options"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              title="Show download options"
              onKeyDown={handleKeyDown}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-gray">
                <path fill="currentColor" d="M4.5 6l3.5 3.5L11.5 6H4.5z" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute right-0 mt-1 top-full z-50 w-48 rounded-md bg-[#1a1a1a] shadow-xl border border-black/20 overflow-hidden"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="download-button"
              >
                <button
                  onClick={handleDownload}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-black/10 transition-colors"
                  role="menuitem"
                >
                  Download ZIP
                </button>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400">
            Updated {new Date(script.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
