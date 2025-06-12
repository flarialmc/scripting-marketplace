'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Config } from '@/types/config';
import { getConfigDownloadResponse } from '@/services/configs';

interface ConfigCardProps {
  config: Config;
}

export function ConfigCard({ config }: ConfigCardProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation after the overlay is added to the DOM
    setIsFadingIn(showFullImage);
  }, [showFullImage]);

  useEffect(() => {
    // Show/hide scroll bar
    document.body.style.overflow = showFullImage ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFullImage]);

  const closeOverlay = () => {
    setIsFadingIn(false); // Start fade-out animation
    setTimeout(() => {
      setShowFullImage(false);
    }, 500); // Duration of the CSS transition
  };

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
    <>
      <div className="group relative p-4 rounded-lg bg-[#201a1b]/80 transition-all duration-300 ease-in-out hover:scale-[1.05] hover:z-10 hover:shadow-red-950 shadow-md">
        {/* Config Image with Hover Preview */}
        <div
          className="relative w-full h-40 bg-gray-800 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setShowFullImage(true)}
        >
          <Image
            src={`https://1klcjc8um5aq.flarial.xyz/api/configs/${config.id}/icon.png`}
            width={1280}
            height={720}
            alt="Config Image"
            unoptimized
            className="w-full h-full transition-all duration-300 ease-in-out hover:scale-[1.1] object-cover"
          />
        </div>

        {/* Config Info */}
        <h2 className="text-lg font-semibold mt-3 text-gray-300">{config.name}</h2>
        <div className="flex justify-between mt-3">
          <div className="p-2 bg-black/20 rounded-md text-gray-500 text-sm">
            <p>Author: <span className="text-gray-400">{config.author}</span></p>
            <p>Uploaded: <span className="text-gray-400">{new Date(config.createdAt).toLocaleDateString()}</span></p>
            {config.version && (
              <p>Version: <span className="text-gray-400">{config.version}</span></p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {/* Import to Minecraft Button */}
            <button
              onClick={() => window.location.href = `minecraft://flarial-configs?configName=${config.name}`}
              className="flex items-center gap-2 bg-[#FF2438] text-white px-4 py-2 text-sm hover:bg-[#8b1b25] transition-all duration-200 rounded-md font-medium"
              aria-label="Import config to Minecraft"
              title="Import directly into Minecraft"
            >
              <FontAwesomeIcon icon={faDownload} className="text-white" />
              Import
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#3a2f30] text-white px-4 py-2 text-sm hover:bg-[#4C3F40] transition-all duration-200 rounded-md font-medium"
            >
              <FontAwesomeIcon icon={faDownload} className="text-white" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Full Config Image Overlay */}
      {showFullImage &&
        ReactDOM.createPortal(
          <div
            className={`fixed inset-0 bg-black/90 z-50 transition-opacity duration-500 cursor-pointer ${isFadingIn ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeOverlay}
          >
            <Image
              src={`https://1klcjc8um5aq.flarial.xyz/api/configs/${config.id}/icon.png`}
              alt="Full Config Image"
              layout="fill"
              objectFit="contain"
              className={`relative w-full h-full p-6 select-none transition-all duration-500 overflow-hidden ${isFadingIn ? 'scale-[1]' : 'scale-[0.5]'}`}
              unoptimized
            />
          </div>,
          document.body
        )}
    </>
  );
}
