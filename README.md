# Shy & Wild Photography

A tiny, production-ready starting point for the Shy & Wild photography website.

## Change the page

Open `index.html`. Everything visible on the site is in that one file.

## Preview it

```bash
npm start
```

Then open <http://localhost:3000>.

## Publish a change

Ask Codex to **push**. Codex should commit the current changes, push `main` to GitHub, and trigger **redeploy** for the existing Shy & Wild project in Velveteen. Velveteen does not currently redeploy automatically on GitHub push, so both steps are required.

## Deployment contract

- The app listens on `PORT` and defaults to `3000`.
- `GET /health` returns a JSON health response.
- The `Dockerfile` is the production build definition used by Velveteen.
