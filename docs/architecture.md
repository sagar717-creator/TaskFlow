# TaskFlow architecture

TaskFlow is a Vite-powered vanilla JavaScript frontend backed by Firebase Authentication and Cloud Firestore. Firebase Auth handles Google identity and display-name updates. Firestore stores private user profiles, projects, and tasks; the data adapter scopes every path to `users/{uid}` and listens to project/task collection snapshots for cross-tab and cross-device refresh. Before sign-in, the same workspace UI opens with a browser-local sample workspace.

```text
Browser UI
  ├── Firebase Authentication (Google sign-in)
  └── Cloud Firestore database: (default) / asia-south1
       └── users/{uid}
            ├── projects/{projectId}
            └── tasks/{taskId}
```

Vite serves the root `index.html`, bundles the Firebase npm SDK, and loads local configuration from `.env.local`.

## Main modules

- `app/static/js/firebase.js`: app config, Auth provider, auth-state listener, and private profile reads/writes.
- `app/static/js/data.js`: seed data, user-scoped Firestore paths, CRUD, collection listeners, reset, import, and export.
- `app/static/js/app.js`: the dashboard, projects, board, tasks, calendar, analytics, settings, and Google sign-in/profile setup.
- `firestore.rules`: owner-scoped data access and document validation.

## Authentication and first run

Google sign-in creates or reuses the Firebase Auth account. When the user's profile document is missing, TaskFlow asks what name to display and whether to create the sample workspace. On save, the display name is written to Firebase Auth and the user's private Firestore profile. If the user opts in, 3 sample projects and 18 sample tasks are written to that UID's collections. Those records persist in Firestore until changed or deleted.

## Data lifecycle

Project deletion explicitly removes that project's tasks in a Firestore batch because Firestore does not cascade nested records. Reset demo data deletes the current user's task/project documents, then writes the starter set again. It does not affect other users.
