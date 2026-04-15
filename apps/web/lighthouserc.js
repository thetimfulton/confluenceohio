module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx next start -p 9222',
      startServerReadyPattern: 'started server on',
      url: [
        'http://localhost:9222/',
        'http://localhost:9222/sign',
        'http://localhost:9222/the-case',
        'http://localhost:9222/faq',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
