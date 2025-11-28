import fs from 'fs-extra';

export async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string, fetchFn: typeof fetch = global.fetch) {
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

export async function getStoreListing(accessToken: string, extensionId: string, fetchFn: typeof fetch = global.fetch) {
    const listingUrl = `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/listings`;

    const response = await fetchFn(listingUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-api-version': '2',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to get store listing: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data;
}

export async function uploadExtension(accessToken: string, extensionId: string, zipPath: string, fetchFn: typeof fetch = global.fetch, fsFn: typeof fs = fs) {
    const uploadUrl = `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`;
    const zipStream = fsFn.createReadStream(zipPath);

    const response = await fetchFn(uploadUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-api-version': '2',
        },
        body: zipStream as any,
        duplex: 'half'
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to upload extension: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data;
}

export async function publishExtension(accessToken: string, extensionId: string, fetchFn: typeof fetch = global.fetch) {
    const publishUrl = `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`;

    const response = await fetchFn(publishUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-api-version': '2',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to publish extension: ${response.status} ${text}`);
    }

    const data = await response.json();
    return data;
}

export async function updateStoreListing(accessToken: string, extensionId: string, description: string, promotionalText: string, fetchFn: typeof fetch = global.fetch) {
    const updateListingUrl = `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/listings/en-US`; // Assuming en-US
    const updateListingResponse = await fetchFn(updateListingUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-goog-api-version': '2',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fullDescription: description,
            promotionalText: promotionalText,
        }),
    });
    
    if (!updateListingResponse.ok) {
        const errorText = await updateListingResponse.text();
        throw new Error(`Failed to update CWS listing description: ${updateListingResponse.status} ${errorText}`);
    }
    
    return await updateListingResponse.json();
}
