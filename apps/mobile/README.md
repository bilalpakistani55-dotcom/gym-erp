# GYM ERP Android client

The mobile workspace currently contains the platform-independent Android domain
and synchronization layer. `MobileSyncClient` queues changes while offline,
pushes them to the local desktop hub, and pulls changes using a durable cursor.

## Native build status

This workspace does not yet contain a React Native/Expo Android project. It
therefore cannot produce an APK by running the current TypeScript build alone.
Before generating a customer APK, add the native shell and configure:

- React Native or Expo runtime
- Android SDK and build-tools
- JDK 17+
- Android application id and app icons
- SQLite adapter backed by the mobile queue
- Camera/photo storage adapter
- Release keystore and signing credentials

The native shell should call `MobileSyncClient` from a foreground sync action and
a background task, and store member photos in app-private storage before adding
their metadata to the sync payload. Never commit a keystore or signing secret.

## Hub endpoints

The desktop hub exposes:

- `POST /devices/register`
- `POST /sync/push`
- `GET /sync/pull?since=<ISO timestamp>`
- `GET /sync/status`

Every device request must include `X-Gym-Device`.
