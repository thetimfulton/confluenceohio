'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddNoteForm({ volunteerId }: { volunteerId: string }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/volunteers/${volunteerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to add note.');
        setSubmitting(false);
        return;
      }

      setContent('');
      setSubmitting(false);
      router.refresh(); // Re-fetch server component data
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note\u2026"
        maxLength={2000}
        rows={3}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {content.length}/2000
        </span>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Saving\u2026' : 'Add note'}
        </button>
      </div>
    </form>
  );
}
