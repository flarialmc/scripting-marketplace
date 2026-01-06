'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { ConfigGrid } from '@/components/ConfigGrid/ConfigGrid';
import { Script } from '@/types/script';
import { Config } from '@/types/config';
import { FaSearch, FaChevronDown } from 'react-icons/fa';

interface MarketplaceClientProps {
  initialScripts: Script[];
  initialConfigs: Config[];
}

export function MarketplaceClient({ initialScripts, initialConfigs }: MarketplaceClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'Scripts' | 'Configs'>('Scripts');
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && event.target instanceof Node && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoized filtered results
  const filteredScripts = useMemo(() =>
    initialScripts.filter(script =>
      script.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [initialScripts, searchQuery]
  );

  const filteredConfigs = useMemo(() =>
    initialConfigs.filter(config =>
      config.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [initialConfigs, searchQuery]
  );

  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4" ref={dropdownRef}>
          {/* Category Dropdown */}
          <div className="relative">
            <button
              className="flex items-center px-4 py-2 bg-[#2d2526] text-white rounded-md shadow-md hover:bg-[#3a3032] border border-white/20 transition-colors"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
            >
              {selectedOption}
              <FaChevronDown className={`ml-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-[#201a1b] rounded-md shadow-lg z-10 border border-white/10">
                <ul role="listbox">
                  <li
                    role="option"
                    aria-selected={selectedOption === 'Scripts'}
                    className="px-4 py-2 hover:bg-[#2a2223] text-white cursor-pointer transition-colors"
                    onClick={() => { setSelectedOption('Scripts'); setIsDropdownOpen(false); }}
                  >
                    Scripts
                  </li>
                  <li
                    role="option"
                    aria-selected={selectedOption === 'Configs'}
                    className="px-4 py-2 hover:bg-[#2a2223] text-white cursor-pointer transition-colors"
                    onClick={() => { setSelectedOption('Configs'); setIsDropdownOpen(false); }}
                  >
                    Configs
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Upload Config Button */}
          {selectedOption === 'Configs' && (
            <button
              className="px-4 py-2 bg-[#2d2526] text-white rounded-md shadow-md hover:bg-[#3a3032] border border-white/20 transition-colors"
              onClick={() => router.push('/upload-config')}
            >
              Upload Config
            </button>
          )}
        </div>

        {/* Search - CSS animation instead of framer-motion */}
        <div ref={searchRef} className="relative">
          <div
            className={`
              flex items-center bg-[#201a1b]/80 rounded-lg shadow-lg px-2 h-10
              transition-all duration-300 ease-out
              ${isSearchOpen ? 'w-64' : 'w-10'}
            `}
          >
            <button
              onClick={() => setIsSearchOpen(prev => !prev)}
              className="w-6 h-6 flex items-center justify-center flex-shrink-0"
              aria-label={isSearchOpen ? 'Close search' : 'Open search'}
            >
              <FaSearch size={18} className="text-white" />
            </button>
            <input
              type="text"
              placeholder={`Search ${selectedOption.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={() => setIsSearchOpen(true)}
              className={`
                bg-transparent text-white focus:outline-none ml-2
                transition-all duration-300
                ${isSearchOpen ? 'opacity-100 w-full' : 'opacity-0 w-0'}
              `}
              aria-label={`Search ${selectedOption.toLowerCase()}`}
            />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {selectedOption === 'Scripts' ? (
        filteredScripts.length > 0 ? (
          <ScriptGrid scripts={filteredScripts} />
        ) : (
          <EmptyState message="No matching scripts found." />
        )
      ) : (
        filteredConfigs.length > 0 ? (
          <ConfigGrid configs={filteredConfigs} />
        ) : (
          <EmptyState message="No matching configs found." />
        )
      )}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 mt-12">
      <p className="text-gray-400">{message}</p>
    </div>
  );
}
