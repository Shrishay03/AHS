# AHS Windows desktop app

The installer is built by the GitHub Actions workflow named **Build AHS Windows app**.

## Install

1. Open the AHS GitHub repository and select **Actions**.
2. Open the latest **Build AHS Windows app** run.
3. Download the **AHS-Windows-Installer** artifact and extract it.
4. Run `AHS-Setup-1.0.1.exe` and follow the setup prompts.

## Local data

Desktop app records are written to a JSON file in the Windows application data folder, separate from browser storage and browser cache. Uninstalling the app normally leaves this data file in place. Keep using the in-app Backup and Restore controls to create readable Excel backups.

The desktop app does not sync with the website or other computers. The app uses internet access for Google-hosted PDF and Excel libraries and for optional external help links.
