# GYM ERP handover status

## Ready

- Offline desktop hub with automatic SQLite initialization
- First-run gym and administrator setup
- Members, memberships, payments, expenses, income, attendance, staff, reports, backups, and RBAC
- Equipment records with maintenance status, audit log, diagnostics, and member CSV export
- Local desktop camera enrollment and face check-in with encrypted local templates
- Automatic camera capture waits for a bright, sharp, stable frame before saving
- Members can use the live face membership scanner; it continuously checks the selected
  camera and opens the matching member profile and payment status automatically
- Member photos/weight, membership days remaining, and expired-membership dashboard alerts
- Members cards display the locally captured enrollment photo; new members can receive
  their first plan and payment in the same save operation
- Saving an initial payment or renewal creates the local receipt and opens WhatsApp
  with a pre-filled receipt message for the member
- Local sync hub with push, pull, conflict parking, and device registration
- Face-recognition abstraction backed by local OpenCV YuNet detection and SFace embeddings
- Python OpenCV YuNet + SFace local model bridge is included; models are installed by `install-gym-erp.cmd`
- Optional fingerprint attendance through a configurable vendor bridge (the bridge
  reads/writes one JSON object per line and can wrap any Windows scanner SDK)
- Mobile offline queue and hub synchronization client
- Workspace type checks, lint, and tests passing

## Customer launch

The current source handover can be installed on a Windows development machine with:

1. Run `scripts\install-gym-erp.cmd`.
2. Approve the shortcut setup when prompted.
3. Double-click the `GYM ERP` desktop shortcut.
4. The server starts in the background and the browser opens `https://localhost:5178`.
5. Complete the first-run wizard.

The installation also creates a `GYM ERP` shortcut in the Windows Startup
folder. After the user signs in to Windows, the local server starts
automatically. The desktop shortcut can then be used to open the browser.

The `handover` folder is a clean source package. It does not include the
developer machine's database, login, session tokens, member photos, face
templates, backups, generated HTTPS certificate, `node_modules`, or test data.
The client PC creates those locally on first installation under
`%LOCALAPPDATA%\GYM ERP`.

### Mobile over the gym Wi-Fi

The same desktop website is available to phones on the same private Wi-Fi
network. Start GYM ERP on the desktop, read the `Mobile:` address printed by the
server (for example `https://192.168.1.20:5178`), and open that address on the
phone. Sign in with the gym account, then use the browser menu's **Add to Home
screen** option; the new GYM ERP icon opens the responsive website directly.
The desktop remains the authoritative local database, so mobile changes use the
existing local sync hub while the web UI uses the same authenticated API.
Allow the Windows Firewall prompt for Node.js/private networks. Do not expose
the port on public Wi-Fi or internet.

### Mobile camera permissions

The launcher now creates a local HTTPS certificate and serves the app over
HTTPS, so the phone can enter a secure context and request camera access.
Because this certificate is generated locally, the first visit may show a
certificate warning; continue to the site or install/trust the certificate on
the private gym devices. Choose **Allow** when the browser asks for camera
access. If it was denied, open the browser site settings, set **Camera** to
**Allow**, reload the page, and also check the phone's browser permission in
the phone Settings app. The app reports whether the problem is insecure HTTP,
denied permission, a missing camera, or a camera already in use.

### Sending receipts on WhatsApp

When a membership payment or renewal is saved, the receipt is created in the
local database first. GYM ERP then opens `https://wa.me` with the member's
phone number and a pre-filled message containing the receipt number, member,
plan, amount, and validity date. Staff only need to tap **Send** in WhatsApp.
The member record must contain a WhatsApp-compatible phone number, including
the country code when needed. The browser or WhatsApp must be available on the
device; GYM ERP does not send messages silently or use an external WhatsApp API.

The installer downloads the YuNet face detector and SFace face-embedding models
into `models\face` and installs the Python OpenCV runtime. Facial data remains
local; the Python worker does not call a cloud service.

### Using an external camera

The desktop app supports any Windows-compatible USB webcam. Plug the camera
into the gym PC before opening the app, allow camera access when Windows or the
browser asks, and select the camera from the **Camera** dropdown in the face
capture window. A 1080p USB webcam is recommended; no special driver or
fingerprint hardware is required. If the camera is not listed, close other
camera applications, reconnect the USB cable, and restart the GYM ERP shortcut.

### Optional fingerprint scanner

Fingerprint hardware is disabled by default. Install a vendor bridge program on
the hub PC and set `GYM_ERP_FINGERPRINT_COMMAND` to its executable command
before launching GYM ERP. The bridge must remain running and implement these
JSON-line operations:

```json
{"operation":"connect"}
{"operation":"status"}
{"operation":"deviceInfo"}
{"operation":"enroll"}
{"operation":"identify"}
{"operation":"verify","templateId":"..."}
{"operation":"deleteTemplate","templateId":"..."}
{"operation":"disconnect"}
```

Each response must be one JSON line with `{"ok":true}`. `enroll` must also
return `templateId` and base64 `templateBase64`; `identify` must return
`memberTemplateId` and a numeric `score`. In Members, select **Enroll
fingerprint after saving** for a member, then choose **Check by fingerprint** to
keep the scanner listening in real time. Do not enable this option until the
bridge has been tested with the exact scanner model.

This is a source handover launcher, not a customer-grade signed installer. A
production Windows installer must bundle Node.js (or replace the runtime with a
packaged desktop runtime), register the application, create a shortcut, and
configure automatic startup.

## APK status

No APK is included because the repository does not yet contain a native Android
project and this build environment has no JDK, Android SDK, Gradle, or signing
keystore. The mobile TypeScript synchronization layer is tested, but it is not
an installable Android application by itself. Do not hand the current mobile
workspace to the gym as an APK.

## Required final release work

- Create the native Android shell and screens.
- Add native Android SQLite and camera/photo adapters.
- Build and test debug and release APKs on a physical device.
- Configure a release keystore outside source control.
- Package the desktop runtime as a signed Windows installer.
- Complete dependency/security remediation before production distribution.
- Test the local face model against real gym lighting/camera conditions and tune the matching threshold before production use.
