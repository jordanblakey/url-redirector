#!/usr/bin/env node

const CLIENT_ID = process.env.CWS_CLIENT_ID;
const CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN;
const PUBLISHER_ID = process.env.CWS_PUBLISHER_ID || 'c173d09b-31cf-48ff-bd4b-270d57317183';
const EXTENSION_ID = process.env.CWS_EXTENSION_ID || 'jhkoaofpbohfmolalpieheaeppdaminl';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Error: Missing required environment variables: CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN');
  console.error('Please run "npm run setup-store-auth" for instructions on how to obtain these values.');
  console.error('Or set them directly if you already have them.');
  process.exit(1);
}

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function checkStatus(accessToken) {
  // Using Chrome Web Store API V2 to fetch detailed status including published and submitted versions.
  // Documentation: https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/fetchStatus
  const fetchStatusUrl = `https://chromewebstore.googleapis.com/v2/publishers/${PUBLISHER_ID}/items/${EXTENSION_ID}:fetchStatus`;

  const response = await fetch(fetchStatusUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
     const text = await response.text();
     throw new Error(`Failed to fetch status: ${response.status} ${text}`);
  }

  const data = await response.json();
  console.log('Chrome Web Store Extension Status:');
  console.log(JSON.stringify(data, null, 2));
}

(async () => {
  try {
    console.log('Fetching access token...');
    const accessToken = await getAccessToken();
    console.log('Checking extension status...');
    await checkStatus(accessToken);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
