// ---------------------------------------------------------------------------
// Share buttons — axe-core accessibility tests (Artifact 14 §3.1.2)
// ---------------------------------------------------------------------------
// States tested: default, horizontal/vertical layouts, various sizes
// Mocks: core sharing modules, navigator.share, navigator.clipboard
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ShareButtons } from '@confluenceohio/ui/share-buttons';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@confluenceohio/core/sharing/build-share-url', () => ({
  buildShareUrl: vi.fn(() => 'https://example.com/share'),
}));

vi.mock('@confluenceohio/core/sharing/share-messages', () => ({
  getShareMessages: vi.fn(() => ({
    twitter: { text: 'Sign the petition', hashtags: 'ConfluenceOhio', via: 'confluenceoh' },
    whatsapp: { text: 'Sign the petition for Confluence Ohio' },
    email: { subject: 'Join the movement', body: 'Sign the petition at confluenceohio.org' },
    linkedin: { text: 'Join the Confluence Ohio movement' },
  })),
  getNativeShareText: vi.fn(() => 'Check out Confluence Ohio'),
  getNativeShareTitle: vi.fn(() => 'Confluence Ohio'),
}));

vi.mock('@confluenceohio/core/sharing/track-share-event', () => ({
  trackShareEvent: vi.fn(),
  trackShareLinkCopied: vi.fn(),
  trackShareNativeCompleted: vi.fn(),
  trackShareNativeCancelled: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShareButtons accessibility', () => {
  it('has no axe violations in default state (horizontal)', async () => {
    const { container } = render(
      <ShareButtons
        shareUrl="https://confluenceohio.org/sign"
        context="petition-page"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in vertical layout', async () => {
    const { container } = render(
      <ShareButtons
        shareUrl="https://confluenceohio.org/sign"
        context="post-signature"
        layout="vertical"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations at small size', async () => {
    const { container } = render(
      <ShareButtons
        shareUrl="https://confluenceohio.org/sign"
        context="petition-page"
        size="sm"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations at large size', async () => {
    const { container } = render(
      <ShareButtons
        shareUrl="https://confluenceohio.org/sign"
        context="petition-page"
        size="lg"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in voice-story context', async () => {
    const { container } = render(
      <ShareButtons
        shareUrl="https://confluenceohio.org/voices/my-story"
        context="voice-story"
        storyTitle="Why I support the rename"
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with referral code and signer number', async () => {
    const { container } = render(
      <ShareButtons
        shareUrl="https://confluenceohio.org/sign"
        context="post-signature"
        referralCode="abc123"
        signerNumber={1234}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
