'use client';

import Image from 'next/image';
import { Script } from '@/types/script';
import { getScriptDownloadResponse } from '@/services/scripts';

interface ScriptCardProps {
  script: Script;
}

export function ScriptCard({ script }: ScriptCardProps) {
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
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors"
          >
            <Image
              src="/file.svg"
              alt="Download"
              width={16}
              height={16}
              className="dark:invert"
            />
            Download
          </button>
          <span className="text-xs text-gray-500">
            Updated {new Date(script.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}