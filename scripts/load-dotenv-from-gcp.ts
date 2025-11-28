import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';

interface SecretManagerError extends Error {
  code?: number;
}

export interface LoadGcpSecretsOptions {
  deps?: {
    SecretManagerServiceClient?: typeof SecretManagerServiceClient;
    log?: typeof console.log;
    error?: typeof console.error;
    exit?: typeof process.exit;
  };
}

export async function loadGcpSecrets(
  projectId?: string,
  secretName?: string,
  options: LoadGcpSecretsOptions = {},
): Promise<dotenv.DotenvParseOutput | undefined> {
  const { deps = {} } = options;
  const Client = deps.SecretManagerServiceClient || SecretManagerServiceClient;
  // const log = (msg: string) => console.log(`[LoadSecrets] ${msg}`);
  const errorLog = deps.error || console.error;
  const exit = deps.exit || process.exit;

  const client = new Client();

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
    // --- ADC GUARD CLAUSE ---
    // Check for common credential errors (Missing ADC, invalid paths, or gRPC Unauthenticated)
    if (
      err.message.includes('Could not load the default credentials') ||
      err.message.includes('no credentials found') ||
      err.code === 16 // gRPC status for UNAUTHENTICATED
    ) {
      errorLog('\n\x1b[31m%s\x1b[0m', 'ERROR: Google Cloud Credentials not found or invalid.'); // Red text
      errorLog('The script cannot access Secret Manager without authentication.');
      errorLog('\nPlease run the following command to log in:');
      errorLog('\x1b[36m%s\x1b[0m', '  gcloud auth application-default login'); // Cyan text
      errorLog('\nOr set GOOGLE_APPLICATION_CREDENTIALS to your key file path.\n');
      exit(1); // Exit gracefully
      return;
    }

    // If it's a different error (e.g., Secret doesn't exist, Permission Denied), rethrow it
    throw error;
  }
}
