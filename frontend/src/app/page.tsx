import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { listScripts } from '@/services/scripts';
import Image from 'next/image';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'] });
const flarialLogo = "/images/flarial-logo.png";

export default async function Home() {
  let scripts;
  let error;

  try {
    scripts = await listScripts();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load scripts';
  }

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

        {error ? (
          <div className="p-4 rounded-lg bg-red-200 dark:bg-red-900 border border-red-400 dark:border-red-700">
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        ) : !scripts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse mt-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-32 h-32 rounded-lg bg-gray-200/40 dark:bg-gray-800/40 border-2 border-white shadow-lg backdrop-blur-md" />
            ))}
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12 mt-12">
            <p className="text-gray-600 dark:text-gray-400">No scripts available yet.</p>
          </div>
        ) : (
          <ScriptGrid scripts={scripts} />
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
