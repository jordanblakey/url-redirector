#!/usr/bin/env node
import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';

const CWS_CLIENT_ID = process.env.CWS_CLIENT_ID;
const CWS_CLIENT_SECRET = process.env.CWS_CLIENT_SECRET;
const CWS_REFRESH_TOKEN = process.env.CWS_REFRESH_TOKEN;
const CWS_EXTENSION_ID = process.env.CWS_EXTENSION_ID;

if (!CWS_CLIENT_ID || !CWS_CLIENT_SECRET || !CWS_REFRESH_TOKEN || !CWS_EXTENSION_ID) {
    throw new Error('CWS environment variables are not set.');
}

const oauth2Client = new google.auth.OAuth2(
    CWS_CLIENT_ID,
    CWS_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: CWS_REFRESH_TOKEN });

const webstore = google.chromewebstore({
    version: 'v1.1',
    auth: oauth2Client,
});

async function updateCwsDescription() {
    try {
        console.log('📝 Updating CWS description...');

        // 1. Get version and release notes
        const packageJson = fs.readJsonSync(path.resolve(__dirname, '../package.json'));
        const version = packageJson.version;
        const releaseNotes = fs.readFileSync(path.resolve(__dirname, '../metadata/recent_updates.txt'), 'utf-8');

        // 2. Get existing store listing
        const res = await webstore.items.get({ itemId: CWS_EXTENSION_ID });
        let description = res.data.description || '';

        // 3. Determine version type and update description
        const isPatch = version.split('.')[2] !== '0';
        const newInHeader = '## New in this version';

        if (description.includes(newInHeader)) {
            const parts = description.split(newInHeader);
            if (isPatch) {
                description = `${parts[0]}${newInHeader}\n\n${releaseNotes}\n\n${parts[1]}`;
            } else {
                description = `${parts[0]}${newInHeader}\n\n${releaseNotes}`;
            }
        } else {
            description = `${description}\n\n${newInHeader}\n\n${releaseNotes}`;
        }

        // 4. Update store listing
        await webstore.items.update({
            itemId: CWS_EXTENSION_ID,
            requestBody: {
                description: description,
            },
        });

        console.log('✅ CWS description updated successfully.');

    } catch (error) {
        console.error('❌ Failed to update CWS description:', error);
        process.exit(1);
    }
}

updateCwsDescription();
