# Firebase setup

## Run the app

Install dependencies with `npm install`, then start Vite with `npm run dev`. Open the local URL it prints, normally `http://localhost:5173/`.

## Firebase web configuration

The project uses the web-app configuration supplied for `taskflow-2ae87`. Firebase web config is public client configuration; the API key is not an authorization boundary. Firestore Security Rules enforce per-user access. Never add a service-account JSON/private key to this frontend.

The app uses Vite and the modular Firebase JavaScript SDK installed from npm. Firebase recommends the npm workflow with a module bundler for web applications. Copy `.env.example` to `.env.local` and provide the Firebase Web app values there; Vite exposes only `VITE_` variables to the browser bundle.

## Enable sign-in providers

In Firebase Console → Authentication → Sign-in method, enable **Google** and **Email/Password**. TaskFlow provides Google OAuth, email/password registration and login, and password reset. New accounts are asked to choose the display name shown in their workspace. Add `localhost` to Authentication → Settings → Authorized domains for local use, without a protocol or port. Add the deployed host name there before publishing. These project authentication settings still need to be enabled in the console before sign-in can complete.

## Firestore database and rules

The app targets the **Standard `(default)`** database in `asia-south1` (Mumbai), so it can use the Firestore free quota on Spark. The database has been provisioned, and the rules and indexes below have been deployed to it. The former named Enterprise database `taskflow` was permanently deleted at the user's request:

```powershell
firebase deploy --only firestore --project taskflow-2ae87
```

The app's Firestore SDK uses the default database. Firestore collections/documents are created by the first successful app writes; they do not need to be added manually.

## Seed behavior

After Google sign-in, first-time setup asks for a display name and offers sample projects/tasks (selected by default). Selecting it writes 3 project documents and 18 task documents under that signed-in user's Firestore UID. These are persistent Firestore documents, not temporary fixtures. The user may edit or delete them. Choosing an empty workspace skips the seed. Settings → Reset demo data replaces that signed-in user's project and task collections with the sample set.

## Security Rules

`firestore.rules` is a prototype that denies unlisted paths, scopes data to the authenticated UID, validates document shapes, and keeps profile email/photo data private. Review and validate the rules in the Firestore Emulator before a public launch.
