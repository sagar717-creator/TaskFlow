# Firestore rules prototype review

The rules deny every path by default, scope profile/projects/tasks to the authenticated UID, keep profile PII private, validate allowed fields and field sizes on creates and updates, and make document IDs/owners/creation times immutable. Reads use only the owner-scoped collections listed in `firestore-data-model.md`.

## Manual attack review

- Public unauthenticated collection read: denied by default.
- Cross-user profile/task/project read or write: denied by UID path check.
- Oversized titles, descriptions, names, URLs, or tag arrays: denied by field-size checks.
- Unknown field injection and missing required fields: denied by strict key allowlists and required-field checks.
- Owner UID, document ID, or creation-time rewrite: denied by immutable-field checks.
- Profile role/admin escalation: no role field is accepted.
- Orphaned subcollection access: denied when the parent profile document does not exist.
- Query mismatch: UI only lists each owner-scoped subcollection, which matches its rules.

Firebase CLI compiled the rules successfully and deployed them to the `taskflow` database in project `taskflow-2ae87`. These are reasoned checks, not a substitute for emulator-based adversarial tests. The rules are a prototype and still need a review before public launch.
