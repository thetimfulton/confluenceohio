// ---------------------------------------------------------------------------
// Volunteer Nurture — apps/web/inngest/functions/nurture-volunteer.ts
// ---------------------------------------------------------------------------
// Triggered by 'volunteer/signup.created' (fired by POST /api/volunteer).
//
// Onboarding drip for new volunteers:
//  Day 0:  Role-specific welcome + confirmation
//  Day 3:  "Getting Started" guide based on selected roles
//  Day 7:  First task assignment or event invitation
//  Day 14: Check-in email — how's it going?
//
// Each step checks unsubscribe status before sending. Role-specific
// content is driven by Brevo template params (the template handles
// conditional blocks based on roles).
//
// See Artifact 07 §4 and Artifact 08 for the volunteer nurture spec.
// ---------------------------------------------------------------------------

import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/service';
import { getEmailAdapter, getTemplateId } from '@confluenceohio/email';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

/** Human-readable labels for volunteer roles (matches Artifact 08 §2). */
const ROLE_LABELS: Record<string, string> = {
  'signature-gathering': 'Signature Gathering',
  'social-media': 'Social Media & Digital',
  'community-outreach': 'Community Outreach',
  'event-planning': 'Event Planning',
  research: 'Research & Writing',
  legal: 'Legal & Policy',
  design: 'Design & Creative',
  other: 'General Support',
};

export const nurtureVolunteer = inngest.createFunction(
  {
    id: 'nurture-volunteer',
    name: 'Volunteer Onboarding Nurture',
    concurrency: { limit: 50 },
    retries: 3,
  },
  { event: 'volunteer/signup.created' },

  async ({ event, step }) => {
    const { email, firstName, lastName, roles, neighborhood, volunteerId } =
      event.data;

    const brevo = getEmailAdapter();

    const roleLabels = roles
      .map((r) => ROLE_LABELS[r] || r)
      .filter(Boolean);

    // ── Day 0: Role-specific welcome confirmation ──

    await step.run('send-volunteer-welcome', async () => {
      await brevo.sendTransactional({
        templateId: getTemplateId('VOLUNTEER_CONFIRMATION'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          ROLES: roleLabels.join(', '),
          ROLE_LIST: roleLabels,
          NEIGHBORHOOD: neighborhood || '',
          VOLUNTEER_DASHBOARD_URL: `${SITE_URL}/volunteer/dashboard`,
        },
        tags: ['nurture', 'volunteer', 'welcome'],
      });
    });

    // ── Day 3: "Getting Started" guide based on selected roles ──

    await step.sleep('wait-day-3', '3 days');

    const isActive3 = await step.run('check-active-day-3', async () => {
      return isSubscriberActive(email);
    });

    if (!isActive3) {
      return { email, volunteerId, nurtureStoppedAt: 'day-3' };
    }

    await step.run('send-getting-started', async () => {
      // Build role-specific resource links
      const roleResources = buildRoleResources(roles);

      await brevo.sendTransactional({
        templateId: getTemplateId('VOLUNTEER_ONBOARDING_2'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          ROLES: roleLabels.join(', '),
          ROLE_LIST: roleLabels,
          ROLE_RESOURCES: roleResources,
          VOLUNTEER_DASHBOARD_URL: `${SITE_URL}/volunteer/dashboard`,
          FAQ_URL: `${SITE_URL}/faq`,
        },
        tags: ['nurture', 'volunteer', 'getting-started'],
      });
    });

    // ── Day 7: First task assignment or event invitation ──

    await step.sleep('wait-day-7', '4 days');

    const isActive7 = await step.run('check-active-day-7', async () => {
      return isSubscriberActive(email);
    });

    if (!isActive7) {
      return { email, volunteerId, nurtureStoppedAt: 'day-7' };
    }

    await step.run('send-first-task', async () => {
      // Pull upcoming events if available
      const supabase = createServiceClient();
      const { data: events } = await supabase
        .from('events')
        .select('title, date, location, url')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(3);

      const upcomingEvents = (events || []).map((e) => ({
        title: e.title,
        date: e.date,
        location: e.location,
        url: e.url || `${SITE_URL}/volunteer/events`,
      }));

      await brevo.sendTransactional({
        templateId: getTemplateId('VOLUNTEER_FIRST_TASK'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          ROLES: roleLabels.join(', '),
          ROLE_LIST: roleLabels,
          HAS_EVENTS: upcomingEvents.length > 0,
          EVENTS: upcomingEvents,
          VOLUNTEER_DASHBOARD_URL: `${SITE_URL}/volunteer/dashboard`,
          SHARE_URL: `${SITE_URL}/sign`,
        },
        tags: ['nurture', 'volunteer', 'first-task'],
      });
    });

    // ── Day 14: Check-in email ──

    await step.sleep('wait-day-14', '7 days');

    const isActive14 = await step.run('check-active-day-14', async () => {
      return isSubscriberActive(email);
    });

    if (!isActive14) {
      return { email, volunteerId, nurtureStoppedAt: 'day-14' };
    }

    await step.run('send-check-in', async () => {
      // Check if volunteer has logged any activity
      const supabase = createServiceClient();
      const { count } = await supabase
        .from('volunteer_activities')
        .select('id', { count: 'exact', head: true })
        .eq('volunteer_id', volunteerId);

      const hasActivity = (count || 0) > 0;

      await brevo.sendTransactional({
        templateId: getTemplateId('VOLUNTEER_CHECK_IN'),
        to: email,
        toName: firstName,
        params: {
          FIRSTNAME: firstName,
          HAS_ACTIVITY: hasActivity,
          ACTIVITY_COUNT: count || 0,
          ROLES: roleLabels.join(', '),
          VOLUNTEER_DASHBOARD_URL: `${SITE_URL}/volunteer/dashboard`,
          CONTACT_URL: `${SITE_URL}/about#contact`,
        },
        tags: ['nurture', 'volunteer', 'check-in'],
      });
    });

    return { email, volunteerId, nurtureCompleted: true };
  },
);

