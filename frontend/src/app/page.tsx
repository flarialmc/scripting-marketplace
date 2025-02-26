'use client';
import { useState, useRef, useEffect } from 'react';
import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { listScripts } from '@/services/scripts';
import Image from 'next/image';
import { Space_Grotesk } from 'next/font/google';
import { FaSearch } from 'react-icons/fa';
import { motion } from 'framer-motion';
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

        <div className="absolute top-[72px] right-6 flex items-center" ref={searchRef}>
  <motion.div
    initial={{ width: 40, height: 40 }}
    animate={{ width: isSearchOpen ? 250 : 40, height: 40 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="relative flex items-center bg-[#201a1b]/80 rounded-lg backdrop-blur-md shadow-lg px-2"
  >
    <motion.input
      type="text"
      placeholder="Search for scripts..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className={`bg-transparent text-white focus:outline-none transition-all ${
        isSearchOpen ? "opacity-100 w-full pl-8" : "opacity-0 w-0"
      }`}
    />
    <button
      onClick={() => setIsSearchOpen((prev) => !prev)}
      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center"
    >
      <FaSearch size={18} className="text-white" />
    </button>
  </motion.div>
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
