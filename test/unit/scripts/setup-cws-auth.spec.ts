import { test, expect, describe, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupAuth } from '../../../scripts/setup-cws-auth';

describe('Setup CWS Auth Script', () => {
    let mockLog: any;
    let logs: string[] = [];

    beforeEach(() => {
        logs = [];
        mockLog = (...args: any[]) => logs.push(args.join(' '));
    });

    test('should print instructions', () => {
        setupAuth({
            deps: {
                log: mockLog
            }
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0]).toContain('To check the status of your Chrome Web Store listing');
        expect(logs[0]).toContain('Enable the Chrome Web Store API');
        expect(logs[0]).toContain('Configure OAuth Consent Screen');
        expect(logs[0]).toContain('Create OAuth Client ID');
        expect(logs[0]).toContain('Get Refresh Token');
        expect(logs[0]).toContain('Run the script');
    });
});
