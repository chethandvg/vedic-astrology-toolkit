# Security policy

## Supported versions

Security fixes go into the latest release and the live web app at https://chethandvg.github.io/vedic-astrology-toolkit/. Older releases are not patched.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through GitHub:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability** (private vulnerability reporting).

Include what you found, how to reproduce it, and its possible impact. You can expect an acknowledgement within 7 days and a status update within 30 days. Please give a reasonable time to fix the problem before disclosing it publicly; you will be credited in the fix unless you prefer otherwise.

## Scope

- **Web app:** runs entirely in your browser. Birth details are stored only in that browser's local storage and are never sent to a server. Relevant reports include cross-site scripting, problems with the service worker or offline cache, and anything that could leak stored profiles.
- **Python toolkit:** a local command-line tool and library. Relevant reports include unsafe handling of input files.
- **Build and CI:** GitHub Actions workflows and dependencies.

Astrological accuracy questions are not security issues; please open a normal issue for those.
