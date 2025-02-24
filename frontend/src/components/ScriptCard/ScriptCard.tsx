import Image from 'next/image';
import { Script } from '@/types/script';
import { scriptsService } from '@/services/scripts';

interface ScriptCardProps {
  script: Script;
}

export function ScriptCard({ script }: ScriptCardProps) {
  const handleDownload = async () => {
    try {
      await scriptsService.downloadScript(script.id);
    } catch (error) {
      console.error('Error downloading script:', error);
      // TODO: Add proper error handling/notification
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