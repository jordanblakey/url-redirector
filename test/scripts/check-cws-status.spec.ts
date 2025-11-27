import { test, expect, describe, beforeAll, afterAll } from '@playwright/test';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import http from 'http';

const execPromise = util.promisify(exec);
const rootDir = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(rootDir, 'scripts', 'check-cws-status.ts');

describe('check-cws-status.ts script (integration)', () => {
    let server: http.Server;
    let port: number;

    beforeAll(async ({}, testInfo) => {
        port = 12345 + testInfo.workerIndex;
        server = http.createServer((req, res) => {
            if (req.url?.includes('token')) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ access_token: 'mock_access_token' }));
            } else if (req.url?.includes('fetchStatus')) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'OK', state: 'published' }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });
        await new Promise<void>(resolve => server.listen(port, resolve));
    });

    afterAll(() => {
        server.close();
    });

    test('should run the script and print the status from mock server', async () => {
        const env = {
            ...process.env,
            NODE_ENV: 'test',
            CWS_CLIENT_ID: 'test',
            CWS_CLIENT_SECRET: 'test',
            CWS_REFRESH_TOKEN: 'test',
            // Override URLs to point to our mock server
            TOKEN_URL: `http://localhost:${port}/token`,
            STATUS_URL_TEMPLATE: `http://localhost:${port}/publishers/{publisherId}/items/{itemId}:fetchStatus`
        };

        const command = `npx ts-node ${scriptPath}`;
        const { stdout, stderr } = await execPromise(command, { env });

        expect(stderr).toBe('');
        expect(stdout).toContain('Chrome Web Store Extension Status:');
        expect(stdout).toContain("'OK'");
        expect(stdout).toContain("'published'");
    });

    test('should exit with error if credentials are missing', async () => {
        const env = { ...process.env, NODE_ENV: 'test' };
        const command = `npx ts-node ${scriptPath}`;
        await expect(execPromise(command, { env })).rejects.toThrow(
            'Missing required environment variables'
        );
    });
});