/**
 * Check whether a subscriber is still active (not unsubscribed/bounced).
 */
async function isSubscriberActive(email: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: sub } = await supabase
    .from('email_subscribers')
    .select('status')
    .eq('email', email)
    .maybeSingle();

  if (!sub) return true;
  return sub.status === 'active';
}

/**
 * Build role-specific resource objects for the Brevo template.
 * Each role maps to a getting-started resource with a title and URL.
 */
function buildRoleResources(
  roles: string[],
): Array<{ role: string; title: string; url: string }> {
  const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://confluenceohio.org';

  const resourceMap: Record<string, { title: string; url: string }> = {
    'signature-gathering': {
      title: 'Signature Gathering Guide',
      url: `${SITE}/volunteer/guides/signature-gathering`,
    },
    'social-media': {
      title: 'Social Media Toolkit',
      url: `${SITE}/volunteer/guides/social-media`,
    },
    'community-outreach': {
      title: 'Community Outreach Playbook',
      url: `${SITE}/volunteer/guides/outreach`,
    },
    'event-planning': {
      title: 'Event Planning Guide',
      url: `${SITE}/volunteer/guides/events`,
    },
    research: {
      title: 'Research & Writing Resources',
      url: `${SITE}/volunteer/guides/research`,
    },
    legal: {
      title: 'Legal & Policy Overview',
      url: `${SITE}/volunteer/guides/legal`,
    },
    design: {
      title: 'Brand & Design Assets',
      url: `${SITE}/volunteer/guides/design`,
    },
    other: {
      title: 'General Volunteer Guide',
      url: `${SITE}/volunteer/guides/general`,
    },
  };

  return roles
    .map((role) => {
      const resource = resourceMap[role];
      if (!resource) return null;
      return { role: ROLE_LABELS[role] || role, ...resource };
    })
    .filter(
      (r): r is { role: string; title: string; url: string } => r !== null,
    );
}
