# TaskFlow

TaskFlow is a responsive project and task workspace with Google sign-in and per-user Cloud Firestore storage. The first screen preserves the original dark dashboard; guests can explore a locally saved sample workspace, and signing in enables Firebase sync.

## Run locally

From the repository root:

```powershell
npm install
npm run dev
```

Open the URL Vite prints (normally [http://localhost:5173/](http://localhost:5173/)).

## Firebase configuration

The local `.env.local` contains the Firebase Web app config and is ignored by Git. To set up another checkout, copy `.env.example` to `.env.local` and fill in the values from Firebase Console → Project settings → General → Your apps. A Firebase Web API key is client configuration; do not put service-account credentials in this app.

Enable Google under Authentication → Sign-in method, add `localhost` under Authentication → Settings → Authorized domains, and deploy the included Firestore rules:

```powershell
firebase deploy --only firestore --project taskflow-2ae87
```

The app targets the Standard `(default)` Firestore database in `asia-south1` (Mumbai) so the project can stay on Firebase Spark. Its security rules and indexes are deployed from this repository. The earlier named Enterprise database `taskflow` was removed at the user's request. The app uses per-user `users/{uid}/projects` and `users/{uid}/tasks` collections. New-account setup asks for a display name (defaults to Sagar) and optionally seeds persistent sample documents.

## Structure

```text
app/
  static/
    css/              # Design tokens and responsive interface styles
    js/               # Workspace UI, Firebase client, Firestore data layer
  templates/          # Existing static entry point
docs/                 # Architecture, setup, data model, and rules review
index.html             # Vite development entry point
vite.config.js
firebase.json
firestore.rules
firestore.indexes.json
```
