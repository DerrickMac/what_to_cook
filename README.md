# What To Cook

Pick the ingredients you have on hand and a meal type, and get a matching
recipe idea — no sign-up, no external API keys required.

Built with [Next.js](https://nextjs.org) (App Router) and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

This is a standard Next.js app, so Vercel builds it with zero configuration:

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. Go to [vercel.com/new](https://vercel.com/new) and import the
   `derrickmac/what-to-cook` repository.
3. Leave the default settings (Framework Preset: Next.js, Build Command:
   `next build`, Output: `.next`) and click **Deploy**.

No environment variables are required — the recipe data is bundled with the
app in `data/recipes.ts`.
