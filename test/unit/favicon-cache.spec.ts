
import { test, expect } from '../fixtures';
import { getFaviconUrl } from '../../src/favicon-cache.js';
import sinon from 'sinon';

// Mock chrome global
const mockStorage = {
  get: sinon.stub(),
  set: sinon.stub()
};

(global as any).chrome = {
  storage: {
    local: mockStorage
  }
};

// Mock fetch global
const mockFetch = sinon.stub();
(global as any).fetch = mockFetch;

test.describe('Favicon Cache Unit Tests', () => {

  test.beforeEach(() => {
    mockStorage.get.reset();
    mockStorage.set.reset();
    mockFetch.reset();
  });

  test('should return fallback icon for invalid URLs', async () => {
    const url = 'invalid-url';
    // getFaviconUrl catches invalid URL errors implicitly via getDomain returning null
    // But getDomain implementation in favicon-cache.ts:
    // try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch (e) { return null; }
    // 'invalid-url' -> 'https://invalid-url' -> hostname 'invalid-url'. This is valid hostname.
    // So getDomain returns 'invalid-url'.
    // Then it tries to fetch.

    // Let's pass something that fails URL construction if possible, or just mock fetch to fail.
    // If I pass "", it might fail.
    const result = await getFaviconUrl("");
    expect(result).toBe('default-icon.png');
  });

  test('should return cached favicon if present', async () => {
    const domain = 'example.com';
    const cacheKey = `favicon_${domain}`;
    const cachedData = 'data:image/png;base64,cached';

    mockStorage.get.withArgs([cacheKey]).yields({ [cacheKey]: cachedData });

    const result = await getFaviconUrl(`https://${domain}`);
    expect(result).toBe(cachedData);
    expect(mockFetch.called).toBe(false);
  });

  test('should fetch and cache if not present', async () => {
    const domain = 'google.com';
    const cacheKey = `favicon_${domain}`;
    const remoteData = 'data:image/png;base64,remote';

    // Storage miss
    mockStorage.get.withArgs([cacheKey]).yields({});

    // Fetch success
    const mockBlob = {
      size: 100,
      type: 'image/png'
    };

    mockFetch.resolves({
      ok: true,
      blob: async () => mockBlob
    });

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: function () {
        setTimeout(() => {
          this.result = remoteData;
          this.onloadend();
        }, 10);
      },
      onloadend: () => { },
      onerror: () => { },
      result: ''
    };

    // Stub FileReader constructor
    const originalFileReader = global.FileReader;
    (global as any).FileReader = function () { return mockFileReader; };

    // Set expectation for storage.set
    mockStorage.set.resolves();

    try {
      const result = await getFaviconUrl(`https://${domain}`);
      expect(result).toBe(remoteData);
      expect(mockStorage.set.calledWith({ [cacheKey]: remoteData })).toBe(true);
    } finally {
      (global as any).FileReader = originalFileReader;
    }
  });

  test('should fallback to remote URL on fetch failure', async () => {
    const domain = 'fail.com';
    const cacheKey = `favicon_${domain}`;

    mockStorage.get.withArgs([cacheKey]).yields({});
    mockFetch.rejects(new Error('Network error'));

    // Stub console.warn to suppress the expected error log
    const consoleWarnStub = sinon.stub(console, 'warn');

    try {
      const result = await getFaviconUrl(`https://${domain}`);
      expect(result).toBe(`https://www.google.com/s2/favicons?domain=${domain}&sz=32`);
      expect(consoleWarnStub.called).toBe(true);
    } finally {
      consoleWarnStub.restore();
    }
  });

  test('should dedupe concurrent requests', async () => {
    const domain = 'concurrent.com';
    const cacheKey = `favicon_${domain}`;

    mockStorage.get.withArgs([cacheKey]).yields({});

    let fetchResolve: (value: any) => void;
    const fetchPromise = new Promise(resolve => { fetchResolve = resolve; });

    mockFetch.returns(fetchPromise);

    const p1 = getFaviconUrl(`https://${domain}`);
    const p2 = getFaviconUrl(`https://${domain}`);

    // Wait slightly for p2 to invoke its logic if any
    await new Promise(r => setTimeout(r, 0));

    expect(mockFetch.calledOnce).toBe(true);

    // Now resolve fetch
    const mockBlob = { size: 100, type: 'image/png' };

    // Mock FileReader again
    const mockFileReader = {
      readAsDataURL: function () {
        setTimeout(() => {
          this.result = 'data:xxx';
          this.onloadend();
        }, 0);
      },
      onloadend: () => { },
      result: ''
    };
    const originalFileReader = global.FileReader;
    (global as any).FileReader = function () { return mockFileReader; };

    // Ensure set is stubbed to return a promise
    mockStorage.set.resolves();

    fetchResolve!({
      ok: true,
      blob: async () => mockBlob
    });

    await Promise.all([p1, p2]);
    (global as any).FileReader = originalFileReader;
  });
});
