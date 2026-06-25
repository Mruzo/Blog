# Justvybz Documentation

This folder is intentionally compact. Public repo docs should help us remember the app shape and safe workflows without exposing production details, user data, credentials, server access, or one-off operational history.

## Current Docs

- [Production Deployment Overview](./deployment/PRODUCTION_DEPLOYMENT.md)
- [Run App From Here](./development/RUN_APP_FROM_HERE.md)
- [Story Export/Import Guide](./guides/STORY_EXPORT_IMPORT_GUIDE.md)
- [Manual Testing Notes](./testing/manual/)

## Documentation Rules

- Keep operational runbooks private unless they are sanitized and reusable.
- Do not commit server addresses, SSH details, credentials, real user audits, or database snapshots.
- Do not keep historical implementation notes in the repo after they stop being useful.
- Prefer short overview docs over step-by-step internals.
- Put local-only notes in ignored files such as `*.local.md` or a private notes location.
