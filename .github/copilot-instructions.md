# Copilot Instructions for reverencia-majestad

## Project Overview
This is a **static website project** for "Reverencia Majestad" (a mobile hair & spa service) hosted on Firebase Hosting. The entire site is a single-page landing page with no build step - deployment is direct from the `public/` directory.

**Key Architecture Decisions:**
- **No build process**: `npm run build` is a no-op. The site is purely static HTML/CSS in `public/index.html`
- **Firebase hosting rewrites**: All routes redirect to `index.html` (configured in `firebase.json`)
- **CI/CD via GitHub Actions**: Automatic deployments on merge to `main` branch and preview deploys on PRs

## File Structure

```
public/index.html          # The entire website (single landing page with inline CSS)
firebase.json              # Hosting config: public dir, rewrites rules
.firebaserc                # Firebase project ID: reverenciamajestad-dd2ba
.github/workflows/         # GitHub Actions CI/CD pipelines
├── firebase-hosting-merge.yml        # Deploys to live on main branch push
└── firebase-hosting-pull-request.yml # Preview deploy on PR (runs build + deploy)
```

## Website Styling & Markup Patterns

The `public/index.html` uses **inline CSS with CSS custom properties** for theming:

```css
:root {
  --bg: #0b0b0b;         /* Dark background */
  --text: #f7f3e8;       /* Light text */
  --gold: #f5d26b;       /* Primary accent */
  --gold2: #b9912b;      /* Secondary gold (darker) */
}
```

**Key visual patterns:**
- Gradient text effect on h1: `background-clip: text` with gold gradients
- Frosted glass effect on card: `backdrop-filter: blur()` + semi-transparent background
- Responsive typography: Uses `clamp()` for fluid sizing across viewport widths
- Dark theme with radial gradient background emanating from top center
- Subtle hover states: Transform + filter brightness changes on buttons

When modifying styles, maintain this **luxury/glamour aesthetic** with gold accents and glassmorphism effects.

## Deployment Pipeline

**Local testing:**
- No build step needed. Open `public/index.html` directly in browser to test
- Firebase emulation: Run `firebase emulators:start` if testing Hosting behavior locally

**Deployment triggers:**
1. **Main branch push** → `firebase-hosting-merge.yml` → Deploys to LIVE (channelId: live)
2. **Pull request** → `firebase-hosting-pull-request.yml` → Creates preview channel + checks

**Required secrets for CI/CD:**
- `FIREBASE_SERVICE_ACCOUNT`: Service account JSON for deployment auth
- `GITHUB_TOKEN`: Provided automatically by GitHub Actions

The Firebase project ID is `reverenciamajestad-dd2ba` (hardcoded in workflows and `.firebaserc`).

## Common Tasks

**Editing the landing page:** Modify HTML structure and inline CSS in `public/index.html`. No build required.

**Testing before deployment:** Open the HTML file in a browser. Changes are live immediately.

**Updating content:** Tagline, headings, Instagram link, and copyright are in the HTML body. Update the `href` attribute on the Instagram button to change the destination.

**Adding new pages:** Currently single-page. To add routes, you'd need to update Firebase rewrites in `firebase.json` and create new HTML files.

## Development Environment

- **Package manager**: npm (minimal setup; no dependencies)
- **Hosting**: Firebase Hosting (Google Cloud Platform)
- **CI/CD**: GitHub Actions (auto-triggered on push/PR)
- **Language**: HTML5 + vanilla CSS (no JavaScript, no frameworks)

No special tools or build processes required—edit, commit, push to main to deploy.
