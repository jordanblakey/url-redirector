#!/usr/bin/env node

const { loadGcpSecrets } = require('./load-dotenv-from-gcp');

// --- Helper Functions ---
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
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

async function checkStatus(accessToken: string, publisherId: string, extensionId: string) {
  const fetchStatusUrl = `https://chromewebstore.googleapis.com/v2/publishers/${publisherId}/items/${extensionId}:fetchStatus`;
  const response = await fetch(fetchStatusUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch status: ${response.status} ${text}`);
  }

  const data = await response.json();
  console.log('Chrome Web Store Extension Status:\n');
  console.dir(data, { depth: null, colors: true });
}

// --- Main Execution ---
(async () => {
  try {
    console.log('Loading secrets from Google Cloud...');
    await loadGcpSecrets();

    const CLIENT_ID = process.env.CWS_CLIENT_ID;
    const CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN;
    const PUBLISHER_ID = process.env.CWS_PUBLISHER_ID || 'c173d09b-31cf-48ff-bd4b-270d57317183';
    const EXTENSION_ID = process.env.CWS_EXTENSION_ID || 'jhkoaofpbohfmolalpieheaeppdaminl';

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error('Missing required environment variables after secret load.');
    }

    console.log('Fetching access token...');
    const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN);

    console.log('Checking extension status...');
    await checkStatus(accessToken, PUBLISHER_ID, EXTENSION_ID);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();