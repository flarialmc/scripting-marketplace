'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Config } from '@/types/config';
import { getConfigDownloadResponse } from '@/services/configs';

interface ConfigCardProps {
  config: Config;
}

export function ConfigCard({ config }: ConfigCardProps) {
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
    <div className="group relative p-4 rounded-lg bg-[#201a1b]/80 backdrop-blur-md transition-all hover:scale-[1.05] hover:z-10 shadow-md">
      {/* Config Image */}
      <div className="relative w-full h-40 bg-gray-800 flex items-center justify-center rounded-lg overflow-hidden">
        <img
          src={config.imageUrl}
          alt="Config Image"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
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
