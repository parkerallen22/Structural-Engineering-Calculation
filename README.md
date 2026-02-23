# Structural Engineering Calculators

A lightweight Next.js app for browsing a library of structural engineering calculators.

## Development

```bash
npm install
npm run dev
```

## Home page & calculator registry

Calculator definitions are stored in `src/lib/calculators.js`.
To add a new calculator, append a new object with:

- `slug`
- `name`
- `description`
- `category`
- `tags`
- `keywords`

The Home page (`/`) and Calculators page (`/calculators`) both read from this single source of truth.

Current calculators include `composite-section-properties` for composite steel beam + deck transformed-section properties and PDF reporting.
