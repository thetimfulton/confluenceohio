/**
 * Context-specific share text templates (Artifact 11 §2.2).
 *
 * Each context (post-signature, petition-page, voice-story) has tailored
 * messages per platform, optimized for character limits and conventions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShareContext = 'post-signature' | 'petition-page' | 'voice-story';

export interface ShareMessages {
  twitter: { text: string; hashtags: string[]; via: string };
  whatsapp: { text: string };
  email: { subject: string; body: string };
  /** LinkedIn uses the same text as Twitter (minus hashtags/via) */
  linkedin: { text: string };
}

export interface ShareMessageOptions {
  /** Voice story title (for voice-story context) */
  storyTitle?: string;
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

const POST_SIGNATURE_MESSAGES: ShareMessages = {
  twitter: {
    text: 'I just signed the petition to rename Columbus to Confluence, Ohio \u2014 a name that actually describes our city. Add your name:',
    hashtags: ['ConfluenceOhio'],
    via: 'confluenceohio',
  },
  whatsapp: {
    text: "Hey! I just signed the petition to rename Columbus to Confluence, Ohio. It's the actual geographic name for where the Scioto and Olentangy rivers meet \u2014 where the city was founded. Check it out and add your name:",
  },
  email: {
    subject: 'I signed \u2014 will you?',
    body: "I just added my name to the Confluence Ohio petition. The idea is to rename Columbus after the confluence of the Scioto and Olentangy rivers \u2014 the geographic feature that made the city possible.\n\nIt takes 30 seconds to sign: {url}\n\n\u2014 Sent by a fellow Ohioan",
  },
  linkedin: {
    text: 'I just signed the petition to rename Columbus, Ohio to Confluence \u2014 the name of the geographic feature where the Scioto and Olentangy rivers meet. Learn more:',
  },
};

const PETITION_PAGE_MESSAGES: ShareMessages = {
  twitter: {
    text: "Should Columbus, Ohio become Confluence, Ohio? The rivers that made the city have a better story than the man it was named for. See the case:",
    hashtags: ['ConfluenceOhio'],
    via: 'confluenceohio',
  },
  whatsapp: {
    text: "Have you seen this? There's a petition to rename Columbus to Confluence \u2014 after the rivers that made the city. I thought you'd find it interesting:",
  },
  email: {
    subject: 'What do you think about this?',
    body: "There's a campaign to rename Columbus to Confluence, Ohio \u2014 after the confluence of the Scioto and Olentangy rivers. Whether you're for or against, the case is worth reading: {url}",
  },
  linkedin: {
    text: 'Should Columbus, Ohio become Confluence, Ohio? A civic campaign is making the geographic case for renaming the city after its rivers.',
  },
};

function getVoiceStoryMessages(storyTitle?: string): ShareMessages {
  const title = storyTitle ?? 'A perspective on renaming Columbus';

  return {
    twitter: {
      text: `\u201C${title}\u201D \u2014 a perspective on renaming Columbus to Confluence, Ohio:`,
      hashtags: ['ConfluenceOhio'],
      via: 'confluenceohio',
    },
    whatsapp: {
      text: `Read this perspective on the Columbus \u2192 Confluence question: \u201C${title}\u201D`,
    },
    email: {
      subject: 'A perspective on the Columbus renaming question',
      body: `I thought you'd find this interesting \u2014 it's one person's take on whether Columbus should become Confluence, Ohio:\n\n${title}\n{url}`,
    },
    linkedin: {
      text: `\u201C${title}\u201D \u2014 a community perspective on the campaign to rename Columbus, Ohio to Confluence.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get share messages for a given context.
 * Messages are platform-specific and optimized for each platform's
 * character limits and conventions.
 */
export function getShareMessages(
  context: ShareContext,
  options?: ShareMessageOptions,
): ShareMessages {
  switch (context) {
    case 'post-signature':
      return POST_SIGNATURE_MESSAGES;
    case 'petition-page':
      return PETITION_PAGE_MESSAGES;
    case 'voice-story':
      return getVoiceStoryMessages(options?.storyTitle);
  }
}

/**
 * Get a general-purpose share text (used for native Web Share API fallback).
 */
export function getNativeShareText(context: ShareContext): string {
  switch (context) {
    case 'post-signature':
      return 'I just signed the petition to rename Columbus to Confluence, Ohio. Add your name!';
    case 'petition-page':
      return 'Should Columbus, Ohio become Confluence, Ohio? Here\u2019s the case.';
    case 'voice-story':
      return 'A community perspective on renaming Columbus to Confluence, Ohio.';
  }
}

/**
 * Get the native share title (used for Web Share API `title` field).
 */
export function getNativeShareTitle(context: ShareContext): string {
  switch (context) {
    case 'post-signature':
      return 'Confluence Ohio \u2014 Sign the Petition';
    case 'petition-page':
      return 'Confluence Ohio \u2014 The Case for Renaming Columbus';
    case 'voice-story':
      return 'Community Voices \u2014 Confluence Ohio';
  }
}
