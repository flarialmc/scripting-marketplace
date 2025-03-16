'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Config } from '@/types/config';
import { getConfigDownloadResponse } from '@/services/configs';

interface ConfigCardProps {
  config: Config;
}

export function ConfigCard({ config }: ConfigCardProps) {
  const [isHovered, setIsHovered] = useState(false); // For image preview

  const handleDownload = async () => {
    try {
      const response = await getConfigDownloadResponse(config.id);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading config:', error);
    }
  };

  return (
    <div className="group relative p-4 rounded-lg bg-[#201a1b]/80 transition-all hover:scale-[1.05] hover:z-10 shadow-md">
      
      {/* Config Image with Hover Preview */}
      <div 
        className="relative w-full h-40 bg-gray-800 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={`https://1klcjc8um5aq.flarial.xyz/api/configs/${config.id}/icon.png`}
          alt="Config Image"
          unoptimized={true} 
          className="w-full h-full object-cover"
        />

        {/* Hover Full Image Preview */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
              <div className="relative bg-[#201a1b] p-4 rounded-xl shadow-lg">
                <Image
                  src={`https://1klcjc8um5aq.flarial.xyz/api/configs/${config.id}/icon.png`}
                  alt="Full Config Image"
                  width={1280}
                  height={720}
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
          <p>Author: {config.author}</p>
          <p>Name: {config.name}</p>
          <p>Uploaded: {new Date(config.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Download & Import Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#3a2f30] text-white px-4 py-2 text-sm hover:bg-[#4C3F40] transition-all duration-200 rounded-md font-medium"
          >
            <FontAwesomeIcon icon={faDownload} className="text-white" />
            Download
          </button>

          {/* Import to Minecraft Button */}
          <button
            onClick={() => window.location.href = `minecraft://flarial-configs?configName=${config.name}`}
            className="flex items-center gap-2 bg-[#3a2f30] text-white px-4 py-2 text-sm hover:bg-[#4C3F40] transition-all duration-200 rounded-md font-medium"
            aria-label="Import config to Minecraft"
            title="Import directly into Minecraft"
          >
            <FontAwesomeIcon icon={faDownload} className="text-white" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
