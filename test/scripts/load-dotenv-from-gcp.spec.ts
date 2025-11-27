import { test, describe } from '@playwright/test';
import { loadGcpSecrets } from '../../scripts/load-dotenv-from-gcp';
import { setSecretPayload } from './mocks/secret-manager';
import { expect } from '@playwright/test';

describe('loadGcpSecrets', () => {
    test('should load secrets and set env vars', async () => {
        const secretPayload = 'MY_SECRET=my_value';
        setSecretPayload(secretPayload);

        await loadGcpSecrets('test-project', 'test-secret');
        expect(process.env.MY_SECRET).toBe('my_value');
    });
});
