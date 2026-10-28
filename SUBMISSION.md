# Submission notes

Frontend implementation of the three tickets in [`tickets/`](tickets/). The Java backend and the API contract are unchanged.

## Run and check

```sh
export JAVA_HOME="/path/to/jdk-25"
npm ci
npm run dev:app                          # frontend :3000, backend :8080
npm run quality                          # lint, typecheck, dependency rules, DS tests, DS build
npm test --workspace frontend            # unit and component tests (Vitest + MSW)
npx playwright install chromium
npm run test:e2e --workspace frontend    # end-to-end tests against the real backend
```

After five failed sign-ins the API blocks the IP for 15 minutes; restart the backend to reset it.

## What was built

- **TICKET-001, registration**: email, password and confirmation; the API's validation rules mirrored on the client; field, duplicate-email, rate-limit, network and unexpected errors; a confirmation with a sign-in link. A checklist shows each password rule as it is met.
- **TICKET-002, sign-in**: required-field validation; one generic message for rejected credentials; the email is kept; pending state and duplicate-submit protection; navigation to the journey URL returned by the API.
- **TICKET-003, save and resume**: session guard, start or resume from the real draft, every saved answer filled in, Save and Continue through the API with the form version, a saved state shown only after the API confirms, and clear handling of expired sessions, version conflicts (409), rejected data (422), network failures and timeouts. Sign-out, required-field validation on Continue, and a warning before leaving with unsaved changes.

## Where things are

| Path                              | Contents                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/routes.ts`          | URL → route file. Start here.                                                                                           |
| `frontend/src/api/`               | JSON:API client, typed errors, one function per endpoint (named after OpenAPI `operationId`s). No React.                |
| `frontend/src/routes/<section>/`  | Route files handle loading, navigation and errors; `_components/` render; `_utils/` and `_hooks/` hold section helpers. |
| `frontend/src/_utils/`, `_hooks/` | Helpers shared by more than one section.                                                                                |
| `frontend/e2e/`                   | Playwright tests.                                                                                                       |
| `DS/`                             | Shared components; changed only where needed (see below).                                                               |

## Main decisions

- **Reads in `clientLoader`, writes with TanStack Query `useMutation`.** Loaders redirect on 401 before rendering and always read from the API; mutations give pending, error and success states without extra code.
- **One request client.** It sets the JSON:API media type (without parameters, which the API rejects), sends the session cookie, copies the `XSRF-TOKEN` cookie into `X-XSRF-TOKEN` on writes, applies a 15 s timeout, accepts a loader's abort signal, and validates responses with zod.
- **Typed errors** (`ApiError`, `NetworkError`, `UnexpectedResponseError`). Each screen decides its own wording from the status and error `code`, since a 401 means different things on sign-in and on save.
- **Open redirect protection.** Every navigation target from the API is parsed with `URL` and must stay on the same origin (`//evil` and `/\evil` are rejected).
- **The session guard is navigation, not security.** The layout loader asks the API (the session cookie is `HttpOnly`) and revalidates on every navigation; the API still authorizes every request.
- **Sign-out is a `<Form>` action on `/sign-out`.** The unsaved-changes prompt therefore runs before the session is revoked, and visiting the URL does not sign anyone out.
- **No optimistic UI.** Success messages depend on API confirmation; on failure the entered values are kept and the user can retry.
- **`returnTo` removed.** TICKET-002 asks to follow the API's journey URL, so the prototype's competing redirect was dropped.
- **Existing conventions kept**: function declarations, the prototype's layout and copy, explicit route config. Files moved to `_components/`, `_utils/` and `_hooks/` in dedicated refactor commits.

## Accessibility

- Errors are linked to their fields (`aria-describedby`, `aria-invalid`) and shown in one place; focus moves to the first invalid field, and to the confirmation heading after registration.
- Form-level errors use `role="alert"`, confirmations `role="status"`; pending buttons use React Aria's `isPending`.
- The pending indicator keeps text contrast (no reduced opacity) and stops spinning with `prefers-reduced-motion`.
- `autoComplete` on fields, visible date-format hints, and password rules stated in text, not by colour alone.
- jest-axe runs on every screen; flows were also checked with the keyboard and at 375 px width.

## Design system changes

- `TextField`: an `errorMessage` prop shown alongside `helperText` (previously the error replaced the hint).
- Fixed the error-message colour selector (`data-slot` → `slot`), which never matched.
- `Typography` accepts a `ref` (focus after a view change); `Button` shows a pending indicator.

## Out of scope and known limitations

- **Final submission is not wired.** The prototype's Submit button still opens the confirmation page without calling the API, so the draft stays a draft and the journey offers Resume. Submission is out of scope for TICKET-003.
- **Document evidence upload is not implemented** (no ticket). The form shows whether a document is already stored and does not require a file to continue.
- After an expired session, sign-in returns to the first incomplete step from the API, not necessarily the exact page that was open.
- The unsaved-changes prompt uses `window.confirm` with the project's only `eslint-disable` (`no-alert`); a dialog component in the DS would be the next step.
- Date fields stay text inputs with a format hint, as TICKET-003 excludes changing form fields.

## Backend observations (not changed)

- A non-UUID application id returns 500; the frontend checks the format and shows "not found" instead.
- Rate limiting is per IP, a successful sign-in resets it, and malformed (400) attempts are not counted.
- The password policy is also enforced at sign-in (400).
- Registration's 409 reveals whether an email is registered (required by the contract).
- Server-side bot protection (for example a self-hosted proof-of-work captcha) would need backend and contract changes.

## Existing code

- Fixed the reviewer page's pre-existing lint error so `npm run quality` passes, without changing behaviour.
- Not fixed: on the reviewer page, "Clear search and status" clears the field but leaves `q` in the URL.

## Verification

- Unit and component tests use MSW, so the real request code runs; pending states are asserted with held responses, not timers.
- Playwright tests run against the real backend, including save, sign out, sign in and see the saved answers again.
- Error cases were reproduced against the running backend, including two-tab version conflicts and a session ended from another tab.

## AI usage

Built with Claude Code. Architecture was discussed first, each commit was reviewed before it was made, and assumptions were checked against the running backend. Commits carry a `Co-Authored-By` trailer.
