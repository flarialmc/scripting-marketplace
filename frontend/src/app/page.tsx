'use client';
import { useState, useRef, useEffect } from 'react';
import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { listScripts } from '@/services/scripts';
import Image from 'next/image';
import { Space_Grotesk } from 'next/font/google';
import { FaSearch } from 'react-icons/fa';
export const dynamic = 'force-dynamic';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'] });
const flarialLogo = "/images/flarial-logo.png";

export default function Home() {
  const [scripts, setScripts] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    async function fetchScripts() {
      try {
        const data = await listScripts();
        setScripts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load scripts');
      }
    }
    fetchScripts();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredScripts = scripts.filter(script => 
    script.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${spaceGrotesk.className}`}
      style={{ backgroundImage: "url('/images/background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg"></div>
      <main className="relative max-w-7xl mx-auto p-6 md:p-12">
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center space-x-3">
            <Image src={flarialLogo} alt="Flarial Logo" width={47} height={52} className="rounded" />
            <h1 className="text-5xl font-extrabold tracking-tight text-white-500 leading-none">Flarial Scripts</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
            Browse and download community-created scripts for Flarial
          </p>
        </div>

        {/* Search Button and Expanding Search Bar */}
        <div className="absolute top-6 right-6 flex items-center" ref={searchRef}>
          <div className={`flex items-center transition-all duration-1000 ease-in-out ${isSearchOpen ? 'bg-[#201a1b]/80 p-2 rounded-lg w-64 backdrop-blur-md' : 'w-auto'}`}>
            {isSearchOpen && <FaSearch size={18} className="text-white mr-2" />}
            <input 
              type="text" 
              placeholder="Search for scripts..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`p-2 rounded-lg border border-neutral-700 bg-[#201a1b]/80 text-white focus:outline-none focus:ring-2 focus:ring-red-700 transition-all duration-1000 ease-in-out ${isSearchOpen ? 'w-64' : 'w-0 opacity-0'}`}
            />
            {!isSearchOpen && (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full text-white bg-[#201a1b]/80 hover:bg-[#201a1b]/40 focus:outline-none transition-all duration-700 ease-in-out backdrop-blur-md"
              >
                <FaSearch size={18} />
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-4 rounded-lg bg-red-200 dark:bg-red-900 border border-red-400 dark:border-red-700">
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12 mt-12">
            <p className="text-gray-600 dark:text-gray-400">No matching scripts found.</p>
          </div>
        ) : (
          <ScriptGrid scripts={filteredScripts} />
        )}
      </main>

      {/* Floating Footer */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-white z-10">
        <p className="text-sm">© 2025 Flarial. All Rights Reserved.</p>
        <p className="text-sm">Made with ❤️ by MBG & Ashank.</p>
      </div>
    </div>
  );
}
