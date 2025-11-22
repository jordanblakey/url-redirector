const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const dotenv = require('dotenv');

async function loadGcpSecrets(projectId, secretName) {
  const client = new SecretManagerServiceClient();

  const finalProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'url-redirector-479005';
  const finalSecretName = secretName || process.env.GCP_SECRET_NAME || 'url-redirector-dotenv';
  const name = `projects/${finalProjectId}/secrets/${finalSecretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name });
    const secretPayload = version.payload.data.toString();

    const envConfig = dotenv.parse(secretPayload);
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
    return envConfig;

  } catch (error) {
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

module.exports = { loadGcpSecrets };

// Allow running directly
if (require.main === module) {
  (async () => {
    try {
      console.log('Loading secrets from Google Cloud...');
      const secrets = await loadGcpSecrets();
      console.log('Successfully loaded secrets. Keys:', Object.keys(secrets).join(', '));
    } catch (error) {
      console.error('Failed to load secrets:', error);
      process.exit(1);
    }
  })();
}
