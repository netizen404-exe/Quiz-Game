# Current-ish

Current-ish is a small, embeddable current-events quiz. This repository contains the site, Cloudflare Worker API, database migrations, and optional scheduled news-drafting Worker.

## Try it

Open `index.html` in a browser for the static sample preview. The preview supports guest play with sample questions and standings. Google sign-in, saved history, moderation, and the live leaderboard require your own Cloudflare Worker and D1 database.

## Embed the hosted quiz

If you only want to add the quiz to a website, you do not need to deploy this repository. Open **About** on the hosted quiz, copy its iframe snippet, and paste it into your page:

```html
<iframe src="https://YOUR-QUIZ-HOST/?embed=1" title="Current-ish news quiz" width="100%" height="760" loading="lazy" style="border:0;border-radius:8px;overflow:hidden" allow="clipboard-write"></iframe>
```

Replace the example host with the address of the quiz you want to embed. The embed displays a clickable Current-ish credit; retain it when sharing or adapting the embed.

## Run your own hosted copy

The full version runs as a Cloudflare Worker with static assets and D1. GitHub stores the source; it does not host the API or database. Each deployment needs its own Cloudflare Worker and D1 database.

1. Fork this repository on GitHub, or create a public repository and push these files to it. Keep `.assetsignore`, `functions/`, `jobs/`, and `migrations/` in the repository; `.assetsignore` only controls which files Cloudflare serves as static assets.
2. In Cloudflare, create a D1 database (for example, `current-ish-db`). Copy its database ID into both `wrangler.jsonc` and `jobs/wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
3. Install the project dependencies and apply the migrations to your database:

   ```sh
   npm install
   npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc
   ```

4. Build and deploy the main Worker:

   ```sh
   npm run build
   npx wrangler deploy
   ```

   Or connect the repository using Cloudflare Workers Builds with build command `npm run build` and deploy command `npx wrangler deploy`.

5. In the Cloudflare dashboard, add `GOOGLE_CLIENT_ID` as a Worker variable if you want Google sign-in. Create a Google OAuth **Web application** client and add your deployed site's origin to its **Authorized JavaScript origins**. Set `INITIAL_ADMIN_EMAIL` as a Worker secret to assign the first editor. These values belong to your own deployment.
6. Sign in, then visit `/admin.html` to review questions and administer player nicknames.

Without Cloudflare configuration, the static preview remains playable. The main Worker requires its D1 binding for API-backed features.

## Optional automatic question drafts

The scheduled Worker in `jobs/` fetches the configured RSS/Atom feeds and drafts questions for human review. It does not publish questions automatically.

1. Set the same D1 database ID in `jobs/wrangler.jsonc`.
2. Add `GROQ_API_KEY` as a secret to the `current-ish-suggestions` Worker.
3. Review the feed list and licensing notes in [NEWS_SOURCES_REVIEW.md](NEWS_SOURCES_REVIEW.md). Keep the host allowlists accurate and exclude restricted or third-party material.
4. Deploy the scheduled Worker:

   ```sh
   npx wrangler deploy --config jobs/wrangler.jsonc
   ```

Every generated question remains a draft until an editor approves it.

## Local credentials

Copy `.dev.vars.example` to `.dev.vars` and replace the sample values for local Worker development. `.dev.vars` is ignored by git; never commit credentials. Google sign-in also requires a Google OAuth client configured for the local origin.

## Project contents

- `index.html`, `styles.css`, and `app.js` — quiz interface and embed mode
- `questions.js` — static preview question pack
- `functions/` — sign-in, quiz, leaderboard, account, and editor APIs
- `migrations/` — D1 database schema and preview seed data
- `admin.html`, `admin.js`, and `admin.css` — private editorial desk
- `jobs/` — optional scheduled RSS collection and question drafting
- `wrangler.jsonc` — main Worker configuration
- `NEWS_SOURCES_REVIEW.md` — source coverage and reuse notes

## License

The software is released under the MIT License. Individual source articles and other third-party works remain subject to their own licenses and terms; see `NEWS_SOURCES_REVIEW.md` and each question's citation.
