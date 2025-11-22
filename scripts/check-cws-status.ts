import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';

// 2. Define a loader function
async function loadGcpSecrets() {
  // Initialize Client
  const client = new SecretManagerServiceClient();

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'url-redirector-479005';
  const secretName = process.env.GCP_SECRET_NAME || 'url-redirector-dotenv';
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    // Attempt to fetch the secret
    const [version] = await client.accessSecretVersion({ name });

    if (!version.payload || !version.payload.data) {
        throw new Error('Secret payload is empty');
    }

    // Decode payload to string
    const secretPayload = version.payload.data.toString();

    // Parse and inject
    const envConfig = dotenv.parse(secretPayload);
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }

  } catch (error: any) {
    // --- ADC GUARD CLAUSE ---
    // Check for common credential errors (Missing ADC, invalid paths, or gRPC Unauthenticated)
    if (
      error.message.includes('Could not load the default credentials') ||
      error.message.includes('no credentials found') ||
      error.code === 16 // gRPC status for UNAUTHENTICATED
    ) {
      console.error('\n\x1b[31m%s\x1b[0m', 'ERROR: Google Cloud Credentials not found or invalid.'); // Red text
      console.error('The script cannot access Secret Manager without authentication.');
      console.error('\nPlease run the following command to log in:');
      console.error('\x1b[36m%s\x1b[0m', '  gcloud auth application-default login'); // Cyan text
      console.error('\nOr set GOOGLE_APPLICATION_CREDENTIALS to your key file path.\n');
      process.exit(1); // Exit gracefully
    }

    // If it's a different error (e.g., Secret doesn't exist, Permission Denied), rethrow it
    throw error;
  }
}

// --- Helper Functions (Unchanged) ---
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

    // 5. Define constants ONLY after secrets are loaded
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
