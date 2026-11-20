# OWASP ZAP baseline scan

A baseline scan tests the running application from the outside, the way an attacker would first look at it. ZAP follows the links on the site and checks every response for missing headers, unsafe cookies, information leaks, and similar problems, without sending attack payloads.

## How the scan was run

- **Date:** 20 November 2026
- **Tool:** ZAP 2.17.0, official Docker image `ghcr.io/zaproxy/zaproxy:stable`
- **Target:** the application running locally with `npm run dev`, against the development database
- **Command:**

  ```bash
  docker run --rm -v "<folder for the reports>:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py -t http://host.docker.internal:5000 -m 2 -r zap-report.html -J zap-report.json \
    -z "-config spider.postForm=false -config spider.processForm=false"
  ```

- **Not run:** an active scan. It would send attack payloads through every form, which would create accounts in the Firebase project that development and production share, and trip the rate limits.

### The scanner submitted forms

The `spider.postForm` and `spider.processForm` options did not stop ZAP from posting the forms it found. Without a login, it posted to login, registration, password reset, report deletion, and the feedback form. Afterwards the development database and Firebase were checked: no account, profile, or report had been created, and the report it tried to delete still existed.

| Form | Why nothing changed |
|---|---|
| Delete a report | 401: deleting needs a verified login ([`report-access.js`](../../src/middleware/report-access.js)) |
| Register `zaproxy@example.com` | No Firebase account or profile was created. Registration checks the form before contacting Firebase ([`forms.js`](../../src/validation/forms.js)), and the values ZAP filled in did not pass |
| Login | 401: the account does not exist, logged as `login.failed` |
| Password reset | The neutral notice. Firebase sends no email to an address without an account |
| Feedback | 404: the route does not exist |

A scan of the deployed site must exclude these forms through a ZAP context file (`-n`), because a successful registration there would create a real account.

## Results

**0 failures and 60 passed checks.** Among them: Content Security Policy, HSTS, clickjacking protection, `X-Content-Type-Options`, cookie flags, and no server version or stack traces in responses.

The first scan raised 9 warnings. Two were real and are fixed. The rest are either informational or cannot be fixed without breaking a feature.

| Finding | Risk | Decision |
|---|---|---|
| Storable and cacheable content | Informational | **Fixed.** Pages can show the user's name and always carry a CSRF token, so every page now sends `Cache-Control: no-store`. Static files stay cacheable. [`security-headers.js`](../../src/middleware/security-headers.js) |
| Permissions Policy header not set | Low | **Fixed.** `Permissions-Policy` now switches off the camera, microphone, location, payment, USB, and motion sensors, which the site never uses |
| Cross-Origin-Embedder-Policy missing | Low | **Accepted.** COEP would block the Google Maps frame, which does not send the header that allows it to be embedded that way |
| Cookie poisoning (`_csrf`) | Informational | **False positive.** A submitted `_csrf` value is never copied into the cookie. Proved by a test in [`csrf.test.js`](../../tests/Jest/csrf.test.js) |
| User-controllable HTML attribute (`_csrf`) | Informational | **False positive.** The hidden field holds the token the server issued, not the submitted value, and EJS escapes it. Proved by a test in [`csrf.test.js`](../../tests/Jest/csrf.test.js) |
| Suspicious comments | Informational | **False positive.** ZAP matched the word "from" in two code comments |
| Modern web application, authentication request identified, session management response identified | Informational | **No action.** ZAP notes what it found, so a full scan could be configured |

After the fixes, a second scan reported 8 warnings, all of them from the table above that are accepted, false positives, or informational.

## Repeating the scan

Run the command above while `npm run dev` is running. Reports are written to the mounted folder. Do not commit them: they contain CSRF tokens and request details. After deployment, scan the Render site the same way, with a context file that excludes the forms, to confirm the findings that only differ over HTTPS, such as the `Secure` cookie flag.
