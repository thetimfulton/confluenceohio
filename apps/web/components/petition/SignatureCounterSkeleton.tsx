/**
 * Skeleton placeholder for SignatureCounter during dynamic loading.
 * Matches the exact dimensions of the real component to prevent CLS (Artifact 14 §2.5).
 */

interface SignatureCounterSkeletonProps {
  compact?: boolean;
}

export function SignatureCounterSkeleton({
  compact = false,
}: SignatureCounterSkeletonProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3" style={{ minHeight: '2rem' }}>
        <span className="inline-block h-7 w-20 animate-pulse rounded bg-gray-200" />
        <span className="text-sm text-gray-400">signatures</span>
        <div className="h-2 flex-1 rounded-full bg-gray-200" />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      style={{ minHeight: '176px' }}
    >
      <div className="text-center">
        <div className="mx-auto h-12 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mx-auto mt-2 h-4 w-16 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="mt-4">
        <div className="h-3 rounded-full bg-gray-200" />
        <div className="mx-auto mt-2 h-4 w-40 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
