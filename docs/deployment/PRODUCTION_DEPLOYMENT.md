# Production Deployment Overview

This document keeps deployment guidance intentionally high level. Environment-specific commands, server addresses, credentials, keys, backup locations, and emergency runbooks should stay outside the public repository.

## Principles

- Deploy from reviewed code only.
- Keep secrets in the server environment, not in the repo.
- Install frontend dependencies from the lockfile with `npm ci`.
- Run database migrations before restarting the app when backend models changed.
- Build frontend assets after dependency installation.
- Collect static files through the configured Django storage backend.
- Keep a private rollback plan and database backup process outside this repository.

## Standard Order

1. Pull reviewed code on the deployment host.
2. Install backend dependencies if `requirements.txt` changed.
3. Install frontend dependencies with `npm ci`.
4. Build the frontend.
5. Run Django migrations.
6. Collect static files.
7. Restart the app process.
8. Smoke test the public pages, login, story viewing, comments, and checkout-critical paths.

## What Not To Commit

- Server IPs, SSH details, key fingerprints, or account names.
- Production database snapshots or row-level audits.
- Emergency one-off commands.
- Local `.env`, `settings.ini`, or copied production config.
- Private migration notes that include real users or operational history.
