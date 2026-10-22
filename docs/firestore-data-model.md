# Firestore data model used by TaskFlow

The app uses the Standard `(default)` Firestore database in `asia-south1` (Mumbai) so the project can remain on Firebase Spark. The existing named `taskflow` Enterprise database is not targeted by this app. All application data is scoped below the authenticated user's UID. The UI loads the signed-in user's project and task collections when the workspace opens; CRUD writes are saved to Firestore.

```text
users/{uid}                 private profile
users/{uid}/projects/{id}   that user's projects
users/{uid}/tasks/{id}      that user's tasks
```

The profile stores the user's display name, email, optional Google photo URL, creation/update timestamps, and whether the starter workspace was seeded. Project and task records follow the fields documented in the UI specification and include `id`, `uid`, `created_at`, and `updated_at`. Task `project_id` references a project document within the same user's path. The client performs project deletion by deleting its tasks and project in one Firestore batch; Firestore does not cascade subcollections automatically.

## Seed data

On first sign-in, the setup screen offers **Start with sample projects and tasks** (selected by default). If selected, it writes three projects and 18 tasks into that user's Firestore collections. This is regular persisted database data, not temporary data: it remains until the user edits or deletes it. If not selected, the account starts empty. Reset demo data replaces the current user's projects and tasks with the sample set.

## Query inventory

- Realtime list snapshots: `users/{uid}/projects` and `users/{uid}/tasks`.
- One-time list reads when resetting: the same two subcollections.
- The app does not run `where`, `orderBy`, or `limit` Firestore queries; filtering and sorting happen in the UI after loading the private workspace collections.
