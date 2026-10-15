# DiagnosticMicro · Atlas edition 03

The original six-bench, 300-scenario trainer remains at `/`. The rebuilt atlas lives at `/atlas/`.

## Preview
Run `python3 -m http.server 8000 --directory dist` locally, then open http://localhost:8000/atlas/ . A standalone HTML preview is also supplied separately.

## Validation
Run `npm install`, `npm test`, then `npm run build`. Tests cover all seven atlas pathways, media views, finding selection, correct/incorrect quiz feedback, bookmarks, cell diagrams, calculator validation, body regions, search escaping, source links and original trainer checksums.

## Deploy to the existing Vercel project
Commit the source files to the connected GitHub repository. Vercel runs `node build.cjs`, which copies the root source files into their deployed paths under `dist`. `atlas-index.html` becomes `dist/atlas/index.html`. Current connected domain observed: dignosticmicro.co.uk. No DNS changes are needed.

## After deployment
Open `/` and check six benches with 50 cases each. Follow Flowchart Atlas to `/atlas/`. Check a branch, the CSF cell lab, a quiz, search and the return link. Check desktop and phone layouts. If a material problem appears, use Vercel Instant Rollback to restore the prior Ready deployment.

## Verification status
Automated DOM and JavaScript checks passed on 15 October 2026. Original trainer assets were byte-identical to the previously verified package. This upgrade has NOT yet been deployed or visually verified in a browser; browser preview was unavailable in the authoring environment. Clinical content is an educational synthesis, not an independently validated clinical product.
