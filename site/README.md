# AHS — Aruvi Housing Solutions

A small installable web app for managing project progress, client payments, expenses, bank and petty cash balances, bag inventory, partner contributions, and reports. Data is stored in the browser on the device; no account or server is required. To use Android, host this folder on an HTTPS site and open it in Chrome, then use **Install app** / **Add to Home screen**.

## Google Drive access and 24-hour backups

Drive is both the shared sync store and the backup destination. AHS keeps one `AHS shared data.json` file in Drive; devices poll it for updates and save changes back to it. Excel backups are separate `.xlsx` files in `AHS Backups`. Both devices must connect the same Google account and use the same hosted AHS address. The business owner should create the OAuth client while signed into **aruvihousingsolutions@gmail.com**:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project.
2. Enable **Google Drive API** for that project.
3. Configure the OAuth consent screen. For a private internal app, choose External and add `aruvihousingsolutions@gmail.com` as a test user while the app remains in testing.
4. Create an OAuth client ID of type **Web application**. Add the exact deployed HTTPS origin under **Authorized JavaScript origins** (for example `https://your-site.example`). No redirect URL is needed.
5. Copy the client ID (`…apps.googleusercontent.com`), enter it in AHS Dashboard, then choose **Connect Drive** and sign in with `aruvihousingsolutions@gmail.com`. Grant the requested Drive file access.

Enter the same OAuth client ID in AHS on desktop and Android. Both devices should sign in as `aruvihousingsolutions@gmail.com`. AHS checks Drive for changes every 30 seconds and uploads edits shortly after they are saved. On first connection, the existing Drive data takes precedence when it is newer; otherwise AHS uploads the local data. Avoid editing on both devices at precisely the same time; the most recently saved snapshot wins. Reconnect if Google authorization expires. Keep a separate copy of the OAuth client ID; it is configuration, not business data.

Manual backups create readable `.xlsx` files in the Drive `AHS Backups` folder when connected, or download to the device when disconnected. Automatic `.xlsx` backups are attempted every 24 hours while AHS is open and Drive authorization is active. Browser apps cannot run scheduled work after they have been closed; open AHS to resume checks.

## Local use

Host this folder at an HTTPS address accessible to your desktop and Android. Open that same address in the desktop browser; on Android Chrome, open it and select **Install app** / **Add to Home screen**. A local `file://` open is not suitable for shared sync or PWA installation. Project-wise and filtered account/date-range transaction PDFs are generated from Dashboard Reports. The workbook restore action replaces the device data after confirmation; connect Drive afterward to share the restored data with the other device.

## Notes

The included icon and visual direction use the uploaded Aruvi logo and dashboard reference. XLSX and PDF export libraries load from public CDNs, so export/report features require an internet connection. Data is stored in the connected Google Drive account and locally cached on each device.
