# Marketplace frontend

React + Vite + ethers v6, using CSS and inline styles. See the repository README for deployment and wallet workflows.

Copy `.env.example` to `.env`, configure the newly deployed Sepolia marketplace address, then run `npm ci` and `npm run dev`. Checks: `npm test`, `npm run lint`, `npm run build`. Vercel root is `frontend` and output directory is `dist`.

The updated contract ABI requires a new Marketplace deployment; do not use the legacy address. `VITE_*` values are public and read at build time.
