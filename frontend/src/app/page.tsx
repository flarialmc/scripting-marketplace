import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { listScripts } from '@/services/scripts';

export default async function Home() {
  let scripts;
  let error;

  try {
    scripts = await listScripts();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load scripts';
  }

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Flarial Scripts</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Browse and download community-created scripts for Flarial
          </p>
        </div>

        {error ? (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : !scripts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-lg bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No scripts available yet.
            </p>
          </div>
        ) : (
          <ScriptGrid scripts={scripts} />
        )}
      </main>
    </div>
  );
}
