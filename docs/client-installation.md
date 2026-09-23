# GYM ERP client installation guide

This guide installs the Windows hub and makes the same local HTTPS website
available to phones on the gym's private Wi-Fi network.

## 1. Prepare the client PC

Use a Windows 10/11 PC that stays powered on during gym hours. Connect it to
the private gym Wi-Fi or wired LAN. Do not use a guest Wi-Fi network that
blocks device-to-device traffic.

Install:

- Node.js 20 or newer from https://nodejs.org/
- Python 3.10 or newer from https://www.python.org/downloads/ (required for local face recognition)
- Git, if installing directly from GitHub

During Python setup, enable **Add Python to PATH**.

## 2. Download the application

Open Command Prompt and run:

```cmd
cd /d C:\Apps
git clone https://github.com/raoanasjarar/gym-erp.git
cd gym-erp
```

Alternatively, download the repository ZIP, extract it to a permanent folder,
and open Command Prompt in that folder.

Do not place the application inside OneDrive, a temporary Downloads folder, or
an antivirus-controlled location that may lock the database.

## 3. Install and configure

Run:

```cmd
scripts\install-gym-erp.cmd
```

This installs workspace dependencies, downloads the local face models, creates
desktop and Windows Startup shortcuts, and prepares the runtime. Approve the
Windows Firewall prompt for **Private networks** only.

The installer does not copy any developer database or credentials. The client
database is created locally under:

```text
%LOCALAPPDATA%\GYM ERP\data
```

## 4. Start the hub

Double-click **GYM ERP** on the desktop, or run:

```cmd
scripts\open-gym-erp.cmd
```

The server creates a local HTTPS certificate and prints addresses similar to:

```text
App:    https://localhost:5178
Mobile: https://192.168.1.20:5178
```

Complete the first-run wizard and create the owner's username and password.
There is no universal default password.

## 5. Connect phones

1. Connect each phone to the same private Wi-Fi as the hub PC.
2. Open the printed `https://LAN-IP:5178` address.
3. Accept the local certificate warning, or install `gym-erp.cer` from
   `%LOCALAPPDATA%\GYM ERP\data\certs` on managed devices.
4. Sign in with the gym account.
5. Open **Settings → Mobile connection** and scan the displayed QR code.
6. Use the browser menu's **Add to Home screen** option.
7. Allow camera permission when using face enrollment or face check-in.

The HTTPS URL is required for mobile camera access. The desktop remains the
authoritative local database and must stay running for LAN access.

## 6. Verify the installation

Check all of the following:

- The desktop opens at `https://localhost:5178`.
- A phone opens the HTTPS LAN URL over gym Wi-Fi.
- Login works on desktop and phone.
- The QR code in Settings opens the same LAN URL.
- Camera permission works on a phone.
- A test member, membership, payment, receipt, and attendance record can be
  created.
- A backup can be created from **Backups**.

## 7. Optional fingerprint scanner

Fingerprint support is disabled unless a vendor bridge is configured. Install
the scanner manufacturer's SDK and a bridge executable on the hub PC. Set:

```cmd
setx GYM_ERP_FINGERPRINT_COMMAND "C:\GymERP\fingerprint-bridge.exe"
```

Restart GYM ERP after setting the variable. The bridge must be a long-running
process that reads one JSON request per stdin line and writes one JSON response
per stdout line. Its required operations and response fields are documented in
`docs\handover.md`.

In the Members screen, enable **Enroll fingerprint after saving** for a member.
Use **Check by fingerprint** to listen for a matching finger in real time.

## 8. Backups and support

Create regular backups from **Backups** and copy them to an encrypted external
drive. Never commit or upload the database, member photos, biometric templates,
certificates, or `.env` files to GitHub.

For a changed LAN address, restart GYM ERP. It regenerates the certificate SAN
list and prints the new HTTPS URL. If phones cannot connect, confirm the
Windows network is Private and allow Node.js through Windows Firewall.
