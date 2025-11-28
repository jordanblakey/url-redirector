import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import { generateChangelog } from '../../../scripts/generate-changelog';
import fs from 'fs-extra';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('generateChangelog', () => {
  let mockExecSync: any;
  let mockFs: any;
  let mockGenAI: any;
  let mockLoadSecrets: any;
  let mockLog: (...args: any[]) => void;
  let mockWarn: any;
  let mockError: any;
  let mockExit: any;
  let logs: string[] = [];
  let warns: string[] = [];
  let errors: string[] = [];
  let fsOperations: any[] = [];

  beforeEach(() => {
    logs = [];
    warns = [];
    errors = [];
    fsOperations = [];

    mockLog = vi.fn((...args: any[]) => logs.push(args.join(' ')));
    mockWarn = vi.fn((...args: any[]) => warns.push(args.join(' ')));
    mockError = vi.fn((...args: any[]) => errors.push(args.join(' ')));
    mockExit = vi.fn();

    mockExecSync = vi.fn((cmd: string) => {
      if (cmd.includes('git describe')) return 'v1.0.0';
      if (cmd.includes('git log')) return 'hash feat: test commit';
      return '';
    });

    mockFs = {
      ensureDirSync: (path: string) => fsOperations.push({ op: 'ensureDirSync', path }),
      writeFileSync: (path: string, content: string) =>
        fsOperations.push({ op: 'writeFileSync', path, content }),
    };

    mockGenAI = class MockGenAI {
      constructor(apiKey: string) {}
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: { text: () => 'AI Generated Changelog' },
          }),
        };
      }
    };

    mockLoadSecrets = vi.fn();
    process.env.GEMINI_API_KEY = 'fake_key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  test('should generate changelog using Gemini API', async () => {
    await generateChangelog({
      deps: {
        execSync: mockExecSync,
        fs: mockFs,
        GoogleGenerativeAI: mockGenAI,
        loadGcpSecrets: mockLoadSecrets,
        log: mockLog,
        warn: mockWarn,
        error: mockError,
        exit: mockExit,
      },
    });

    expect(mockExecSync).toHaveBeenCalledTimes(2); // describe + log
    expect(mockLoadSecrets).toHaveBeenCalled();
    expect(logs.some((l) => l.includes('Calling Gemini API'))).toBe(true);
    expect(
      fsOperations.some(
        (op) => op.op === 'writeFileSync' && op.content === 'AI Generated Changelog',
      ),
    ).toBe(true);
  });

  test('should fallback if GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    await generateChangelog({
      deps: {
        execSync: mockExecSync,
        fs: mockFs,
        GoogleGenerativeAI: mockGenAI,
        loadGcpSecrets: mockLoadSecrets,
        log: mockLog,
        warn: mockWarn,
        error: mockError,
        exit: mockExit,
      },
    });

    expect(warns.some((w) => w.includes('GEMINI_API_KEY not found'))).toBe(true);
    expect(
      fsOperations.some(
        (op) => op.op === 'writeFileSync' && op.content.includes('Changes since v1.0.0'),
      ),
    ).toBe(true);
  });

  test('should handle no new commits', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git describe')) return 'v1.0.0';
      if (cmd.includes('git log')) return ''; // No commits
      return '';
    });

    await generateChangelog({
      deps: {
        execSync: mockExecSync,
        fs: mockFs,
        GoogleGenerativeAI: mockGenAI,
        loadGcpSecrets: mockLoadSecrets,
        log: mockLog,
        warn: mockWarn,
        error: mockError,
        exit: mockExit,
      },
    });

    expect(logs.some((l) => l.includes('No new commits'))).toBe(true);
    expect(fsOperations.length).toBe(0);
  });

  test('should handle errors gracefully', async () => {
    mockLoadSecrets.mockRejectedValue(new Error('Secrets failed'));

    await generateChangelog({
      deps: {
        execSync: mockExecSync,
        fs: mockFs,
        GoogleGenerativeAI: mockGenAI,
        loadGcpSecrets: mockLoadSecrets,
        log: mockLog,
        warn: mockWarn,
        error: mockError,
        exit: mockExit,
      },
    });

    expect(mockError).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
