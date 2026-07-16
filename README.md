# Thrive Hyperbaric - main marketing site

Hand-coded static site for **www.thrivehyperbaric.com**, deployed to Cloudflare Pages.

## How it deploys
Any push to `main` runs `.github/workflows/deploy.yml`, which deploys the `dist/` folder
to the Cloudflare Pages project `thrive-hyperbaric` (custom domain www.thrivehyperbaric.com).
No manual step - push and it goes live.

## Editing
The site lives in `dist/`. Edit the HTML / `thrive.css` / `thrive.js` / images there, commit,
and push.

## Context & house rules
See the Claude project doc `thrive-main-site-operations.md` (conventions, tracking/consent,
domain/DNS, and the Foundry tool at foundry.thrivehyperbaric.com).
