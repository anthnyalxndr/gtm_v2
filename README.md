# GTM API v2 Service

A TypeScript service for accessing and managing Google Tag Manager (GTM) accounts via the Tag Manager API v2.

## Prerequisites

- Node.js 18.0.0 or higher
- A Google account with access to Google Tag Manager

## Setup

### 1. Create and Configure a Project in the Google API Console

Follow the official Google Tag Manager API v2 developer guide to set up your project:

**[Follow the setup instructions here](https://developers.google.com/tag-platform/tag-manager/api/v2/devguide)**

The guide will walk you through:
- Creating a project in the Google API Console
- Enabling the Tag Manager API
- Creating OAuth 2.0 credentials (select "Desktop app" for **Application type**)
- Downloading your `client_secrets.json` file

### 2. Install Dependencies

```bash
npm install
```

### 3. Place Your Credentials

Place your downloaded `client_secrets.json` file in the root directory of this project. 

You can use `client_secrets.json.example` as a reference for the expected file structure.

## Quick Start

### Authentication

The service uses OAuth 2.0 authentication with an automated local server flow. When you first run the code, it will:

1. Start a local server on port 8080 to receive the OAuth callback
2. Automatically open your browser to the Google authorization page
3. After you authorize, Google redirects back to the local server which captures the authorization code
4. Save your credentials to `tagmanager.token.json` for future use

**Note**: If the browser doesn't open automatically, copy the URL from the terminal.

### Example: List All Accounts

```typescript
import { getGtmService } from "./src/gtm_v2.js";

// Get an authenticated service (will prompt for browser authentication on first run)
const service = await getGtmService();

// List all accounts the authenticated user has access to
const response = await service.accounts.list();
const accounts = response.data.account || [];

console.log("Available Tag Manager Accounts:");
for (const account of accounts) {
  console.log(`  - ${account.name} (ID: ${account.accountId})`);
  console.log(`    Path: ${account.path}`);
  console.log();
}
```

### Running the Example

**Development** (run TypeScript directly):

```bash
npm run dev
```

This will run `example.ts`, which demonstrates listing all GTM accounts.

**Production** (compile first, then run):

```bash
npm run build
npm start
```

Or run the compiled output directly:

```bash
node dist/gtm_v2.js
```

On first run, you'll be prompted to authenticate via your browser. Subsequent runs will use the saved credentials automatically.

## API Reference

For detailed API documentation, see the [Google Tag Manager API v2 Reference](https://developers.google.com/tag-platform/tag-manager/api/v2/reference).

## Important Notes

⚠️ **Use a test account**: When performing destructive operations using the API, there are no warnings, confirmations, or undo options. Always test your code with a test account before working with active accounts.

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
