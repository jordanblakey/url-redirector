#!/usr/bin/env node

import { loadGcpSecrets } from './load-dotenv-from-gcp';

export interface CheckStatusOptions {
  deps?: {
    loadGcpSecrets?: typeof loadGcpSecrets;
    fetch?: typeof fetch;
    log?: typeof console.log;
    dir?: typeof console.dir;
    error?: typeof console.error;
  };
}

// --- Helper Functions ---
async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  fetchFn: typeof fetch,
) {
  const response = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${text}`);
  }
  return (await response.json()).access_token;
}

async function checkStatus(
  accessToken: string,
  publisherId: string,
  extensionId: string,
  fetchFn: typeof fetch,
  log: typeof console.log,
  dir: typeof console.dir,
) {
  const fetchStatusUrl = `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}:fetchStatus`;
  const response = await fetchFn(fetchStatusUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch status: ${response.status} ${text}`);
  }

  const data = await response.json();
  log('Chrome Web Store Extension Status:\n');
  dir(data, { depth: null, colors: true });
}

// --- Main Execution ---
export async function runCheckStatus(options: CheckStatusOptions = {}) {
  const { deps = {} } = options;
  const loadSecrets = deps.loadGcpSecrets || loadGcpSecrets;
  const fetchFn = deps.fetch || global.fetch;
  const log = deps.log || console.log;
  const dir = deps.dir || console.dir;
  const error = deps.error || console.error;

  try {
    log('Loading secrets from Google Cloud...');
    await loadSecrets();

    // Extract required environment variables
    const CLIENT_ID = process.env.CWS_CLIENT_ID;
    const CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN;
    const PUBLISHER_ID = process.env.CWS_PUBLISHER_ID || 'c173d09b-31cf-48ff-bd4b-270d57317183';
    const EXTENSION_ID = process.env.CWS_EXTENSION_ID || 'jhkoaofpbohfmolalpieheaeppdaminl';

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Missing required environment variables after secret load.');
    }

    log('Fetching access token...');
    const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, fetchFn);

    log('Checking extension status...');
    await checkStatus(accessToken, PUBLISHER_ID, EXTENSION_ID, fetchFn, log, dir);
  } catch (err: unknown) {
    error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  runCheckStatus();
}
