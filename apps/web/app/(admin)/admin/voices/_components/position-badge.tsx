import type { VoicePosition } from '@confluenceohio/db/types';

const POSITION_STYLES: Record<VoicePosition, string> = {
  support: 'bg-green-100 text-green-800',
  oppose: 'bg-amber-100 text-amber-800',
  undecided: 'bg-blue-100 text-blue-800',
};

const POSITION_LABELS: Record<VoicePosition, string> = {
  support: 'Supports renaming',
  oppose: 'Has concerns',
  undecided: 'Still deciding',
};

export function PositionBadge({ position }: { position: VoicePosition }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${POSITION_STYLES[position]}`}
    >
      {POSITION_LABELS[position]}
    </span>
  );
}
