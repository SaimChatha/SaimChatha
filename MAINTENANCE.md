# Maintaining DiagnosticMicro

## Where to edit
- `data.js`: bench content, media comparisons, questions, source links and review label.
- `atlas.js`: rendering, navigation, cell schematics and arithmetic.
- `atlas.css`: responsive visual design and print styling.
- `atlas-index.html`: accessible page shell.
- `cases.js`: original 300-scenario dataset. Do not replace it during atlas-only changes.

## Content review
Before formal teaching, ask a qualified local reviewer to check the educational summaries against current laboratory SOPs and the linked source documents. Administrative publication updates may not mean a full scientific review. Check specimen-specific acceptance rules, media names, product-specific chromogenic colours, critical communication and reporting permissions locally. No universal incubation or authorisation algorithm is supplied.

Review links and content when a source or local SOP changes. Record the reviewer, date, source edition, changed section and tests performed in a change log. Do not advance the review label without checking the underlying source. There is no automatic update service.

## Release process
1. Save a copy of the current Vercel deployment and note its deployment ID.
2. Edit atlas files; keep trainer assets unchanged unless a trainer change was requested.
3. Run tests and build. Review keyboard navigation, mobile layout and printed view in a browser.
4. Check source links and scientific accuracy.
5. Commit changes to a preview branch on GitHub.
6. Verify the preview, merge to main, and verify `/`, `/atlas/` and the custom domain.
7. Keep the previous deployment available for rollback.

## Data & privacy
No backend, patient records or analytics were added. Saved benches use browser localStorage under `diagnosticmicro-atlas-saved-v3`. Trainer progress retains its original key. The CSF calculator performs arithmetic on fictional examples; it does not diagnose, correct traumatic taps or recommend treatment.

## Release log
- 15 October 2026: Atlas edition 03 deployed via GitHub main; Vercel Ready. Seven bench pathways, 21 media rows, eight cell schematics and ten references. Automated checks passed with original trainer checksums unchanged. Desktop smoke checks passed; mobile and print visual checks remain outstanding.
