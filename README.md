# Canvas Labs · Budget vs Actuals

Clickable front-end prototype for the Pigment Product Designer case study: Léa (FP&A) spots an overspend, investigates, finds a miscoded transaction and submits a reclassification for approval. No backend; state lives in memory and a reload resets the demo.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint && npm run typecheck && npm test
```

## Demo path

1. `/`: dashboard (October 2026, provisional). Click a waterfall bar to filter the table.
2. `/variance/marketing/6233`: variance detail with phased budget, budget check and the related Sales EMEA variance.
3. `/variance/marketing/6233?tab=vendors`: Atelier Nord flagged as a new-vendor outlier.
4. `/variance/marketing/6233?tab=vendors&tx=JE-2026-10-04418`: transaction panel with the suggested PO-2026-0917 match.
5. **Request reclassification**: pre-filled request, before/after impact, routed to Claire Dubois.
6. **Submit for approval**: toast, "€48k correction pending" on both lines, header counter at 1.

## Where things live

- `lib/finance/`: variance rules, formatting, aggregation (pure, tested)
- `lib/data/`: seed data. `reference.ts` holds the mockup figures; `ledger.ts` derives 60 account lines from them; `story.ts` holds the Atelier Nord storyline
- `lib/corrections/`: request types, approver routing, before/after impact, in-memory store
- `components/charts/`: hand-built SVG charts (IBCS-style notation)
