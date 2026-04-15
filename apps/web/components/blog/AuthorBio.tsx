interface AuthorBioProps {
  name: string;
}

export function AuthorBio({ name }: AuthorBioProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      {/* Avatar placeholder — a simple initial circle */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
        aria-hidden="true"
      >
        {name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        {name === 'Confluence Ohio' && (
          <p className="text-xs text-gray-500">
            A civic movement to rename Columbus, Ohio.
          </p>
        )}
      </div>
    </div>
  );
}
