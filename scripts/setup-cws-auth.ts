export interface SetupAuthOptions {
    deps?: {
        log?: typeof console.log;
    };
}

export function setupAuth(options: SetupAuthOptions = {}) {
    const { deps = {} } = options;
    const log = deps.log || console.log;

    log(`
To check the status of your Chrome Web Store listing, you need to configure OAuth2 credentials.

Please follow these steps to obtain the required environment variables:

1.  **Enable the Chrome Web Store API**
    - Go to the Google Cloud Console: https://console.developers.google.com/
    - Create a project or select an existing one.
    - Search for "Chrome Web Store API" and enable it.

2.  **Configure OAuth Consent Screen**
    - Go to "APIs & Services" > "OAuth consent screen".
    - Select "External" (or Internal if applicable) and create.
    - Fill in the required fields (App name, User support email, Developer contact info).
    - Add your email to "Test users" if the app is in testing mode.

3.  **Create OAuth Client ID**
    - Go to "APIs & Services" > "Credentials".
    - Click "Create Credentials" > "OAuth client ID".
    - Application type: "Web application".
    - Name: e.g., "CWS Status Checker".
    - **Authorized redirect URIs**: Add "https://developers.google.com/oauthplayground".
    - Click "Create".
    - Copy the **Client ID** and **Client Secret**.

4.  **Get Refresh Token**
    - Open the OAuth 2.0 Playground: https://developers.google.com/oauthplayground
    - Click the generic gear icon (Settings) in the top right.
    - Check "Use your own OAuth credentials".
    - Enter your **OAuth Client ID** and **OAuth Client Secret**.
    - Close the settings.
    - In "Step 1: Select & authorize APIs", input the scope:
      \`https://www.googleapis.com/auth/chromewebstore\`
    - Click "Authorize APIs".
    - Log in with the Google account that owns the extension or is a group publisher member.
    - In "Step 2: Exchange authorization code for tokens", click "Exchange authorization code for tokens".
    - Copy the **Refresh Token**.

5.  **Run the script**
    Set the environment variables and run the check script:

    export CWS_CLIENT_ID="your_client_id"
    export CWS_CLIENT_SECRET="your_client_secret"
    export CWS_REFRESH_TOKEN="your_refresh_token"
    # Optional if defaults are incorrect:
    # export CWS_PUBLISHER_ID="your_publisher_id"
    # export CWS_EXTENSION_ID="your_extension_id"

    npm run check-store-status
`);
}

if (require.main === module) {
    setupAuth();
}
