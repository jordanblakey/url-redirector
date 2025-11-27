import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';

interface SecretManagerError extends Error {
  code?: number;
}

export async function loadGcpSecrets(projectId?: string, secretName?: string): Promise<dotenv.DotenvConfigOutput> {
  const client = new SecretManagerServiceClient();

  const finalProjectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'url-redirector-479005';
  const finalSecretName = secretName || process.env.GCP_SECRET_NAME || 'url-redirector-dotenv';
  const name = `projects/${finalProjectId}/secrets/${finalSecretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name });
    const secretPayload = version.payload?.data?.toString();

    if (!secretPayload) {
      throw new Error('Secret payload is empty');
    }

    const envConfig = dotenv.parse(secretPayload);
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
    return envConfig;

  } catch (error: unknown) {
    const err = error as SecretManagerError;
    if (
      err.message.includes('Could not load the default credentials') ||
      err.message.includes('no credentials found') ||
      err.code === 16 // gRPC status for UNAUTHENTICATED
    ) {
      console.error('\n\x1b[31m%s\x1b[0m', 'ERROR: Google Cloud Credentials not found or invalid.'); // Red text
      console.error('The script cannot access Secret Manager without authentication.');
      console.error('\nPlease run the following command to log in:');
      console.error('\x1b[36m%s\x1b[0m', '  gcloud auth application-default login'); // Cyan text
      console.error('\nOr set GOOGLE_APPLICATION_CREDENTIALS to your key file path.\n');
      process.exit(1); // Exit gracefully
    }

    throw error;
  }
}
