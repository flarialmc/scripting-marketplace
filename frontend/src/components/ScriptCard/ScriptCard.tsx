'use client';

import Image from 'next/image';
import { Script } from '@/types/script';
import { getScriptDownloadResponse } from '@/services/scripts';
import { useEffect, useRef, useState } from 'react';

interface ScriptCardProps {
  script: Script;
}

export function ScriptCard({ script }: ScriptCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
      
      // Get filename from Content-Disposition header or fallback
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename=(.+\.tar\.gz)/) || [];
      const filename = filenameMatch[1] || `${script.name}.tar.gz`;
      
      // Create blob from response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      
      // Trigger download and cleanup
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error downloading script:', error);
      // TODO: Add user-facing error notification
    }
  };

  return (
    <div className="p-6 rounded-lg border border-black/[.08] dark:border-white/[.145] hover:border-transparent transition-all bg-white dark:bg-[#1a1a1a] hover:shadow-lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">{script.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">by {script.author}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-black/[.05] dark:bg-white/[.06]">
            v{script.version}
          </span>
        </div>
        
        <p className="text-sm text-gray-700 dark:text-gray-300">{script.description}</p>
        
        <div className="flex items-center justify-between mt-2">
          <div className="relative inline-flex rounded">
            <button
              onClick={() => window.location.href = `minecraft://scripting?scriptId=${script.id}`}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 text-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-all duration-200 rounded-l font-medium"
              aria-label="Import script to Minecraft"
              title="Import directly into Minecraft"
            >
              <Image
                src="/file.svg"
                alt=""
                width={16}
                height={16}
                className="dark:invert"
              />
              Import
            </button>
            <div className="w-px h-full bg-red-300/50 dark:bg-red-200/20" />
            <button
              ref={buttonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center px-3 py-2 bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-all duration-200 rounded-r font-medium"
              aria-label="Show download options"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              title="Show download options"
              onKeyDown={handleKeyDown}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
                className="dark:invert"
              >
                <path 
                  fill="currentColor" 
                  d="M4.5 6l3.5 3.5L11.5 6H4.5z"
                />
              </svg>
            </button>
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute right-0 mt-1 top-full z-50 w-48 rounded-md bg-white dark:bg-[#1a1a1a] shadow-xl border border-black/[.08] dark:border-white/[.145] overflow-hidden"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="download-button"
              >
                <button
                  onClick={handleDownload}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/[.05] dark:hover:bg-white/[.06] transition-colors"
                  role="menuitem"
                >
                  Download ZIP
                </button>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">
            Updated {new Date(script.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}