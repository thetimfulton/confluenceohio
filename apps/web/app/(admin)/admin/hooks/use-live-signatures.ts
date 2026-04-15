'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export interface LiveSignature {
  id: string;
  first_name: string;
  city: string;
  verification_status: string;
  signature_number: number;
  signed_at: string;
}

/**
 * Subscribe to Supabase Realtime for a live feed of incoming signatures.
 * Fetches the most recent `limit` signatures on mount, then prepends
 * new inserts as they arrive.
 */
export function useLiveSignatures(limit = 20) {
  const [signatures, setSignatures] = useState<LiveSignature[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Initial fetch
    supabase
      .from('signatures')
      .select('id, first_name, city, verification_status, signature_number, signed_at')
      .is('deleted_at', null)
      .order('signed_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setSignatures(data as LiveSignature[]);
      });

    // Subscribe to new inserts
    const channel = supabase
      .channel('admin-signatures')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signatures',
        },
        (payload) => {
          const newSig = payload.new as LiveSignature;
          setSignatures((prev) => [newSig, ...prev].slice(0, limit));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return signatures;
}
