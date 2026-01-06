import { Suspense } from 'react';
import { ScriptGrid } from '@/components/ScriptGrid/ScriptGrid';
import { ConfigGrid } from '@/components/ConfigGrid/ConfigGrid';
import { listScripts } from '@/services/scripts';
import { listConfigs } from '@/services/configs';
import Image from 'next/image';
import { Space_Grotesk } from 'next/font/google';
import { MarketplaceClient } from '@/components/MarketplaceClient/MarketplaceClient';

// ISR: Revalidate every 60 seconds for fresh content
export const revalidate = 60;

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: true,
});

// Server-side data fetching with caching
async function getMarketplaceData() {
  const [scripts, configs] = await Promise.all([
    listScripts(),
    listConfigs(),
  ]);
  return { scripts, configs };
}

export default async function Home() {
  const { scripts, configs } = await getMarketplaceData();

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${spaceGrotesk.className}`}
    >
      {/* Optimized WebP background - 15KB vs 899KB PNG */}
      <Image
        src="/images/background.webp"
        alt=""
        fill
        priority
        quality={85}
        className="object-cover -z-10"
        sizes="100vw"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80 -z-[5]" />

      <main className="relative max-w-7xl mx-auto p-6 md:p-12">
        {/* Header */}
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center space-x-3">
            <Image
              src="/images/flarial-logo.png"
              alt="Flarial Logo"
              width={47}
              height={52}
              className="rounded"
              priority
            />
            <h1 className="text-5xl font-extrabold tracking-tight text-white leading-none">
              Flarial Marketplace
            </h1>
          </div>
          <p className="text-lg text-gray-400 mt-1">
            Browse and download community-created scripts and configs for Flarial
          </p>
        </div>

        {/* Client-side interactive components */}
        <Suspense fallback={<MarketplaceLoadingSkeleton />}>
          <MarketplaceClient
            initialScripts={scripts}
            initialConfigs={configs}
          />
        </Suspense>
      </main>
    </div>
  );
}

function MarketplaceLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center space-x-4 mb-6">
        <div className="h-10 w-32 bg-gray-700 rounded-md" />
        <div className="h-10 w-10 bg-gray-700 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-800/50 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
