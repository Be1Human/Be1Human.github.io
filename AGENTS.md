# Portfolio delivery

The user requires completed website changes to be published automatically, without another request to deploy. Unless the user explicitly asks for a draft or local-only work, a website task includes implementation, build, checks, normal Git push, and verification of the exact public files at https://be1human.github.io/.

This checkout is the maintained official site. Preserve incoming remote changes. Never force-push, replace history, publish credentials or raw production/design folders, or overwrite another dirty checkout. Keep the old portfolio-publish-review directory untouched.

Edit the interactive homepage in src/experience/index.html; its runtime is app.js, style.css and content-local.json. Build preserves this source. Newly published articles belong both in data/posts.json (standalone pages and RSS) and content-local.json (interactive journal). Use the user's current Asia/Hong_Kong date/time for new records; preserve historical dates.

data/news.json is the authoritative public news archive. The build derives assets/news/archive.json and individual editions. Do not hand-maintain a single-day snapshot or reduce existing history. The original AI 热门 20 source is private; use only the user's authorized Sites account/source checkout. Authentication failure must keep the last valid archive intact.

Run npm run site:publish for the complete build/check/commit/push/public-verification process. Use npm run site:verify separately only for status or recovery. Only report completion after the public verification succeeds; a push alone is not completion. Open the affected official page and verify its real UI when browser tools are available.

The local design preview is a mirror, not the publication endpoint. If working there, transfer only approved public runtime changes here, preserve the full current news archive, update src/experience/index.html, publish, then refresh the mirror.
