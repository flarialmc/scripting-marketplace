'use client';
import { useState, useRef, useEffect } from 'react';
import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { ConfigGrid } from '@/components/ConfigGrid/ConfigGrid';
import { listScripts } from '@/services/scripts';
import { listConfigs } from '@/services/configs';
import { Script } from '@/types/script';
import { Config } from '@/types/config';
import Image from 'next/image';
import { Space_Grotesk } from 'next/font/google';
import { FaSearch, FaChevronDown } from 'react-icons/fa';
import { motion } from 'framer-motion';
export const dynamic = 'force-dynamic';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'] });
const flarialLogo = "/images/flarial-logo.png";

export default function Home() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("Scripts");
  const searchRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        if (selectedOption === "Scripts") {
          const data = await listScripts();
          setScripts(data);
        } else {
          const data = await listConfigs();
          setConfigs(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      }
    }
    fetchData();
  }, [selectedOption]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && event.target instanceof Node && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredData = selectedOption === "Scripts"
  ? scripts.filter(script => script.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  : configs.filter(config => config.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${spaceGrotesk.className}`}
      style={{ backgroundImage: "url('/images/background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/80 before:absolute before:inset-0 before:backdrop-blur-lg"></div>
      <main className="relative max-w-7xl mx-auto p-6 md:p-12">
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center space-x-3">
            <Image src={flarialLogo} alt="Flarial Logo" width={47} height={52} className="rounded" />
            <h1 className="text-5xl font-extrabold tracking-tight text-white-500 leading-none">Flarial {selectedOption}</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
            Browse and download community-created {selectedOption.toLowerCase()} for Flarial
          </p>

          {/* Dropdown Menu */}
          <div className="relative mt-2" ref={dropdownRef}>
            <button
              className="flex items-center px-4 py-2 bg-[#2d2526] text-white rounded-md shadow-md hover:bg-[#3a3032] border border-white/20"
              onClick={() => setIsDropdownOpen(prev => !prev)}
            >
              {selectedOption} <FaChevronDown className="ml-2" />
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-[#201a1b] rounded-md shadow-lg z-10">
                <ul>
                  <li
                    className="px-4 py-2 hover:bg-[#2a2223] text-white cursor-pointer"
                    onClick={() => { setSelectedOption("Scripts"); setIsDropdownOpen(false); }}
                  >
                    Scripts
                  </li>
                  <li
                    className="px-4 py-2 hover:bg-[#2a2223] text-white cursor-pointer"
                    onClick={() => { setSelectedOption("Config"); setIsDropdownOpen(false); }}
                  >
                    Configs
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-[72px] right-6 flex items-center" ref={searchRef}>
          <motion.div
            initial={{ width: 40, height: 40 }}
            animate={{ width: isSearchOpen ? 250 : 40, height: 40 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative flex items-center bg-[#201a1b]/80 rounded-lg  shadow-lg px-2"
          >
            <motion.input
              type="text"
              placeholder={`Search for ${selectedOption.toLowerCase()}...`}
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
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 mt-12">
            <p className="text-gray-600 dark:text-gray-400">No matching {selectedOption.toLowerCase()} found.</p>
          </div>
        ) : selectedOption === "Scripts" ? (
          <ScriptGrid scripts={filteredData} />
        ) : (
          <ConfigGrid configs={filteredData} />
        )}
      </main>
    </div>
  );
}
