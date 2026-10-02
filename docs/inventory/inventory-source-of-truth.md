# Inventory — Source of Truth & Architecture (Phase 0)

> Status: **Phase 0 complete — analysis only. No behavior changed.**
> Verified against code + live `zodicerp` database + `zodicerp_testing` migration schema on 2026-09-30.
> Every claim below was verified against the repository; where the repository does not define a
> business rule, it is listed explicitly as **DECISION REQUIRED**, not assumed.

---

## 1. Current architecture (verified)

Inventory is a **perpetual, warehouse-level, weighted-average-cost** system with one movement
ledger (`inventory_movement_headers` / `inventory_movement_lines`, referred to as "IMH/IML")
and one cost ledger (`inventory_cost_balances` / `inventory_cost_transactions`, "ICB/ICT").
There is no `zodicerp_testing`-specific schema divergence: both databases share the same
migration set (109 migrations).

Movement types supported by the `type` enum:
`opening | purchase | sale | sale_return | purchase_return | adjustment | transfer`.

### Transaction → ledger chain, per flow (as implemented today)

| Flow | Creates IMH/IML? | Quantity written to `products.quantity`? | WAC (ICB/ICT)? | Journal (GL)? | Cost basis used |
|---|---|---|---|---|---|
| GRN approval | ✅ `type=purchase, in` (one header **per detail line**) | ✅ `+base_qty` increment | ✅ `applyInbound` @ invoice line cost (`goods_receipt_detail`) | ❌ **intentionally none** (documented in `GoodsReceiptService`) | unit-converted via `UnitConversionService` |
| Purchase Invoice | ❌ none | ❌ | ❌ | ✅ Dr COGS/Purchase, Cr AP (invoice-driven recognition) | — |
| Sales Invoice post | ✅ `type=sale, out` | ✅ `−base_qty` decrement | ✅ `applyOutbound` (`sales_invoice_detail`) — **runs BEFORE the movement is written**; movement reads back the ICT unit cost | ✅ Sales/COGS journal (`SalesInvoice` entry type) | unit-converted |
| Sales Return | ✅ `type=sale_return, in` | ✅ `+base_qty` | ✅ `applyInbound` @ original sale's WA unit cost (`sales_return_detail`) | ✅ COGS reversal | unit-converted |
| Purchase Return | ✅ `type=purchase_return, out` | ✅ `−detail_qty` | ✅ `applyOutbound` (`purchase_return_detail`) | ✅ Debit-note journal | ⚠️ **RAW quantity, NO unit conversion** (only flow that skips `toBase`) |
| Stock Transfer (web) | ✅ pair of headers `transfer/out` + `transfer/in` | ❌ **no global change** (correct) | ✅ `applyOutbound` @ source WA, then `applyInbound` @ same unit cost | ❌ none | unit-converted; cost carried at WA, not `cost_per_item` |
| Stock Adjustment approve | ✅ `type=adjustment` (single header, one net direction) | ✅ `±net_qty` **global only** | ❌ **bypasses WAC entirely** | ✅ Dr/Cr Inventory vs Adjustment gain/loss (value = `unit_cost × abs(qty)` per item, un-converted) | `stock_adjustment_items.unit_cost`; raw; not unit-converted for the GL |
| Opening Stock (web `store`) | ✅ header + lines (`type=opening, in`) — **but no WAC and no base-unit conversion** | ✅ increments **raw** `item.quantity` | ❌ **none** | ❌ none | `items.cost_price` stored on the line only |
| Landed Cost | n/a | ❌ | ✅ `applyValueAdjustment` (value-only delta, `landed_cost_id`) | ✅ (per service) | allocation → inventory value |
| `/api/…/update-stock` | ❌ none | ✅ direct set/add/subtract | ❌ | ❌ | none |

### Reference-type inconsistency (verified)

The `reference_type` string for sales is `'SalesInvoice'` (PascalCase, written by
`SalesInvoiceController` and `SalesReturnService::calculateCogsReversalAmount`), while every
other flow uses snake_case (`goods_receipt`, `sales_return`, `stock_adjustment`,
`purchase_return`, `stock_transfer`, `stock_transfer_destination`, `opening`). Any consumer
that queries movements with a normalized reference type will miss sale movements.

### Historical costing lookup (verified)

`WeightedAverageCostService::assertChronological()` **rejects backdated transactions** for a
given product/warehouse. Cost history therefore must be ingested in date order per scope.
`InventoryCostTransaction` rows are immutable (model throws on update/delete); there is a
`reversal_of_id` column for reversal links, but **no service currently creates reversals** —
Sales Return / Purchase Return re-apply inbound/outbound deltas instead, and Sales Invoice /
Sales Return **hard-delete** their movement headers and lines when unposting.

---

## 2. Stock representations in the system (verified)

1. **`products.quantity`** — one global (non-warehouse) decimal per product, referenced by the
   storefront, product screens, `ProductService::getDashboardStats`, and low-stock logic.
   `with_storehouse_management` exists but is not consulted by any inventory engine path.
2. **IMH/IML** — the per-warehouse movement ledger. `StockAdjustmentService::getProductQuantity`
   derives warehouse stock as `SUM(in) − SUM(out)`; stock card and warehouse reports do the same.
3. **ICB** — per company/product/warehouse WAC quantity + value + average cost (unique key
   `company_id, product_id, warehouse_id`).
4. **ICT** — the immutable per-delta cost ledger, each row carrying full before/after state.

**These four representations are maintained by four different code paths and drift freely.**

---

## 3. Confirmed source of truth

| Question | Finding (from code, not assumption) |
|---|---|
| Authoritative *value* source | `inventory_cost_balances` via `WeightedAverageCostService` — guarded, locked, idempotent, chronological |
| Authoritative *per-warehouse quantity* source | **de facto:** movement ledger aggregation; there is no maintained warehouse quantity column anywhere |
| `products.quantity` | **Transitional legacy cache of global quantity.** Updated as a side effect by GRN/Sales/Purchase-Return/Sales-Return/Adjustment/Opening-Stock with **inconsistent semantics**: GRN and Sales use converted base quantity; Opening Stock uses raw document quantity; Adjustment uses net-converted sum; `/api/update-stock` and `ProductService::updateStock` mutate it directly with no ledger. The opening-stock + transfer tests codify "transfer does not change it" as a rule. |
| Perpetual or periodic accounting | **Perpetual for Sales only.** Sales posts COGS journal at WA cost. Purchases are invoice-driven (period-style: expense at invoice, no GRN journal — explicit architecture comment in `GoodsReceiptService`). Transfers never post. Adjustments post. Opening Stock never posts. |
| Does Opening Stock seed WAC? | **Not today** — no WAC call exists in `OpeningStockController` and no test asserts it. → **DECISION REQUIRED** |
| Does Stock Adjustment affect WAC? | **Not today** — quantity and GL change, WAC does not (guaranteed drift). → **DECISION REQUIRED** |
| Should GRN post inventory accounting? | **Explicitly answered by the code**: **NO.** Long comment in `GoodsReceiptService::approveReceipt()` documents "Invoice-driven inventory recognition"; the Purchase Invoice is the sole financial trigger for purchases. This is a confirmed rule, not an open decision. |
| Does Transfer require accounting? | No (no posting in controller/service; test codifies "no journal"). Confirmed rule. |
| Is inventory perpetual or periodic? | **Perpetual quantities + WAC everywhere except Opening Stock and Stock Adjustment, which bypass cost.** Full answer = decision on the two rows above. |

---

## 4. Responsibility of each table / service (verified)

| Component | Responsibility as implemented |
|---|---|
| `inventory_movement_headers` | Per-warehouse stock event: date, type, direction, reference, company, warehouses |
| `inventory_movement_lines` | Per-product quantity in **base units** + `conversion_factor_snapshot` + `original_quantity` + `cost_price`. GRN/Sales/Sales-Return lines link to source detail rows; Purchase-Return and Stock-Adjustment lines do not |
| `inventory_cost_balances` | WAC state per (company, product, warehouse): quantity, value, average cost |
| `inventory_cost_transactions` | Immutable cost ledger with before/after snapshots and source linkage |
| `WeightedAverageCostService` | The only writer of ICB/ICT. `applyInbound` / `applyOutbound` / `applyValueAdjustment`; ownership check (`assertScopeOwnership`: product & warehouse must belong to active company); per-scope chronological enforcement; idempotency by `(company, product, warehouse, source_type, source_id)`; row-locked balance upsert; forbids negative quantity/value |
| `UnitConversionService` | Converts document-unit → base-unit quantities via `item_units.base_unit` chain or `item_unit_conversions`; company-aware; decimal-safe (bcmath, scale 6) |
| `StockAdjustmentService` | Draft/approve/cancel workflow; creates movement; posts GL; **bypasses WAC**; reports (`getStockCard`, `getWarehouseStockReport`, `getProductQuantity`) |
| `GoodsReceiptService` | GRN lifecycle; per-line movements + WAC; PO/invoice received-quantity sync; **no GL (documented decision)** |
| `PurchaseReturnService` / `SalesReturnService` | Return movements, WAC deltas, journals; purchase return uses raw quantities |
| `OpeningStock` / `OpeningStockItem` models | Thin Eloquent aliases over IMH/IML (`type='opening'`) |
| `TransferStock` / `TransferStockItem` models | Thin Eloquent aliases over IMH/IML (`type='transfer'`) |
| `ProductService::updateStock` + `/api/products/{id}/update-stock` | **Uncontrolled direct mutation of `products.quantity`** (set/add/subtract), no movement, no WAC. See Phase 10 |

---

## 5. Verified current state of the databases

### Live DB (`zodicerp` — note: no `zodicerp_testing` DB existed before this phase; the test DB is `zodicerp_testing`)

- 1 company; 7 warehouses (all `company_id=1`); 1,036 products (1,034 simple / 2 variable; **24 products with no `unit_id`**, which makes them unusable by any unit-converting flow);
- 1,033 products with `quantity > 0`, **total 100,107 units of stock**;
- **`inventory_movement_headers` = 0 rows; lines = 0; cost balances = 0; cost transactions = 0; stock_adjustments = 0.**

So 100,107 units of live stock exist in `products.quantity` with **zero** supporting ledger
history, and there is **no opening-stock entry** for it. This is the single largest data risk
for the migration (see §7). It also means the audit claim "Opening Stock created headers in
code but the DB has none" is correct — the feature has effectively never succeeded in this
database.

### Test DB (`zodicerp_testing`)

- Built with `migrate:fresh` during this phase (see §8). Schema current; no data.

---

## 6. Verified code-level defects (facts, with locations)

1. **Opening Stock persistence is not just incomplete — the legacy controller writes raw
   document quantities to `products.quantity` and to IML with no unit conversion, no WAC, and
   `movement_date` left NULL by default** (`OpeningStockController::store`).
   `2026_09_30_000003_add_movement_date_to_inventory_movement_headers.php` also backfills
   `COALESCE(movement_date, created_at)` — evidence NULL dates exist in practice.
2. **Stock Adjustment bypasses WAC** (quantity + GL change, `inventory_cost_balances` does not)
   and stores a **per-item unit cost that is never unit-converted** for the GL value
   (`StockAdjustmentService::approveAdjustment` / `createJournalEntryForAdjustment`).
3. **Purchase Return skips `UnitConversionService`** — decrements `products.quantity` and WAC
   with **raw** invoice-detail quantities, while GRN stocks base quantities
   (`PurchaseReturnService::createInventoryEffectsForReturn`, ~line 450).
4. **Cross-warehouse product quantity**: Stock Adjustment applies its net quantity to
   `products.quantity` globally; all other flows also mutate the global field from
   per-warehouse movements, so the global field cannot be derived from any warehouse.
5. **Company isolation is effectively disabled repo-wide**: `CompanyScope::apply()` is a
   **no-op** (comment: "تم إلغاء التصفية…"), and `BelongsToCompany` is only used by
   `Products` and `Location` models. In Inventory, explicit `company_id` filtering exists only
   in: `WeightedAverageCostService` (full), `StockAdjustmentController` (index query),
   `StockAdjustmentService` (write fallback `auth()->user()->company_id ?? 1`).
   **Not scoped**: OpeningStock/TransferStock controllers (all reads/writes),
   `StockAdjustmentService::getProductQuantity/getStockCard/getWarehouseStockReport`,
   journal lookups in `SalesReturnService`/`StockAdjustmentService` (which even **fall back to
   company 1 when the adjustment row has none**), `Brands/Categories/ItemUnit/ItemAttribute/
   ProductCollection/Warehouses` models, `resolveInventoryAssetAccountId()` /
   `resolveInventoryAdjustmentAccountId()` (account lookups unscoped).
   WAC's `assertScopeOwnership` protects WAC, but the movement and report layers are open.
6. **No warehouse ownership check at HTTP boundaries**: `exists:warehouses,id`,
   `exists:products,id`, `exists:item_units,id` validation rules are not company-scoped, so a
   user can reference another company's warehouse/product/unit; only WAC would refuse.
7. **Broken/dead frontend**: `DashboardStock.jsx` is an **empty file (0 lines)** and not
   routed; `InventoryReports.jsx` is a 33-line static placeholder card page;
   `StockAdjustment.jsx` uses raw `fetch()` (no CSRF header), tailwind-style utility classes
   that don't match the SCSS/BEM admin pages, no AdminLayout, and the controller feeds it
   `name_ar`-aliased columns while the unit list omits base-unit filtering.
8. **`'count差异'`** — a Chinese enum value is live in the migration, the controller validation
   (`StockAdjustmentController::store`), and is silently absent from the create form's option
   list (form can produce `other` only; a payload with `count差异` passes validation).
9. **GL account resolution is name/like-based and unscoped**:
   `Account::where('AccName','like','%adjustment%')` with a numeric-range fallback
   (`AccCode between 6100 and 6999`), and hardcoded `'11401'` inventory asset code — no
   `company_id` filter anywhere in these resolvers.
10. **Movement-vs-cost ordering in Sales Invoice**: `createStockMovementsForInvoice` fetches
    the cost from ICT (`firstOrFail`) **after** WAC already consumed stock, then writes the
    movement line — movement and cost ledger are written by different code in different order,
    so an exception between them leaves them inconsistent (mitigated only by being inside the
    outer posting transaction).
11. **Unposting paths hard-delete ledger rows** (`reverseStockMovementsForInvoice`,
    `reverseStockMovementsForReturn` in Sales; `destroy` in StockTransferController deletes the
    destination header) instead of writing reversal movements — history is destroyed, which
    conflicts with the immutable-ledger design used for ICT.
12. **N+1 / scale issues (verified)**: `OpeningStockController`, `StockTransferController` and
    `StockAdjustmentController` all load **2,000 products per page view**;
    `StockAdjustmentService::getWarehouseStockReport` queries products one-by-one inside a loop;
    journal code generation scans **all** `journal_entries.entry_code` values per posting
    (`generateNextEntryCode` in both `StockAdjustmentService` and `SalesReturnService`).
13. **Test-suite health (baseline, after fixing the DB-setup blocker in §8)**:
    **138 passed / 73 failed / 43 skipped, 707 assertions.** Inventory-relevant failure
    clusters: `ErpTransactionIntegrityTest` (20 × duplicate 1001-account fixture collision),
    `WeightedAverageAccountingIntegrationTest` (customer fixture FK + purchase-return journal
    assertion), `GrnAccountingTest` (6 × products without unit), `StockTransferCrudTest` (2),
    `OpeningStockAndTransferTest` (13 × **tests re-implement controller logic inline instead of
    exercising code** — they pass while asserting behavior the real controllers do not have),
    `BlockerVerificationTest` (2), plus HR/PriceList/Product/API failures outside Inventory scope.
14. **`routes/web.php` has no `stock-card`/`warehouse-stock` UI page ownership problem, but
    `DashboardStock.jsx` is unreachable** (no route) and the inventory dashboard therefore does
    not exist in practice.

---

## 7. Unresolved business decisions (require approval — none assumed)

| # | Decision | Options | Recommendation (not implemented) |
|---|---|---|---|
| D1 | **Must Opening Stock seed WAC?** | (a) Yes — `applyInbound` at entered cost; (b) No — quantity-only | (a): valuation is meaningless without it, and 100,107 live units currently have no cost ledger at all |
| D2 | **Must Stock Adjustment affect WAC?** | (a) Yes — inbound at item cost / outbound at current WAC; (b) No — quantity-only | (a): otherwise ICB quantity diverges from movement quantity forever; outbound adjustments at WAC cost the shrinkage correctly |
| D3 | **`products.quantity` target role** | (a) derived cache maintained by the movement engine; (b) authoritative global; (c) retired | (a): keep as a derived, engine-maintained cache; all writers must go through movements (aligns with the existing OpeningStock+Transfer test rule "transfer doesn't change it") |
| D4 | **Opening Stock update/delete semantics** | (a) reversal movements + replacement; (b) disable update/delete after WAC exists | (a) with reversal; hard deletes must not be possible once D1 is implemented |
| D5 | **Backdating policy** | (a) keep strict chronological rejection; (b) support documented backdate/rebuild | keep (a) for now; a rebuild command is a later, separate decision |
| D6 | **`reference_type='SalesInvoice'` normalization** | (a) migrate value to `sales_invoice`; (b) keep PascalCase | (a) at Phase 2, with a data migration |
| D7 | **Opening-stock one-time enforcement** | (a) forbid a second `type='opening'` header for same product/warehouse; (b) allow multiple | (a) once D1 lands; historical multiple records become a reconciliation flag |
| D8 | **GRN posting** | **Confirmed: no GRN journal (invoice-driven purchasing).** Re-confirm before Phase 9. | keep as-is |

No business rule was invented anywhere in this document; every "Confirmed" row cites code
location in §4/§6.

---

## 8. Migration / environment risks

1. **Test database did not exist.** `.env.testing` targets `zodicerp_testing`, which was never
   created — the first full-suite run failed 246/3. During this phase the empty
   `zodicerp_testing` database was created and migrated (infrastructure only; **`zodicerp`
   live data untouched**).
2. **Committed schema bug blocks all test runs** (now fixed, see "Files changed"):
   `2026_09_30_000004_unique_attendance_employee_date.php` dropped
   `attendances_employee_id_foreign` **index** while the FK of the same name was live —
   MySQL error 1553, so `migrate:fresh` could never complete and **every** test failed. The
   migration now drops the FK constraint before the index (the unique index still covers the
   leftmost column for lookups).
3. **24 live products have no `unit_id`** — any flow that calls `UnitConversionService`
   (GRN, Sales, Sales Return, Transfers, Adjustment approve) throws for them today. Migration
   strategy must assign base units (or exclude + report them) before enabling those flows.
4. **100,107 units of live stock with no movement/WAC history.** When D1/D2 land, historical
   truth will diverge from `products.quantity`. A one-time bootstrap (e.g. backdated opening
   movements from current quantity + `cost_per_item`) will be required, and per the task rules
   it will only be proposed — never executed without approval.
5. `inventory_movement_lines.quantity` is `DECIMAL(15,3)` and `cost_price DECIMAL(15,3)`
   while cost transactions use `(18,4)`/`(18,6)` — precision is adequate but the phase plan
   should not widen columns without proving a need.
6. `opening` type headers have no unique constraint per product/warehouse (D7) and no
   `movement_date` NOT NULL enforcement.

---

## 9. Proposed invariant rules (for Phases 2+; NOT yet implemented)

1. **Every stock-changing operation** (opening, GRN, purchase return, sale, sales return,
   transfer, adjustment, API mutation) must produce: company + warehouse ownership validation →
   unit conversion to base quantity → one movement header/line pair → one WAC delta (ICB/ICT)
   → `products.quantity` updated only as a derived side effect of the same transaction.
2. **Explicit, documented exceptions**: Transfer never changes `products.quantity` and never
   posts GL; GRN never posts GL (invoice-driven purchasing); Landed Cost adjusts value only.
3. `products.quantity` must be *maintained by the movement engine only* — no writer may touch
   it outside the same DB transaction that writes the movement + WAC delta (removes
   `/api/update-stock` and `ProductService::updateStock` as independent systems).
4. Movement lines must always carry `original_quantity` + `conversion_factor_snapshot`;
   quantity columns are always base units.
5. Cost ledgers are append-only: corrections are reversal deltas (`reversal_of_id`), never
   deletes; movement history is never hard-deleted for posted documents.
6. All reads/writes of company-owned inventory data must filter by `CompanyContext::id()`
   (Phase 1); model-level global scope must not be relied upon until `CompanyScope` is fixed.
7. Any inventory report/stock card must read from movements + WAC (never from
   `products.quantity` alone) and must be company-scoped.
8. Reconciliation (Phase 7) must treat `products.quantity` as derived, and movements+WAC as
   the truth to which the cache is compared.

---

## 10. Phase 0 files changed (only these)

| File | Change | Why it was unavoidable in Phase 0 |
|---|---|---|
| `docs/inventory/inventory-source-of-truth.md` | **new** — this document | the deliverable |
| `database/migrations/2026_09_30_000004_unique_attendance_employee_date.php` | **fixed** (untracked, pre-existing): drop FK constraint *before* dropping its backing index; `down()` restores both | without it `migrate:fresh` fails for the **entire** test suite (MySQL 1553), making every phase's mandatory test verification impossible. No Inventory behavior is affected. HR code untouched. |
| `zodicerp_testing` (MySQL database) | **created + migrated** (schema only) | the configured test DB (`DB_DATABASE=zodicerp_testing` in `.env.testing`) never existed; without it no test can run. Live `zodicerp` DB not modified. |

No other file was touched. No Inventory behavior changed.

---

# PHASE 2 APPENDIX — MOVEMENT ENGINE INTEGRITY (verified 2026-09-30)

## The movement contract (now enforced by tests)

Every legitimate stock-changing operation must produce, in one transaction:

1. company + ownership validation (Phase 1);
2. unit conversion to **base quantity** via `UnitConversionService`;
3. one `inventory_movement_headers` row (type, direction, movement_date,
   company, warehouse, reference) + one line per product carrying
   `quantity` (base), `original_quantity` (document),
   `conversion_factor_snapshot`, `cost_price`;
4. one `inventory_cost_transactions` delta per line where WAC applies,
   idempotent per `(company, product, warehouse, source_type, source_id)`;
5. `products.quantity` updated only as a derived side effect;
6. a journal where the confirmed accounting policy requires it.

## Verified flow matrix (after Phase 2 fixes)

| Flow | Movement | Base-unit conversion | WAC | `products.quantity` | Journal |
|---|---|---|---|---|---|
| GRN approval | `purchase/in` per detail | ✅ | ✅ links ICT→movement | ✅ +base | **none** (confirmed policy) |
| Purchase Return | `purchase_return/out` | ✅ **fixed in Phase 2** (was raw) | ✅ links ICT→movement | ✅ −base | ✅ debit note |
| Sales Invoice post | `sale/out` | ✅ | ✅ (ICT created by the journal step) | ✅ −base | ✅ revenue/COGS/treasury |
| Sales Return | `sale_return/in` | ✅ | ✅ at original sale cost | ✅ +base | ✅ COGS reversal |
| Stock Transfer | `transfer/out` + `transfer/in` | ✅ | ✅ OUT at source WAC → IN at same cost | ✅ unchanged (correct) | **none** (confirmed policy) |
| Stock Adjustment | `adjustment` (single net direction) | ✅ (movement only) | ❌ **documented exception** (D2 pending) | ✅ ±net | ✅ gain/loss |
| Opening Stock | `opening/in`, `reference_type='opening'` | ❌ raw (documented exception, D1/D3 pending) | ❌ | ✅ +raw | **none** |

## Phase 2 changes

| File | Change |
|---|---|
| `app/Services/Vendor_Purchases/PurchaseReturnService.php` | Return quantities are converted to base units once and the SAME base quantity drives the movement line, the WAC outbound, and `products.quantity`; movement lines now carry `original_quantity` + `conversion_factor_snapshot`. Removes the raw-quantity engine hole (Phase 0 §6.3). |
| `app/Http/Controllers/Backend/Client_Sales/SalesInvoiceController.php` | Movement `reference_type` normalized `'SalesInvoice'` → `'sales_invoice'` (4 sites). |
| `app/Services/Client_Sales/SalesReturnService.php` | Historical-cost lookup + comment normalized to `'sales_invoice'`. |
| `app/Http/Controllers/Backend/Inventory/OpeningStockController.php` | Opening stock headers now stamp `reference_type='opening'` (was NULL; reports detected opening rows by notes-text heuristics). |
| `database/migrations/2026_09_30_000010_normalize_sales_invoice_reference_type.php` | **new** — rewrites stored `'SalesInvoice'` movement references to `'sales_invoice'`; reversible; journal `entry_type` values untouched. **Not yet run against live `zodicerp` (0 movement rows there — no-op at deploy time).** |
| `tests/Feature/InventoryMovementContractTest.php` | **new** — 8 tests, one per flow + cross-flow invariants. |
| `tests/Feature/InventoryRemediationTest.php` | fixture updated to the normalized reference value. |

## Verified deviations (intentional, documented — not silently allowed)

1. **Sales ICT rows carry no `movement_header_id`**: the sales posting order is
   `upsertJournalEntryForInvoice` (applies WAC outbounds → creates ICTs) THEN
   `createStockMovementsForInvoice` (reads the ICT unit cost back to write the
   movement line). ICT immutability means the reverse link can never be
   attached afterwards. Sales provenance = shared `source_id`
   (`sales_invoice_detail`) + invoice-referenced movement header. GRN and
   Purchase Return link ICT→movement directly.
2. **Stock Adjustment and Opening Stock do not write WAC** — SUPERSEDED:
   D1 landed in Phase 3, D2 landed in Phase 4 (see appendices below).
3. **Opening Stock stores raw document quantities** (no conversion snapshot) —
   pinned by test, flips with D1 in Phase 3.
4. `upsertJournalEntryForInvoice` requires a treasury account — sales posting
   couples GL and treasury; unchanged in Phase 2 (Phase 9 scope).

## Phase 0 corrections (found while verifying)

- No `movement_date` backfill migration exists; the column is simply nullable.
  The Phase 0 §8.6 claim about `2026_09_30_000003` was wrong — corrected here.
- `OpeningStock` headers previously wrote `reference_type = NULL` (not
  `'OpeningStock'`); now stamped `'opening'`.

---

# PHASE 3 APPENDIX — OPENING STOCK (implemented 2026-09-30)

## Decisions implemented

- **D1 (Opening Stock seeds WAC): APPROVED and implemented.** Each opening
  line calls `WeightedAverageCostService::applyInbound` at the entered cost,
  producing one immutable ICT (`source_type = opening_stock_line`) linked to
  its movement line, updating ICB like any other inbound.
- **D3 (derived cache) partially implemented:** opening stock now writes
  `products.quantity` with the BASE quantity and conversion snapshots on the
  line; `products.quantity` itself was widened to `DECIMAL(16,4)` (see below).
- **D4 (update/delete): implemented as reversal-and-replacement.**
- **D7 (one active opening per product/warehouse): implemented** (conservative
  default). A second submission for the same product+warehouse is rejected;
  edit via update instead.

## New architecture component: `OpeningStockService`

Single authority for opening stock (`app/Services/Inventory/OpeningStockService.php`):

- `create()` — validates ownership + services-hold-no-stock + duplicate
  products; converts document qty → base (`UnitConversionService`); cost is
  entered per document unit and divided by the conversion factor for the WAC;
  writes header + lines + ICTs + derived quantity in ONE transaction.
- `update()` — **reverse-old-document + create-new-document**: movement lines
  are referenced by immutable ICTs (`ict.movement_line_id` is a RESTRICT FK),
  so lines can never be rewritten in place. The old document is reversed
  exactly (`WAC::reverse` per ICT + derived-quantity rollback) and kept as an
  audit row marked `[SUPERSEDED date]`; the replacement is a fresh document.
  The correction is dated `max(new date, today)` to honor WAC chronology.
- `delete()` — exact reversal; header kept as an audit row (direction →
  `'out'`, `[REVERSED date]`). History is never destroyed.
- Legacy pre-Phase 3 lines without ICTs reverse the derived quantity only and
  become Phase 7 reconciliation flags.

## New engine capability: `WeightedAverageCostService::reverse()`

Exact reversal of any prior cost transaction: writes one offsetting delta
with the original unit cost + movement linkage + `reversal_of_id`, idempotent
per source, refuses when the stock has already been consumed (negative guard).
This is the general reversal primitive Phases 4–6 will reuse.

## Schema change (proven necessary)

**`products.quantity` was `INT(11)`.** Every fractional base quantity written
by ANY flow (box→piece conversions, decimal GRNs, opening stock) was silently
truncated — the derived cache was structurally unable to match the ledgers
(`inventory_movement_lines DECIMAL(15,3)`, ICT/ICB `DECIMAL(18,4)`).
`2026_09_30_000011_widen_products_quantity_to_decimal.php` widens it to
`DECIMAL(16,4)` (matches WAC quantity scale; non-destructive; reversible).
Not yet applied to live `zodicerp` — runs at deploy.

## Route/API changes

- `PUT admin.inventory.opening-stock.update` **routed** (previously dead,
  unrouted code — the old destructive "delete rows + re-add" implementation is
  gone from the controller entirely; service owns the logic).
- DELETE semantics changed: no longer removes rows; reverses them.

## Phase 3 files

| File | Change |
|---|---|
| `app/Services/Inventory/OpeningStockService.php` | **new** — the opening stock engine |
| `app/Services/Inventory/WeightedAverageCostService.php` | **new** `reverse()` + `reversal_of_id` plumbing through `persistDelta` |
| `app/Http/Controllers/Backend/Inventory/OpeningStockController.php` | store/update/destroy delegate to the service; legacy inline engine removed |
| `routes/web.php` | `opening-stock.update` route added |
| `database/migrations/2026_09_30_000011_widen_products_quantity_to_decimal.php` | **new** — `products.quantity` INT → DECIMAL(16,4) |
| `tests/Feature/OpeningStockLifecycleTest.php` | **new** — 14-test battery |
| `tests/Feature/InventoryMovementContractTest.php` | opening-stock test updated to the D1 contract (WAC now seeded) |
| `tests/Feature/InventoryCompanyIsolationTest.php` | update-guard test now exercises the routed, guarded endpoint |

## Known baseline instability (not Phase 3 regressions)

`BalanceSheetEquilibriumTest` passes standalone but flips in full-suite runs
depending on residual data left by the 20 failing `ErpTransactionIntegrityTest`
fixtures. Unchanged account-handling code in Phase 3; listed for the fixture-repair
task.

---

# PHASE 4 APPENDIX — STOCK ADJUSTMENT (implemented 2026-09-30)

## Decisions implemented

- **D2 (ratified): adjustments route through the WAC engine.** Positive items
  apply inbound at the ENTERED unit cost divided by the unit conversion
  factor (zero-factor guarded); negative items consume at the CURRENT
  warehouse WAC. Within a mixed document, positives apply BEFORE negatives,
  so write-offs price at the post-inbound WAC. Insufficient WAC stock throws
  and rolls back the whole approval (document stays draft, zero ICTs, zero
  movements).
- **D3: derived `products.quantity`** is maintained via one per-product net
  delta per approval/cancel (no per-item read-modify-write races).
- **D4: approve/cancel lifecycle.** Approval is idempotent (early return when
  already approved). Cancel is idempotent when cancelled; draft cancel flips
  status only; approved cancel reverses exactly via
  `WeightedAverageCostService::reverse(originalTxId, date,
  'stock_adjustment_reversal', itemId)` and rolls back the derived quantity.
  `reverse()` refuses consumed stock → whole cancel rolls back (status
  unchanged, zero reversal ICTs). Legacy pre-Phase-4 lines without ICTs are
  skipped by cancel (Phase 7 reconciliation flags).

## Vocabulary (new ledger rows)

- ICT `source_type`: `stock_adjustment_line` (approval),
  `stock_adjustment_reversal` (cancel, with `reversal_of_id`).
- Movement `reference_type`: `stock_adjustment` / `stock_adjustment_reversal`.
- Approval creates ONE movement header PER DIRECTION (`type='adjustment'`,
  direction `in`/`out`) — never one mixed-sign document. Outbound movement
  line `cost_price` is backfilled with the WAC applied by the ICT.
- Journal `entry_type`: `StockAdjustment`, reference = adjustment number,
  entry codes `QID-N` per company.

## Cancellation shape (known asymmetry)

Cancel writes a reversal ICT for EVERY line and reverses every effect, but
the reversal MOVEMENT doc is written only when the net document was one-
directional: `in` if all-negative, `out` if all-positive, and NONE when the
original was mixed. Auditability of mixed cancels currently lives in the ICT
reversals alone (flagged for a later phase).

## GL integration

`upsertJournalEntryForAdjustment` values the journal from the APPLIED ICTs
(sum of `abs(value_delta)` split by base-quantity sign) — never document
arithmetic. Positive → Dr 11401 Inventory / Cr adjustment gain; negative →
Dr adjustment loss / Cr 11401 (gain/loss resolved by AccCode 6100–6999 +
`%adjustment%` name fallback). `total <= 0` posts no journal. Balance is
asserted (`RuntimeException` on imbalance). Upsert keyed by (reference,
entry_type): existing entries are deleted-and-recreated line-wise with the
header updated; then `PostingService::recalculatePostings(companyId)`. Skips
silently when GL accounts are unconfigured.

## Ownership & API hardening

- `findOwnedAdjustment` → 404 semantics for cross-company documents (approval
  of a foreign draft throws `ModelNotFoundException`).
- `assertWarehouseOwnership` / `assertProductOwnership` → `ValidationException`.
- Cross-company products are refused at DRAFT CREATION (tighter than the
  approval-time guard).
- `destroy()` audit guard: refuses deletion once
  `inventory_movement_headers` reference the adjustment (`stock_adjustment` /
  `stock_adjustment_reversal`); approved documents always redirect to cancel.
- Stock card moved onto the INDEX route as the `stockCard` prop (Inertia
  partial reload `only=['stockCard']`); the raw JSON endpoints remain for the
  reports with `assertOwnedProduct` / `assertOwnedWarehouse` guards.

## Frontend rebuild

`StockAdjustment.jsx` rewritten on the module conventions: AdminLayout shell,
shared serverSide Table (server paging/sort/search), `useForm` (Inertia CSRF),
localized `t(key, fallback)`, BEM `stock-adjustment-module`, list/create
modes, items repeater with product auto-fill (unit + cost), explicit Actions
column (approve for draft; cancel for draft+approved; delete for draft), and
a stock-card modal served by the partial-reload prop.

## DB changes

`2026_09_30_000012_fix_stock_adjustment_reason_enum` normalizes
`stock_adjustments.reason` to
`enum('correction','damage','expiring','found','lost','theft','count','other')`
default `correction` (legacy `count差异` maps to `other`; down maps
`count`→`other`). Applied to `zodicerp_testing`; **live `zodicerp` NOT yet
migrated** — runs at deploy.

## Phase 4 files

| File | Change |
|---|---|
| `app/Services/Inventory/StockAdjustmentService.php` | rewritten — WAC-routed approve/cancel engines + scoped reads |
| `app/Http/Controllers/Backend/Inventory/StockAdjustmentController.php` | destroy audit guard, items_count selectSub, stockCard index prop |
| `database/migrations/2026_09_30_000012_fix_stock_adjustment_reason_enum.php` | **new** — reason enum normalization |
| `resources/js/Pages/Backend/03-Inventory/StockAdjustment.jsx` | rebuilt on AdminLayout/Table conventions |
| `tests/Feature/StockAdjustmentLifecycleTest.php` | **new** — 11-test lifecycle battery (52 assertions) |
| `tests/Feature/InventoryMovementContractTest.php` | FLOW 6 flipped to the D2 contract + new rollback test |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

## Known baseline instability (not Phase 4 regressions)

Full suite: 208 passed / 58 failed / 43 skipped vs the Phase 3 baseline of
196/58/43 — failures unchanged; the +12 passes are the new Phase 4 tests.
`ErpTransactionIntegrityTest` drifted 20→21 within its pre-existing cluster:
`BalanceSheetDateTest` commits a hard-coded `AccCode=1001/AccName='Cash'`
account row that collides with IntegrityTest's `getOrCreateAccount` exact-
name lookup (setUp `UniqueConstraintViolationException` for the whole class,
including tests that never touch adjustments). Same fixture-repair backlog as
Phase 3; no adjustment-code involvement.

---

# PHASE 5 APPENDIX — STOCK TRANSFER (implemented 2026-09-30)

## Ratified contract kept

The transfer ledger applies at SAVE time (Phase 0/2 contract, pinned by
`InventoryMovementContractTest` FLOW 5): WAC moves from the source warehouse
to the destination at the outbound unit cost (no gain/loss), NO journal is
posted, and global `products.quantity` is untouched. Phase 5 did not change
this semantic — it hardened the implementation around it.

## New engine: `StockTransferService`

Single authority for transfers (`app/Services/Inventory/StockTransferService.php`):

- `createTransfer()` — one PAIRED document: source header (direction `out`,
  `reference_type='stock_transfer'`) + destination header (direction `in`,
  `reference_type='stock_transfer_destination'`, `reference_id=source id`),
  shared voucher `TR-YYYYMMDD-NNNN` (destination gets `-IN`). Lines are base-
  converted with `UnitConversionService` and priced by the WAC engine:
  outbound ICT (`stock_transfer_source`) at the applied WAC, inbound ICT
  (`stock_transfer_destination`) at the same unit cost. The created LINE MODEL
  drives the ICT `source_id` — fixes the old `items()->latest('id')` write
  race. Source line `cost_price` carries the ACTUAL WAC (the old code staged
  `cost_per_item` first).
- `updateTransfer()` — only while no ICT references the transfer
  (`isPosted()` checks ICT by `movement_header_id` with a legacy line-based
  fallback); rewrites lines in place (nothing ever touched the ledger);
  ownership re-asserted on the replacement inputs. Accepts legacy rows with
  NULL `reference_type`.
- `cancelTransfer()` — exact reversal via `WAC::reverse`: destination ICTs
  negated first, then source ICTs (`source_type='stock_transfer_cancellation'`,
  `reversal_of_id` set), dated `max(movement_date, today)`. Refused (whole
  cancel rolls back) when transferred stock was already consumed at the
  destination — same rule as the adjustment cancel. Writes MIRRORED audit
  documents (an `in` header at the source + an `out` header at the
  destination, both `reference_type='stock_transfer_cancellation'`) so the
  physical move-back is visible in stock-card history — this closes the
  mixed-cancel audit gap Phase 4 flagged for adjustments. Original headers
  are stamped `[CANCELLED date]` in `notes` (no schema change: the shared
  movement-header table has no status column; cancelled transfers disappear
  from edit/delete surfaces via the stamp + `posted` flag). Idempotent: an
  existing cancellation ICT short-circuits.
- Legacy pre-engine transfers without ICTs cannot be cancelled (reconciliation
  flags, Phase 7).

## Controller & API changes

- Controller delegates all ledger work to the service; `store`/`update`
  re-throw HTTP aborts (cross-company ownership → 404, tested) but convert
  engine `RuntimeException`s to session errors; `update`/`destroy` use
  redirect+error for missing ids (this module's isolation convention).
- NEW route `POST admin.inventory.stock-transfers.cancel` (`{id}`).
- `destroy()` keeps the audit guard: posted transfers are refused with a
  "cancel instead" message; unposted drafts delete cleanly.
- Index adds server-side search/pagination, a per-row `posted` flag
  (one distinct ICT query), and the `transferView` prop for the modal (Inertia
  partial reload `only=['transferView']` — the raw `show()` JSON endpoint
  remains for API consumers).

## Frontend rebuild

`TransferStock.jsx` rebuilt on the module conventions (AdminLayout, shared
serverSide Table, useForm/Inertia CSRF, BEM `stock-transfer-module`, localized
`t(key, fallback)`): list/create/edit modes, SearchableComboBox inputs,
status column (Applied/Cancelled from the stamp), explicit Actions column
(View + Cancel for applied rows; Edit/Delete additionally for unposted rows),
and a view modal served by the partial-reload prop (edit reuses the same
payload to fill the form).

## Test normalization

`StockTransferCrudTest` previously hijacked the DB connection to legacy DB
`u244683233_Zodicerp` in `setUp` — normalized to the standard test DB. Its
store test now seeds real WAC stock through the opening-stock engine (the
ledger applies at save, so zero-stock transfers legitimately fail) and its
products get units (the conversion engine refuses unitless products). BOTH
pre-existing failures are fixed: store creates records, update persists the
new date (the old code's ICT guard made update always fail silently behind a
302).

New `StockTransferLifecycleTest` (11 tests, 56 assertions): ledger contract
(movement pair, cost carry-over, balances, no journal, global quantity, ICT
source ids), insufficient-stock rollback, dozen→base conversion, exact
cancel reversal + mirrored audit docs + stamps, idempotent cancel,
consumed-stock cancel refusal + full rollback, posted-vs-draft edit/delete
rules, legacy-cancel refusal, same-warehouse refusal, cross-company 404s,
foreign cancel → ModelNotFound.

## Phase 5 files

| File | Change |
|---|---|
| `app/Services/Inventory/StockTransferService.php` | **new** — the transfer engine |
| `app/Http/Controllers/Backend/Inventory/StockTransferController.php` | rewritten — service delegation, cancel endpoint, posted flags, transferView prop |
| `routes/web.php` | `stock-transfers.cancel` route added |
| `resources/js/Pages/Backend/03-Inventory/TransferStock.jsx` | rebuilt on module conventions |
| `tests/Feature/StockTransferLifecycleTest.php` | **new** — 11-test battery |
| `tests/Feature/StockTransferCrudTest.php` | DB-hijack removed, fixtures seeded, both failures fixed |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No DB migrations: transfers live in `inventory_movement_headers` and the
lifecycle state is carried by `notes` stamps + ICT presence (a `status`
column on the shared table remains possible later if a workflow phase
requires it).

## Known baseline instability (not Phase 5 regressions)

Full suite: 220 passed / 57 failed / 43 skipped vs the Phase 4 baseline of
208/58/43. All 57 failures sit in the exact pre-existing clusters (Integrity
20, ApiAuth 9, Payroll 8, GRN 6, WAAI 3, PriceList 2, Blocker 2, six singles);
StockTransferCrudTest's 2 are FIXED. The ±1 wobble between runs is the
documented shared-DB residue instability (BalanceSheet/Integrity).

---

# PHASE 6 APPENDIX — GOODS RECEIPT (GRN) END-TO-END (implemented 2026-09-30)

## Ratified contract kept

GRN approval stays an inventory-only operation (decision D8, service docblock
unchanged): movements + ICT + derived quantity + PO/invoice accumulation, NO
journal — the Purchase Invoice is the sole financial trigger. Approval was
already idempotent and ICT-linked from earlier phases; Phase 6 closes the
company boundary, the fixture debt, and the missing reversal.

## Fixes

### 1. Company boundary (Phase 1-class hole closed)

`GoodsReceiptController` previously had NO company scoping: the index listed
every company's receipts, option lists were global, and route-model binding
let any user act on another company's GRN. Now:

- index: receipts, POs and warehouses scoped to `CompanyContext::id()`;
- every action (`show/approve/receive/check/cancel/reverse/destroy`) goes
  through `assertOwnedReceipt()` — a foreign receipt is a 404, indistinguishable
  from a missing one (this module's convention);
- `createGoodsReceipt` validates warehouse/product ownership up front (404,
  HTTP status preserved through the controller) and STAMPS `company_id` —
  the column existed but the service never wrote it (`company_id` added to
  the model's `$fillable`);
- approval back-fills `company_id` on legacy NULL rows from the approving
  user's context.

### 2. Approved-GRN reversal (new)

`cancelReceipt` refused approved receipts with "use a reversal instead" —
which did not exist. New `reverseReceipt()`:

- only approved receipts; idempotency FIRST via the `[REVERSED date]` movement
  stamp (so a second call returns unchanged even though the status is already
  the terminal value);
- every accepted detail's inbound ICT negated through `WAC::reverse`
  (`source_type='goods_receipt_reversal'`, `reversal_of_id` set), dated
  `max(receipt_date, today)`;
- derived `products.quantity` decremented by the original base quantity;
- movement stamped `[REVERSED date]` (stock-card visible); receipt status →
  `cancelled` (enum-compatible terminal state — no schema change);
- PO received quantities recomputed AFTER the status flip. `strict`-ness fix:
  `updatePurchaseOrderQuantities` now writes `received_quantity`
  UNCONDITIONALLY (clamped to ordered) so a reversal actually RESETS the
  accumulated figure, and returns the PO to plain `approved` when nothing
  remains received;
- refused (whole reversal rolls back) when the received stock was already
  consumed downstream — `WAC::reverse` refuses the negative balance.

### 3. Test fixture debt (the 6-failure cluster explained)

`GrnAccountingTest` seeded its product WITHOUT `unit_id` — the conversion
engine (correctly) refuses unitless products, so approval threw before any
assertion. Its `actingAs($user, 'sanctum')` left the DEFAULT guard empty, so
`CompanyContext` had no user even when the service worked. Fixed: product gets
`unit_id`, default-guard login. The username `grn-tester` also collided with
its own committed residue (unique index) — now uniqid-suffixed. `tearDown`
was hardened to warehouse-scoped, FK-ordered cleanup (reversal ICTs before
original ICTs, adjustments/movement lines before product+warehouse deletes)
so interrupted runs cannot poison the shared DB.

New tests (7 → 10): full reversal contract (balances, quantity, PO reset,
stamp, reversal ICT, idempotent re-call), refusal of non-approved receipts,
consumed-stock refusal with full rollback.

## Frontend

`GoodsReceipt.jsx`: the actions column now offers **Reverse** on approved
receipts (previously Cancel was offered to all drafts and silently refused
for approved ones).

## Phase 6 files

| File | Change |
|---|---|
| `app/Services/Vendor_Purchases/GoodsReceiptService.php` | company stamping + ownership validation + `reverseReceipt()` + unconditional PO resync |
| `app/Http/Controllers/Backend/Purchases/GoodsReceiptController.php` | rewritten — company scoping, `assertOwnedReceipt`, `reverse` endpoint |
| `app/Models/Vendor_Purchases/GoodsReceipt.php` | `company_id` fillable |
| `routes/web.php` | `goods-receipts.reverse` route |
| `resources/js/Pages/Backend/04-Purchases/GoodsReceipt.jsx` | Reverse action on approved receipts |
| `tests/Feature/GrnAccountingTest.php` | fixtures fixed + 3 reversal tests + hardened teardown |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No DB migrations (status enum reused; `company_id` columns already existed).

## Known baseline instability (not Phase 6 regressions)

Full suite after Phase 6: 233 passed / 56 failed / 34 skipped vs Phase 5's
220/57/43. Own-baseline failures 57 → 51: the GRN 6-cluster is FIXED. The
`InventoryRemediationTest` (5) failures belong to a parallel thread's
reference-type normalization work in flight on the same checkout and are not
assessed here. The ±1 run-to-run wobble remains the documented shared-DB
residue instability.

---

# PHASE 7 APPENDIX — INVENTORY RECONCILIATION (implemented 2026-09-30)

## Invariant enforced

The MOVEMENT LEDGER (headers + lines) and the WAC ledger (ICB/ICT) are the
truth; `products.quantity` is a DERIVED cache (doc invariant 8). The service
reports drift among all three layers and repairs through ledger-recorded
corrections — never silent rewrites (except the derived cache, which is a
pure write by definition).

## New engine: `ReconciliationService`

`app/Services/Inventory/ReconciliationService.php`:

- `report(warehouseId?)` — company-scoped: per product×warehouse movement-
  ledger quantity vs WAC balance (delta), legacy movement lines with no ICT
  behind them (`ict.movement_line_id` — the sales engine is exempt per
  §9.1's provenance exception), and derived-quantity drift
  (`products.quantity` vs ledger total). Returns mismatches + drift + summary.
- `resyncBalance(productId, warehouseId)` — direction-aware, and the test
  battery forced two design corrections:
  - **LEDGER > WAC (positive delta):** post the MISSING ICTs against the
    UN-COSTED movement lines themselves (chronological, at the current
    average). The movement ledger must NOT grow — a synthetic movement would
    add itself to the ledger it reconciles and the gap would chase forever.
    Bonus: the lines stop counting as legacy. Residual deltas without a host
    line fall back to a stand-alone `type='reconciliation'` correction
    document.
  - **WAC > LEDGER (negative delta):** decompose first. (a) Balance ≠ Σ ICT →
    the balance was tampered with outside the cost engine: recompute
    quantity/value/average from Σ ICT (no new rows). (b) Σ ICT itself exceeds
    the movement ledger (orphan cost transactions) → REFUSED with a
    manual-review message: voiding ICTs vs adding the missing movement is a
    human decision, and an auto-correction would chase the gap forever.
- `resyncDerivedQuantity(productId)` — pure cache rewrite of
  `products.quantity` from the movement ledger (all warehouses), no-op when
  already in line.

## Migration

`2026_09_30_000013_add_reconciliation_type_to_movement_headers` extends the
`inventory_movement_headers.type` enum with `'reconciliation'` (additive;
down remaps to `adjustment`). Applied to `zodicerp_testing`; **live `zodicerp`
NOT intentionally migrated** — it received the enum change accidentally via a
non-testing `php artisan migrate` and was immediately rolled back (0
reconciliation rows existed; verified). Runs at deploy.

## Surface

- Routes: `admin.inventory.reports.index` (now controller-served),
  `reports.resync-balance`, `reports.resync-derived`. The report runs as a
  query-string-triggered Inertia partial reload (`only=['report']`).
- `InventoryReports.jsx` rebuilt on module conventions: reconciliation section
  (warehouse filter, run button, mismatch/drift tables with per-row Post
  correction / Resync cache actions), summary badges, and the original report
  cards kept below.

## Test battery

`InventoryReconciliationTest` (8 tests, 37 assertions): clean-ledger report,
positive-delta repair via ICT-on-legacy-line (asserting NO synthetic
movement), tampered-balance recompute from Σ ICT, orphan-ICT refusal with
unchanged state, legacy-line flagging + repair, idempotent resync, derived
drift detection + resync, cross-company 404s.

## Phase 7 files

| File | Change |
|---|---|
| `app/Services/Inventory/ReconciliationService.php` | **new** — the reconciliation engine |
| `app/Http/Controllers/Backend/Inventory/InventoryReconciliationController.php` | **new** — report + resync endpoints |
| `routes/web.php` | reports.index now controller-served + 2 resync routes |
| `resources/js/Pages/Backend/03-Inventory/InventoryReports.jsx` | rebuilt with the reconciliation section |
| `database/migrations/2026_09_30_000013_add_reconciliation_type_to_movement_headers.php` | **new** — type enum + 'reconciliation' |
| `tests/Feature/InventoryReconciliationTest.php` | **new** — 8-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

## Known baseline instability (not Phase 7 regressions)

Full suite: 241 passed / 56 failed / 34 skipped vs Phase 6's 233/56/34 — the
+8 passes are this phase's battery; the failure composition is unchanged
(Integrity 20, ApiAuth 9, Payroll 8, parallel-thread Remediation 5, WAAI 3,
PriceList 2, Blocker 2, singles).

---

# Phase 8 — Sales Invoice posting hardening

Scope: make the sales invoice lifecycle (store → post → delete) safe in a
multi-company residue database: company stamping/scoping, posting
idempotency, atomic failure rollback, audit-preserving reversal. The §9.1
provenance exception and the journal account resolution (treasury/GL
coupling) are untouched — Phase 9 scope.

## Diagnosis (why WAAI + Blocker were red)

- `BlockerVerificationTest` (2): the shared `createTestAccount` helper
  inserted an `AccGroup` column that no longer exists in the accounts schema;
  the resolvers also require `AccStopped=0`, and `StockAdjustmentService`
  scopes accounts company-scoped (company_id = active OR NULL), which needs
  an authenticated company context.
- `WeightedAverageAccountingIntegrationTest` (3): customer fixtures fell back
  to hardcoded `customer_group_id = 1` (empty customer_groups → FK violation);
  products were unitless (`UnitConversionService` refuses); and once the FK
  errors stopped masking it, the return-journal assertion exposed that
  `SalesReturnService::createJournalEntryForReturn` SILENTLY SKIPS the
  journal when no AR account (`AccCode like '1.2%'`) resolves.

## Controller changes (SalesInvoiceController)

- `store()`: stamps `company_id = CompanyContext::id()` (was NULL — invisible
  to company-scoped queries), retries the generated invoice number against
  the global unique index (`withTrashed`), default warehouse picked from the
  company's own warehouses.
- `post()`: row-locked (`lockForUpdate`) idempotent posting; posting order is
  unchanged and load-bearing (journal applies the WAC outbounds → ICTs, bank
  receipt, then the movement step reads the ICT unit costs back — §9.1).
  Any failure rolls back everything (is_posted, journal, receipt, movements,
  ICTs, derived quantity).
- `update()` / `post()` / `destroy()`: `abort_unless(company match, 404)`;
  `destroy()` checks BEFORE its try/catch so the 404 is never swallowed into
  a session error.
- `destroy()` posted path now mirrors `GoodsReceiptService::reverseReceipt`:
  `WeightedAverageCostService::reverse` per outbound ICT (source_type
  `sales_invoice_reversal`), derived quantity incremented back, movement
  headers stamped `[REVERSED date]` — rows are KEPT, not deleted. The
  original journal is preserved and an idempotent `-REV` journal appended.
- The movement step keeps the invoice-referenced header-count idempotency
  gate. An ICT-based gate would false-positive: ICTs are written by the
  journal step BEFORE the movement step in the same post.

## Shared fixture helpers (tests/TestCase.php)

- `createTestAccount`: dropped the obsolete `AccGroup` insert.
- NEW `ensureTestCustomerGroup()`: first customer-group row (select-then-insert).
- NEW `ensureTestTreasuryAccount()`: a bank-nature, `AccStopped=0` account
  (insertOrIgnore + re-select for parallel-safe reruns).

## Legacy files un-skipped by the growing chart (accounts ≥ 10 guard)

`SalesInvoiceCogsTest`, `JournalReversalTest`,
`AccountingReversalIntegrityTest`, `PerpetualInventoryTest` skipped wholesale
while the residue DB had < 10 accounts; this phase's committed GL seeds
crossed the threshold and exposed latent rot — all fixed:

- customers `account_id ?? 61` FK fallback → nullable (FK is ON DELETE SET NULL).
- products without `unit_id` → unit helpers wired into `createTestProduct`.
- Perpetual: warehouses `name_ar` (column gone) / `warehouse_code` +
  `branch_id` (now NOT NULL); truncated static product_code/sku made unique;
  public calls into protected resolvers (SalesInvoiceController,
  PurchaseInvoiceController) routed through reflection.
- SalesInvoiceCogs / JournalReversal / AccountingReversalIntegrity now
  self-seed their GL rows in `setUp` (RefreshDatabase tests wipe the DB once
  per suite process; they cannot rely on pre-existing chart rows), and
  journal cleanup deletes lines before entries (FK). WAAI cleans its journals
  by reference in tearDown so reruns cannot collide on generated QID codes.

## Phase 8 battery

`SalesInvoicePostingLifecycleTest` (7 tests, 68 assertions): store stamps
company + creates a draft; post creates journal/movement/ICT with the WAC
cost and deducts; double-post idempotency; posting without stock rolls back
100%; cross-company post/delete → 404 and touch nothing; deleting POSTED
keeps the audit trail (original journal + -REV + [REVERSED] movements +
engine reversal ICT + stock restored); deleting DRAFT removes its UnPost
journal; movement step idempotent on re-run.

## Phase 8 files

| File | Change |
|---|---|
| `app/Http/Controllers/Backend/Client_Sales/SalesInvoiceController.php` | company stamping/scoping, row-locked idempotent post, WAC-engine reversal on delete |
| `tests/TestCase.php` | createTestAccount fix + ensureTestCustomerGroup/ensureTestTreasuryAccount |
| `tests/Feature/SalesInvoicePostingLifecycleTest.php` | **new** — 7-test lifecycle battery |
| `tests/Feature/WeightedAverageAccountingIntegrationTest.php` | group/unit/GL/AR fixtures + tearDown journal cleanup |
| `tests/Feature/BlockerVerificationTest.php` | AccStopped=0 + company context in setUp |
| `tests/Feature/SalesInvoiceCogsTest.php` / `JournalReversalTest.php` / `AccountingReversalIntegrityTest.php` | fixture rot fixes + self-seeding setUp |
| `tests/Feature/PerpetualInventoryTest.php` | warehouse/product fixture fixes + reflection resolvers |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations in this phase. Residue test-DB purges (orphan `QID-10001/2`
journal entries and their lines, leaked WAAI journals, truncated-code
Perpetual products) were manual one-off DELETEs; the fixtures now
self-clean.

## Phase 8 baseline

Full suite: **293 passed / 47 failed / 1 skipped** vs Phase 7's 241/56/34.
+52 passes: WAAI 3, Blocker 2, the four un-skipped legacy files (SIC 7,
JR 8, ARI 7, Perpetual 8 = 30; skips 34→1), PricingConversionSelling 1,
PriceList 2, plus this phase's battery (7). Remaining failures are the
unchanged baseline clusters: ErpTransactionIntegrityTest 20 (pre-existing
residue collision), ApiAuthorizationTest 9 (BadMethodCallException),
PayrollCoreTest 8 (QueryException), InventoryRemediationTest 5 (parallel
thread), and the singles (ProfessionCrud, ProductImportWorkflow,
ProductDomain, ProductBulkDeleteAndApi, BalanceSheetDate).

## Phase 9 outlook (scope unchanged)

- `upsertJournalEntryForInvoice` still requires a treasury account
  (GL/treasury coupling) — untouched in Phase 8 per plan.
- D8 re-confirm: no GRN journal.
- `SalesReturnService::createJournalEntryForReturn` silently skips the
  journal when AR resolution fails — candidate for a hard guard in a later
  phase.

---

# Phase 9 — Landed Cost audit + treasury/GL coupling review

## D8 re-confirmed

`GoodsReceiptService` approval remains inventory-only ("NOTE: No GL journal
entry is created here", service line ~148): movements + ICT + derived
quantity + PO/invoice accumulation, NO journal. D8 stands as ratified.

## Landed Cost audit findings + fixes

The value-only capitalization contract itself is sound (allocate
proportionally to accepted received value → post via WAC
`applyValueAdjustment` per allocation → LandedCost journal Dr 11401 / Cr
credit account). Audit found two boundary/math defects:

1. **Multi-company boundary was open.** Route-model actions operated
   cross-company. Fix: service-level `assertOwned` (abort 404) in
   `allocate/post/cancel/reverse`; `store()` now validates the purchase
   invoice belongs to the active company; `preview()` is ownership-guarded.
   The four controller actions follow the established catch convention
   (re-throw HttpException, convert RuntimeException to session errors).
2. **Reversal over-removed from WAC under partial consumption.**
   `reverse()` capped the WAC reversal at `min(inventory_value,
   allocated_amount)`, ignoring how much capitalization remained in the
   on-hand units (10 units capitalized +10/unit, 5 sold → the old code
   removed the full 100 from a 505 balance: WAC 450 vs the true
   pre-capitalization 500). Now:
   `remaining = min(allocated_amount, allocated_per_unit × on-hand qty,
   inventory_value)`; the consumed part flows through the existing
   `LandedCostReversalCorrection` (Dr Inventory / Cr COGS), so WAC and GL
   both return to the pre-capitalization state. Pinned with exact numbers.

## Treasury/GL coupling (Phase 8 deferred item)

1. **Sales invoice journals are now company-stamped** (header + lines;
   re-posting heals legacy unstamped rows; `JournalReversalService` already
   copies the original's company) — mirrors `LandedCostService`.
2. **Treasury validation**: the posting journal debits the treasury, so the
   account must belong to the invoice's company (NULL-company accounts are
   shared master data); otherwise RuntimeException → session error + full
   rollback.
3. **Design decision (documented, not changed)**: the sales journal debits
   the TREASURY account — a cash-sale model that couples GL and treasury.
   Retained as ratified; a full A/R subledger redesign remains a future
   decision (D9 candidate).

## BalanceSheetEquilibrium flake fixed

The fixture generated fully random 8-digit AccCodes while the balance sheet
classifies assets by AccCode prefix (`'10%'/'11%'`) — the equation flaked
randomly (±7777) depending on the draw. Fixture codes are now deterministic
asset-class codes (`'114'…`).

## Phase 9 battery

`LandedCostLifecycleTest` (7 tests): allocate + post happy path (proportional
allocation, WAC value capitalization, company-stamped journal, ICT
`landed_cost_allocation`, double-post idempotency); post requires allocation;
post refuses without remaining inventory; full reversal (WAC + -REV +
reversal ICT + idempotent terminal state); partial-consumption reversal
(exact remaining-capitalization math + consumed-cost correction); cancel
draft / refuse posted; cross-company 404s incl. foreign-invoice store.
Plus 2 treasury/GL tests in `SalesInvoicePostingLifecycleTest` (journal
company stamping; foreign treasury rejected with full rollback).

## Phase 9 files

| File | Change |
|---|---|
| `app/Services/Vendor_Purchases/LandedCostService.php` | assertOwned guards + reversal remaining-capitalization fix |
| `app/Http/Controllers/Backend/Purchases/LandedCostController.php` | invoice/store ownership guard, preview guard, catch convention |
| `app/Http/Controllers/Backend/Client_Sales/SalesInvoiceController.php` | journal company stamping + treasury ownership validation |
| `tests/Feature/LandedCostLifecycleTest.php` | **new** — 7-test battery |
| `tests/Feature/SalesInvoicePostingLifecycleTest.php` | +2 treasury/GL coupling tests |
| `tests/Feature/BalanceSheetEquilibriumTest.php` | deterministic asset-class fixture codes |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 9 baseline

Full suite: **302 passed / 47 failed / 1 skipped** vs Phase 8's 293/47/1.
+9 = the Phase 9 batteries; the failure list is byte-identical to the Phase
8 baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread
Remediation 5, singles: ProfessionCrud, ProductImportWorkflow, ProductDomain,
ProductBulkDeleteAndApi, BalanceSheetDate).

# Phase 10 — closing the updateStock hole (§11 rule 3)

## The hole

`POST /api/products/{id}/update-stock` → `ApiProductController::updateStock`
→ `ProductService::updateStock` mutated `products.quantity` raw
(increment/decrement/update), the last named §11 rule-3 offender. Stock
moved without a movement document, without WAC, without GL.

## Fix

`ProductService::updateStock` now routes every mutation through the
WAC-routed stock adjustment engine:

1. Company scoping (`firstOrFail` on company_id → 404 semantics) and the
   service early-return are unchanged from Phase 1.
2. The operation is normalized to a **signed delta** against the current
   global quantity (`add`/`subtract`/`set`; `|delta| < 1e-6` → no-op, nothing
   emitted).
3. The delta is applied through `StockAdjustmentService::createAdjustment`
   (reason `correction`, unit = the product's unit, unit_cost =
   `products.cost_per_item`) + `approveAdjustment` — **draft + approval
   wrapped in ONE transaction**, so a ledger refusal (subtract beyond
   available WAC stock) rolls back everything and leaves NO document behind,
   not even a draft. (The first implementation left an orphan draft on
   refusal; the battery caught it and the fix is atomicity.)
4. New private `resolveStockWarehouse()`: the warehouse holding the product's
   **largest WAC balance** in the caller's company, else the company's **first
   active warehouse** (never-stocked products); RuntimeException when the
   company has no active warehouse.

Endpoint contract unchanged (`stock_quantity` int ≥ 0, operation
`set|add|subtract`; invalid → 422).

## Behavior notes

- `'set' N` against a legacy product whose raw quantity predates the engine:
  delta = N − raw quantity; positive → `applyInbound` at `cost_per_item`,
  negative → `applyOutbound` at the current warehouse WAC. From then on the
  quantity is engine-maintained.
- **Unitless products are refused**: the movement contract requires a unit
  (`UnitConversionService::toBase` throws) → API surfaces a 500. This is
  deliberate data-quality enforcement (Phase 1 contract); fixtures that call
  updateStock must seed `unit_id`.
- WAC balance 0 + negative delta → `RuntimeException` from the ledger, full
  rollback, nothing persisted.

## Import remainder (documented, NOT changed — one-phase scope)

`ProductsController::bulkImport` writes `'quantity' => $row['quantity'] ?? 0`
via `updateOrCreate` (name + company):

- **CREATE** branch: initial quantity = implicit opening stock (creation-time
  initial state, same class as the store flow) — not a §11 rule-3 runtime
  mutation.
- **UPDATE** branch: overwrites the engine-maintained quantity — a genuine
  residual hole of the same species. It needs its own phase: bulk import is
  Excel-driven, has no guaranteed unit at import time (engine routing
  requires one), and needs a warehouse policy decision. Top candidate for the
  next inventory phase. §11 names only updateStock + the route as offenders;
  this phase closes exactly those.

## Phase 10 battery

`UpdateStockLifecycleTest` (10 tests, residue-safe — every ledger assertion
scoped to fixture rows, never bare table counts): set routes through the
engine (approved `correction` adjustment, inbound movement header + line, ICT
at `cost_per_item`, derived quantity, WAC balance, balanced GL journal
11401/adjustment, header/ICT warehouse agreement); add at entered cost;
subtract consumes at the current WAC (outbound doc + ICT at WAC, exact
balance/value); subtract beyond stock refused with NOTHING persisted
(atomicity); noop emits nothing; services ignored; cross-company refused;
warehouse resolution prefers the largest WAC balance (delta lands there,
other warehouse untouched); HTTP happy path (200 + engine artifacts); HTTP
invalid operation (422 + nothing persisted).

`InventoryCompanyIsolationTest` fixture fixes: `product()` now seeds
`unit_id` + `cost_per_item`; the own-company updateStock test creates a
company warehouse (fallback resolution target). Both updateStock tests now
exercise the real engine.

## Phase 10 files

| File | Change |
|---|---|
| `app/Services/ProductService.php` | updateStock engine-routed + atomic; `resolveStockWarehouse()` |
| `app/Http/Controllers/Api/ProductController.php` | docblock only (route/validation untouched) |
| `tests/Feature/InventoryCompanyIsolationTest.php` | product() unit+cost; warehouse in own-company test |
| `tests/Feature/UpdateStockLifecycleTest.php` | **new** — 10-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 10 baseline

Full suite: **312 passed / 47 failed / 1 skipped** vs Phase 9's 302/47/1.
+10 = the Phase 10 battery; failure clusters byte-identical to the Phase 9
baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread Remediation
5, singles: ProfessionCrud, ProductImportWorkflow, ProductDomain,
ProductBulkDeleteAndApi, BalanceSheetDate).

## Outlook

- `ProductsController::bulkImport` quantity-on-update (above) — next
  inventory phase candidate.
- SalesReturnService silent AR-skip (Phase 9 note) — still open.
- ProductDomainTest's 1 baseline failure (test-internal FK fixture,
  parent_id 999999999) is pre-existing and outside the inventory module.

# Phase 11 — closing the bulkImport quantity-on-update remainder

## The remainder (from Phase 10)

`ProductsController::bulkImport` carried `'quantity' => $row['quantity'] ?? 0`
in the `updateOrCreate` payload for BOTH branches: re-importing a catalog
overwrote `products.quantity` raw — and, worse, a re-import whose rows lacked
the column **zeroed live stock** (the `?? 0` default), all bypassing WAC and
the movement ledger.

## Decision: the UPDATE branch explicitly ignores quantity

Of the two sanctioned alternatives (engine-route where unit + warehouse are
resolvable, or explicit ignore + document), explicit ignore was chosen:

1. Import is a **master-data surface**; stock is inventory-module data. The
   clobber existed precisely because one HTTP surface had two competing
   writers for stock.
2. Re-imported catalogs carry **stale snapshots**; auto-adjusting live stock
   to a stale quantity can silently write off real stock — a worse business
   hazard than routing would fix. If an operator wants the snapshot applied,
   that is an explicit Stock Adjustment, not an import side effect.
3. Engine-routing the update branch would give bulk rows partial,
   unpredictable semantics (unit resolvable for some rows only; a negative
   delta vs WAC refuses and would roll back the ENTIRE import transaction).
4. The resulting rule is crisp and testable: **quantity is written once at
   creation as implicit opening stock; thereafter only the movement engine
   mutates it.**

Implementation: `bulkImport` now does an explicit
`where('name')->where('company_id')->first()` and branches — existing
products are `$product->update($payload)` with `quantity` deliberately
omitted; new products are `Products::create($payload + ['quantity' => …])`.
Match semantics are unchanged (same lookup keys, same first-match order,
same trashed-product behavior as `updateOrCreate`'s default scope).

## CREATE branch reaffirmed (documented, unchanged)

A new product's row quantity is its **implicit opening stock** —
creation-time initial state, same class as the store flow (Phase 10
appendix). It emits no movement documents; until the product is stocked
through the engine (Opening Stock / GRN / adjustment / update-stock), its
WAC balance is 0 and outbound ledger operations refuse — the standard
legacy-shaped-stock contract.

## Import surface audit

- The CSV preview/confirm import referenced by `ProductImportWorkflowTest`
  (`admin.inventory.products.import.preview/confirm`) **does not exist** in
  the app — the test's baseline failure is `RouteNotFoundException`. The
  only live import surface is `POST admin.inventory.products.bulkImport`
  (JSON `rows`), now policy-pinned. The dead test is NOT this module's
  baseline to fix (out-of-inventory-scope cleanup candidate).
- `bulkImport`'s unit handling (row `unit` name → match/create `ItemUnit` →
  `unit_id`) is unchanged and now also benefits updates: an import can
  still attach a unit to an existing unitless product (master data).

## Phase 11 battery

`ProductImportStockPolicyTest` (6 tests): update with stale quantity never
touches stock (master data still applies); update without quantity key does
not zero stock; create-then-reimport roundtrip preserves stock (the exact
operator flow that used to clobber); create takes initial quantity (opening
stock, no engine artifacts); create without quantity defaults to 0;
same-name product in another company is fully isolated (lookup is
company-scoped — foreign stock/price untouched). Engine-artifact assertions
are residue-safe (scoped to fixture product ids).

## Phase 11 files

| File | Change |
|---|---|
| `app/Http/Controllers/Backend/Inventory/ProductsController.php` | bulkImport: explicit create/update branch, quantity only on create |
| `tests/Feature/ProductImportStockPolicyTest.php` | **new** — 6-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 11 baseline

Full suite: **318 passed / 47 failed / 1 skipped** vs Phase 10's 312/47/1.
+6 = the Phase 11 battery; failure clusters byte-identical to the Phase 9/10
baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread Remediation
5, singles: ProfessionCrud, ProductImportWorkflow, ProductDomain,
ProductBulkDeleteAndApi, BalanceSheetDate).

## Outlook

- `products.quantity` writers are now exactly two classes: creation-time
  initial state (store / import-create) and the movement engine's derived
  delta. §11 rule 3 is fully closed.
- SalesReturnService silent AR-skip (Phase 9 note) — still open.
- Dead `import.preview/confirm` routes in ProductImportWorkflowTest —
  candidate for a test-hygiene cleanup phase (out of inventory scope).

# Phase 12 — closing the sales-return silent AR-skip

## The defect (Phase 9 outlook item)

`SalesReturnService::createJournalEntryForReturn` resolved AR
(customer.account_id, falling back to an `AccCode like '1.2%'` AccType-1
account) and revenue (`AccCode like '4%'`, AccType-1). When either resolved
to null, the method **silently returned** — the approved/completed return
still created stock movements, the WAC inbound, and the derived
`products.quantity` delta, but no credit note ever reached the books: a
company could give stock back with no AR reduction and no revenue reversal.
A second partial skip hid inside the COGS block (missing inventory/COGS
accounts dropped those lines while the revenue/AR lines posted).

## Fix: the GL is an all-or-nothing contract

`createJournalEntryForReturn` now throws
`RuntimeException('Sales return cannot be posted: no Accounts Receivable
and/or Revenue account is configured…')` instead of skipping. The callers
(`createSalesReturn` / `updateSalesReturn`) run inside `DB::transaction`,
so the whole return rolls back: no journal, no return document, no details,
no movements, no ICTs, no derived quantity change. Unseeded test/legacy
contexts must seed the accounts first — the standard contract of every
other GL-integrated flow (StockAdjustmentService, SalesInvoiceController,
LandedCostService). `SalesReturnController`'s generic `\Exception` catch
converts the refusal into a session error (RuntimeException convention).

The COGS sub-block keeps its conditional lines BY DESIGN: the revenue/AR
pair is the credit note's identity (mandatory), while the COGS reversal is
value-dependent (`calculateCogsReversalAmount` = 0 for returns of unsold
or historically-free stock — there is legitimately nothing to post).

## Cross-impact audit (all green, no behavioral surprise)

- `WeightedAverageAccountingIntegrationTest` and `SalesInvoiceCogsTest`
  already required the return journal (they assert its 11401/501 lines) and
  seed resolvable accounts — unchanged.
- `InventoryMovementContractTest` seeds AR (`1.2.100`) + revenue (`41000`);
  its approved-return flow now simply posts the journal it never posted
  before (no assertion referenced the skip).
- `BlockerVerificationTest` only invokes resolvers — untouched by the gate.

## Known issue found en route (Phase 13 candidate)

Retracting an APPROVED return (`updateSalesReturn` approved → draft) is
broken at the FK layer, **independently of this phase**:
`reverseStockMovementsForReturn` deletes `inventory_movement_lines` while
WAC ICTs hold `ict_movement_line_fk` references → SQLSTATE 23000. The
defect predates Phase 12 (ICTs carried line links in the silent-skip era
too); no prior test exercised retraction. Phase 12's battery pins the
journal side of retraction (P0-06 reversal) via a draft→approve re-post
test instead, and documents the defect. Fix belongs to an engine-routed
retraction phase: WAC::reverse per detail ICT + derived-quantity rollback
+ immutable movement documents (mirroring
`StockAdjustmentService::cancelAdjustment`) instead of raw deletes.

Also noted, unchanged: the return journal is not company-stamped
(header/lines lack company_id), unlike the Phase 9 sales-invoice fix —
same-class candidate for the retraction/JAL phase.

## Phase 12 battery

`SalesReturnJournalContractTest` (5 tests, residue-safe): approved return
posts the FULL credit note (Dr Revenue 24 / Cr AR 24 + historical-cost COGS
reversal Dr 11401 / Cr 501 12, balanced entry) with the stock side intact;
completed return posts identically; draft writes no journal and no stock;
draft→approve re-posts exactly once (one entry, one movement, one ICT,
quantity applied once); posting without GL accounts fails loudly with
NOTHING persisted (no journal, no return row, no movement, no ICT, quantity
untouched — accounts deleted inside the test transaction, restored on
rollback).

## Phase 12 files

| File | Change |
|---|---|
| `app/Services/Client_Sales/SalesReturnService.php` | AR-skip → RuntimeException gate (all-or-nothing credit note) |
| `tests/Feature/SalesReturnJournalContractTest.php` | **new** — 5-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 12 baseline

Full suite: **323 passed / 47 failed / 1 skipped** vs Phase 11's 318/47/1.
+5 = the Phase 12 battery; failure clusters byte-identical to the
Phase 9–11 baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread
Remediation 5, singles: ProfessionCrud, ProductImportWorkflow,
ProductDomain, ProductBulkDeleteAndApi, BalanceSheetDate).

## Outlook

- **Phase 13 candidate**: engine-routed sales-return retraction (FK break
  above) + company-stamp the return journal while in there.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 13 — engine-routed sales-return retraction + return-journal company stamp

## The defect (Phase 12 known issue)

Retracting a posted return (`updateSalesReturn` approved → draft) called
`reverseStockMovementsForReturn`, which raw-deleted
`inventory_movement_lines` while `inventory_cost_transactions` rows held
`ict_movement_line_fk` references → SQLSTATE 23000, rolling back the whole
retraction. Worse, the design was wrong twice over: even where deletes
succeeded the WAC ledger was never un-applied, and deleting documents
destroyed audit history.

## Fix 1: engine-routed retraction (immutable documents)

`reverseStockMovementsForReturn` no longer deletes anything. It pairs the
return's applied ICTs with their immutable movement lines (see Fix 2 for
why pairing is by line, not detail) and, per un-reversed ICT:

- `WeightedAverageCostService::reverse(originalTxId, today,
  'sales_return_detail_reversal', originalTxId)` — the engine writes an
  offsetting ICT at the ORIGINAL unit cost, keeping the original's
  `movement_header_id`/`movement_line_id` and setting `reversal_of_id`,
  and **refuses** (`RuntimeException('Inventory already consumed; the
  original cost transaction cannot be reversed.')`) when the warehouse's
  ledger balance would go negative — the caller's transaction rolls the
  entire retraction back (no ledger, document, quantity or journal
  residue). This is the consumption guard: returned-and-resold stock
  cannot be silently retracted.
- The derived `products.quantity` rolls back by the original ICT's
  `quantity_delta` (the engine is ledger-only; callers own the derived
  column — same contract as application).
- A reversal document records the round trip: header type `sale_return`,
  direction `out`, `reference_type 'sales_return_reversal'`, voucher
  `<return_number>-REV`, lines at `abs(quantity_delta)`/original unit cost
  (same magnitude convention as `StockTransferService` reversal lines).

Original headers, lines and ICTs are never touched. Idempotent: no
un-reversed `sales_return_detail` ICTs → no-op. Reversal ICTs carry their
own `source_type` + `reversal_of_id`, so they are never re-reversed.

## Fix 2: detail ids are not stable — pair by movement line

`updateSalesReturn` recreates `sales_return_details` (delete + create)
BEFORE the transition effects run, so a retraction sees detail ids that
never touched the ledger; the old detail-id-keyed ICT lookup found nothing
and silently no-opped. Movement lines are immutable and survive the whole
round trip, so the retraction looks up ICTs by
`tx.movement_line_id IN (return's movement lines)` + source_type
`sales_return_detail` + `reversal_of_id IS NULL` + `NOT EXISTS` a
`sales_return_detail_reversal` ICT pointing back (`reversal_of_id`), and
sources reversal-line units/cost from the original movement line (ICT has
no unit_id column). Also fixed en route: the create-side now passes the
real `inventory_movement_lines` id to `applyInbound` (was a re-query of
`latest('id')`, race-prone under parallel traffic).

## Fix 3: the create guard is ICT-based, not document-based

The pre-Phase-13 guard skipped `createStockMovementsForReturn` whenever a
`sales_return` header existed — under immutable documents that would
forever block re-approval after a retraction. The guard now skips only
when un-reversed `sales_return_detail` ICTs exist for the return's
movement lines (never applied → proceed; applied → skip; retracted →
proceed). An empty header shell (legacy raw-delete era) also proceeds.
Re-approval after retraction legitimately records a second application
round: two `sales_return` headers, exactly one un-reversed ICT, quantity
applied exactly once.

## Fix 4: return-journal company stamp (Phase 9 symmetry)

`createJournalEntryForReturn` resolves `$companyId` from
`$return->company_id` (fallback `Auth::user()->company_id`) and stamps the
header (create + the legacy-heal update) and every line — mirroring the
Phase 9 sales-invoice stamp, so trial-balance company scoping sees credit
notes. `JournalReversalService::createReversal` already stamped reversal
headers but dropped `company_id` on copied lines; reversal lines now
inherit the original line's stamp (fallback: the original header's).

## Fix 5 (defect found by the new battery): a reversed journal slot is never resurrected

The retract → re-approve round trip exposed a live books-corruption path:
`createJournalEntryForReturn` reused the reference's existing entry code,
deleting and re-posting its lines — but that slot already had a standing
`-REV` from the retraction, so the re-posted credit note was exactly
cancelled by the standing reversal (approved return, zero net books).
`createJournalEntryForReturn` now skips an existing header whose
`<code>-REV` exists and posts a fresh entry; `reverseJournalEntryForReturn`
finds the LIVE entry for the reference (latest without a standing `-REV`,
fallback last). Reversed entries survive as immutable audit history; the
live entry is exactly the one without a reversal.

## Phase 13 battery

`SalesReturnJournalContractTest` grew 5 → 9 tests (all residue-safe,
scoped by fixture ids/lines): approved → draft retraction (original ICT +
movement documents preserved; reversal ICT at original cost keeping the
original movement-line link with `reversal_of_id`; `-REV` header direction
`out`; quantity rolled back to 0; original journal preserved + offsetting
`-REV` entry; retraction idempotent under a second draft update);
retraction refused when the returned units were consumed downstream
(RuntimeException, zero residue anywhere — ledger, lines, quantity,
journal); retracted → re-approved (fresh ICT + quantity exactly once,
second application-round header, exactly one live credit-note entry with
the retraction reversal preserved once); company stamp on the return
journal (header + every line).

## Phase 13 files

| File | Change |
|---|---|
| `app/Services/Client_Sales/SalesReturnService.php` | engine-routed retraction (WAC::reverse + qty rollback + `-REV` document), line-keyed ICT pairing, ICT-based create guard, real movement-line id into `applyInbound`, reversed-slot guard + live-entry lookup, company stamp |
| `app/Services/Accounting/JournalReversalService.php` | reversal lines inherit the company stamp |
| `tests/Feature/SalesReturnJournalContractTest.php` | battery 5 → 9 tests |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 13 baseline

Full suite: **327 passed / 47 failed / 1 skipped** vs Phase 12's 323/47/1.
+4 = the new Phase 13 battery tests; failure clusters byte-identical to
the Phase 9–12 baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8,
parallel-thread Remediation 5, singles: ProfessionCrud,
ProductImportWorkflow, ProductDomain, ProductBulkDeleteAndApi,
BalanceSheetDate). Battery 9/9; neighbors green: WAAI, SalesInvoiceCogs,
InventoryMovementContract, BlockerVerification, JournalReversal, ARI,
WAC engine + concurrency (45 tests).

## Outlook

- The lifecycle journal contract (Fix 5) still keys on `reference` +
  `entry_type` with code-suffix probing; a dedicated
  `journal_reversals`-style link table would make "live entry" a join, not
  a convention — candidate for a cross-document GL phase.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 14 — purchase-return retraction + debit-note GL contract (the Phase 13 pattern, vendor side)

## Audit findings (pre-Phase-14 `PurchaseReturnService`)

The purchase side had the SAME defect family the sales side grew out of in
Phases 12–13 — none of it ever tested (`updatePurchaseReturn` had zero test
coverage):

1. **Silent AP-skip**: `createJournalEntryForReturn` silently returned when
   AP or Inventory Asset could not be resolved — stock left inventory with
   no debit note in the books (the exact Phase 12 sales-side defect).
2. **Retraction silently kept the stock effect**: posted → draft
   retracted ONLY the journal; the movement, WAC outbound ICT and derived
   `products.quantity` stayed — goods were gone from the shelf while the
   return claimed "not posted".
3. **Amendment double-returned stock**: posted→posted re-posted the journal
   but never retracted the ledger, so every amendment took the stock out
   again (also invisible: the create-side guard was detail-id keyed and
   details are SOFT-deleted on update, so the old ids no longer appeared).
4. **AP fallback could resolve an expense**: `AccCode like '2%' AND
   AccType 1` — the committed test chart literally carries 2131 Input Tax
   at AccType 1, so the "AP reduction" could post to Input Tax.
5. **No company stamp** on the debit-note header or lines.

## Fixes (mirroring Phase 12 + 13)

- **GL all-or-nothing**: missing AP/Inventory Asset →
  `RuntimeException('Purchase return cannot be posted: no Accounts Payable
  and/or Inventory Asset account is configured…')`; the caller's
  `DB::transaction` rolls back the whole return (document, details,
  movements, ICTs, quantity). The Input-Tax line stays conditional BY
  DESIGN (value-dependent: zero-tax returns have no tax line).
- **Engine-routed retraction** (`reverseInventoryEffectsForReturn`, new):
  per un-reversed `purchase_return_detail` ICT,
  `WeightedAverageCostService::reverse()` writes the offsetting INBOUND ICT
  at the ORIGINAL unit cost (keeping original movement header/line links,
  carrying `reversal_of_id`), the derived quantity rolls back via
  `decrement(quantity, signed delta)` — outbound originals carry NEGATIVE
  deltas, so signed decrement is the uniform rollback rule (the first
  draft used `increment(abs)` and doubled the outbound; caught by the
  battery) — and a `-REV` movement document (type `purchase_return`,
  direction `in`, voucher `<number>-REV`) records the round trip. Nothing
  is ever deleted. For outbound originals the engine refuses only on
  negative VALUE — quantity always adds back — so consumption of the
  remaining stock is refused at APPLY time (`Insufficient weighted-average
  inventory`), which is what protects the amendment path.
- **ICT-based guards** (create + retraction): keyed by
  `tx.movement_line_id IN (return's movement lines)` + source_type +
  `reversal_of_id IS NULL` + `NOT EXISTS` a `purchase_return_detail_reversal`
  ICT pointing back — never by detail ids (soft-deleted/unstable).
- **Reversed journal slot never resurrected + live-entry lookup**: same
  Phase 13 Fix 5 pattern for the `PurchaseReturn` entry type.
- **Company stamp**: header (create + legacy-heal update) + every line
  carry `$return->company_id`; `purchase_returns.company_id` is now written
  on create (and added to `$fillable` — it was silently dropped before).
- **AP fallback tightened to AccType 2** (liability), symmetric with the
  Phase 12 AccType-1 AR fallback.

## Phase 14 battery

`tests/Feature/PurchaseReturnJournalContractTest.php` (new, 8 tests,
residue-safe, fixture-scoped): approved return posts the FULL debit note
(Dr AP 120 / Cr 11401 120, balanced, header + lines stamped, WAC-seed-
ledger-only derived −6); completed identical; draft posts nothing; missing
GL accounts fail loudly with NOTHING persisted; approved → draft retraction
(original ICT + documents preserved; reversal ICT at original cost keeping
the original movement-line link; `-REV` header direction `in`; quantity
rolled back; original journal + offsetting `-REV` entry; idempotent);
approval with no stock refused (`Insufficient weighted-average inventory`,
zero residue); retract → re-approve (fresh ICT via NOT-EXISTS "un-reversed"
predicate, quantity exactly once, second application-round header, exactly
one live debit-note entry with the retraction reversal preserved once);
AP fallback reflection pin (AccType 2, not the AccType-1 Input-Tax trap).

## Phase 14 files

| File | Change |
|---|---|
| `app/Services/Vendor_Purchases/PurchaseReturnService.php` | GL gate, engine-routed retraction + amendment stock rebuild, ICT-based guards, reversed-slot guard + live-entry lookup, company stamp, AP fallback AccType 2, journal order (stock before journal) |
| `app/Models/Vendor_Purchases/PurchaseReturn.php` | `company_id` fillable |
| `tests/Feature/PurchaseReturnJournalContractTest.php` | **new** — 8-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 14 baseline

Full suite: **335 passed / 47 failed / 1 skipped** vs Phase 13's 327/47/1.
+8 = the new Phase 14 battery; failure clusters byte-identical to the
Phase 9–13 baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread
Remediation 5, singles: ProfessionCrud, ProductImportWorkflow,
ProductDomain, ProductBulkDeleteAndApi, BalanceSheetDate). Battery 8/8;
neighbors green: InventoryMovementContract (purchase-return flow), WAAI
(purchase-return journal path), BlockerVerification, PerpetualInventory,
WAC engine + concurrency, SalesReturnJournalContract (37 tests).

## Outlook

- The same audit is owed to the remaining untested lifecycle paths that
  write ICTs: goods-receipt cancellation, landed-cost reversal, and any
  other `reverseJournalEntry*`-style sibling still doing raw deletes —
  sweep candidate for a later phase.
- The lifecycle journal contract still keys on `reference` + `entry_type`
  with code-suffix probing; a `journal_reversals` link table would make
  "live entry" a join — cross-document GL phase.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 17 — the `journal_reversals` link table: "live entry" is a join, not a convention

## Why

Phases 13–15 repeatedly needed the same question answered: *which journal
entry is the LIVE one for this document reference?* The answer lived in a
code-suffix convention — probe for a `<entry_code>-REV` sibling — duplicated
across both return services and the reversal service, invisible to the
schema, and unanswerable for a code whose history was ambiguous.

## The design

`journal_reversals` (migration + `JournalReversal` model): one edge row per
original → reversal pair (`original_entry_code`, `reversal_entry_code`
unique, `company_id`). The reversal ENTRY CODE keeps the `-REV` naming
(readable stock cards, existing assertions); the RELATIONSHIP is the table.

- **Recording** — `JournalReversalService::createReversal` writes the edge
  via `updateOrCreate` keyed on `reversal_entry_code`: if an entry is
  deleted and a new one is posted into the same code slot, the edge
  re-points — exactly the suffix-probing semantics (a reversed slot is
  never silently resurrected).
- **Legacy backfill** — `findReversalEdge` backfills pre-table `-REV`
  siblings on first read (`like '<code>-REV%'`), so the join is
  authoritative for existing history too.
- **Self-healing** — an edge whose reversal ENTRY no longer exists is
  STALE (legacy unposted-delete paths, cleanup jobs, non-transactional
  residue) and is dropped: it must not report a standing reversal, or
  idempotent re-reversal returns null forever. (Found live during this
  phase: non-transactional suites clean their journals but not the new
  table; committed stale edges briefly broke `createReversal` for reused
  codes like QID-10004 — the self-heal makes that class of residue
  harmless, and the stale rows were purged once.)
- **`liveEntryFor(reference, entryType)`** — the shared resolver both
  return services (and `StockAdjustmentService`) now use: backfill →
  earliest entry of the reference without a recorded reversal → fallback
  last candidate. REVERSAL entries are NEVER candidates (excluded via the
  link table + suffix check): without that, a retract → re-approve round
  trip re-adopts the retraction's own `-REV` entry as the live note and
  overwrites the retraction's audit trail (caught by the P13/P14 batteries
  mid-phase).
- `hasReversal`/`getReversal`/`verifyReversalBalance` all resolve through
  the table now; suffix probing is retired from the GL question entirely.

## Migration safety

`php artisan migrate --env=testing --path=<file> --force` only — the live
`zodicerp` DB is never touched (protocol invariant). The test DB gains the
table; production rollout is a normal forward migration with no data
rewrite (edges accrue lazily via backfill).

## Phase 17 battery

`tests/Feature/JournalReversalLinkTableTest.php` (new, 5 tests,
transactional, pure service-level): createReversal records the edge and
answers idempotently from it; legacy `-REV` siblings backfill on first
read; stale edges self-heal and unblock re-reversal; liveEntryFor skips
reversed entries and never returns a reversal document; ambiguous history
falls back to the reversed original, never its reversal.

## Phase 17 files

| File | Change |
|---|---|
| `database/migrations/2026_10_01_000001_create_journal_reversals_table.php` | **new** — the link table |
| `app/Models/Accounting/JournalReversal.php` | **new** — the edge model |
| `app/Services/Accounting/JournalReversalService.php` | edge recording, backfill, self-heal, `liveEntryFor`, link-based `hasReversal`/`getReversal`/`verifyReversalBalance` |
| `app/Services/Client_Sales/SalesReturnService.php` | live-entry + recorded-reversal helpers via the service (suffix probes removed) |
| `app/Services/Vendor_Purchases/PurchaseReturnService.php` | same |
| `app/Services/Inventory/StockAdjustmentService.php` | same-family live-entry migration |
| `tests/Feature/JournalReversalLinkTableTest.php` | **new** — 5-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

## Phase 17 baseline

Full suite: **370 passed / 47 failed / 1 skipped** vs Phase 16's 343/47/1.
+5 = the Phase 17 battery; the remaining ~22 are the PARALLEL THREAD's
additions landing mid-session (`GeneralLedgerCharacterizationTest` and
related) — the failure set is byte-identical to the Phase 9–16 baseline
(ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread Remediation 5,
singles: ProfessionCrud, ProductImportWorkflow, ProductDomain,
ProductBulkDeleteAndApi, BalanceSheetDate). Battery 5/5; neighbors green:
JournalReversal, ARI, both return batteries, P15/16 battery, StockAdjustment
Lifecycle, SIPL, SalesInvoiceCogs, InventoryMovementContract, WAAI,
GrnAccounting, LandedCostLifecycle, BlockerVerification,
PerpetualInventory, WAC engine + concurrency (115 tests).

## Outlook

- The link table is written by `createReversal` only; direct
  `JournalEntry::create` of a `-REV` code elsewhere (none found in `app/`)
  would bypass the edge — the backfill + self-heal make that safe-by-
  repair, but a service-level choke point is the long-term shape.
- `SalesInvoiceController`'s `createReversalForInvoice`/`deleteJournalEntry
  ForInvoice` still take the first entry by reference (safe today: posted
  invoices cannot be edited, so a reference owns one entry); migrating them
  to `liveEntryFor` is a one-liner if that invariant ever changes.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 15 — the remaining-ICT-lifecycle sweep: audit clean, one latent reversal defect fixed (sales-invoice ICT provenance)

## Audit result: the engine-routed pattern is already universal

Enumerated every ICT writer/reverser (`applyInbound`/`applyOutbound`/
`applyValueAdjustment`/`reverse` call sites), every direct write to
`inventory_cost_transactions` / `inventory_cost_balances` (only the WAC
engine itself), and every raw delete of inventory tables (**zero** found):

- **Goods receipt** — `reverseReceipt` (Phase 6) is the model citizen:
  `WAC::reverse` per ICT + derived decrement + `[REVERSED]` stamp + PO/PI
  recompute, idempotent, refuses consumed stock. `cancelReceipt` only
  flips non-approved receipts (no effects to retract).
- **Stock transfer** — cancellation reverses both legs through the engine
  + mirrored `-REV` documents; never touches derived quantity (confirmed
  policy).
- **Stock adjustment** — `cancelAdjustment` engine-routed (Phase 4).
- **Opening stock** — re-entry reverses via the engine with
  `reversal_of_id`; no-ICT legacy rows skip cleanly.
- **Landed cost** — `reverse` writes `landed_cost_reversal`
  value-adjustments for the REMAINING capitalized value only (Phase 9
  audit), posts a consumed-cost COGS correction for the rest. Value-only
  reversal is correct here by design: a value adjustment changes no unit
  quantity, so there is nothing quantity-wise to retract, and the WAC
  average stays internally consistent.
- **Purchase invoice** — reconciliation postings are forward-only value
  trues-up (documented Phase 5/6 policy), never retracted.
- **ReconciliationService** — is the hardening layer itself (legacy ICT
  backfill, balance recompute, manual-review refusal).

One real defect surfaced inside the only controller-owned reversal path
(`SalesInvoiceController::reverseStockMovementsForInvoice`).

## The defect: sales-invoice ICTs had NO movement-line provenance

The posting order (journal step first — kept, since it makes an
insufficient-stock failure roll back before any ledger row is written,
pinned by SIPL) applied the WAC outbounds inside
`upsertJournalEntryForInvoice` via `calculateCogsAmount`, which passed no
movement ids; the movement step then inserted lines separately. Sales ICTs
were the only rows in the system with NULL
`movement_header_id`/`movement_line_id`, so unposting had to GUESS
provenance by `product_id + original_quantity → first()`:

- an invoice with two same-shape lines (same product, same quantity)
  reversed the FIRST detail's ICT twice (idempotent no-op on the second
  call) and NEVER reversed the second — the ledger stayed short by one
  line's quantity AND value while the shelf was fully restored: silent
  books-vs-shelf divergence (the Phase 14 divergence family again);
- a stale reversal round made `first()` permanently skip the live ICT.

## Fix: line-then-link provenance + exact per-line reversal

- Posting (`createStockMovementsForInvoice`): each movement line is
  created BEFORE its detail's outbound ICT is linked to it
  (`movement_header_id` + `movement_line_id`), with the ICT passed in
  memory from the journal step (idempotent re-read as fallback for the
  reflection-driven one-step callers). A `whereNull('movement_line_id')`
  guard means never rewriting an already-linked ICT. COGS still values the
  journal from the APPLIED ICTs (never document arithmetic).
- Unposting (`reverseStockMovementsForInvoice`): pairs each applied ICT
  with its OWN line via `movement_line_id` + `reversal_of_id IS NULL` +
  `NOT EXISTS` a `sales_invoice_reversal` ICT pointing back. Legacy
  unlinked rows (posted pre-Phase-15) fall back to a GROUPED per-detail
  lookup: the n-th same-shape line pairs with the n-th same-shape detail
  (both are created per-detail in order) and consumes one still-un-reversed
  ICT — first() alone would map every line to the first detail (caught by
  the battery).

## Phase 15 battery

`tests/Feature/SalesInvoiceMovementLinkContractTest.php` (new, 4 tests,
HTTP-path fixture like SIPL): posting links every same-shape line's ICT to
its OWN line (no NULL links, no shared line); deleting a posted two-same-
shape-line invoice reverses each line EXACTLY once and restores ledger
quantity AND value exactly (the discriminator — the old bug left the
ledger at 12 while the shelf showed 20); legacy unlinked rows still reverse
once via the grouped fallback; sequential ship/unship rounds each reverse
exactly their own round (stale rounds never block the live shipment).

## Phase 15 files

| File | Change |
|---|---|
| `app/Http/Controllers/Backend/Client_Sales/SalesInvoiceController.php` | outbound-ICT memory + line-then-link posting step, line-keyed grouped reversal with occurrence-paired legacy fallback, docblock updates |
| `tests/Feature/SalesInvoiceMovementLinkContractTest.php` | **new** — 4-test battery |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 15 baseline

Full suite: **339 passed / 47 failed / 1 skipped** vs Phase 14's 335/47/1.
+4 = the new Phase 15 battery; failure clusters byte-identical to the
Phase 9–14 baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8, parallel-thread
Remediation 5, singles: ProfessionCrud, ProductImportWorkflow,
ProductDomain, ProductBulkDeleteAndApi, BalanceSheetDate). Battery 4/4;
neighbors green: SIPL, SalesInvoiceCogs, InventoryMovementContract, WAAI,
SalesReturn + PurchaseReturn batteries, GrnAccounting, LandedCostLifecycle,
BlockerVerification, PerpetualInventory, JournalReversal, ARI, WAC engine +
concurrency (96 tests).

## Outlook

- The lifecycle journal contract still keys on `reference` + `entry_type`
  with code-suffix probing; a `journal_reversals` link table would make
  "live entry" a join — cross-document GL phase.
- `calculateCogsAmount` still does double duty (cost application + COGS
  valuation) inside the journal step; extracting an explicit outbound-
  application step would make the posting pipeline readably three-phase
  (apply → document → post).
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 16 — the sales-invoice posting pipeline made STRUCTURAL (apply → documents → journal)

## Why

Since Phase 15 the posting order (journal step first, movements second) was
correct but INVISIBLE: the WAC outbounds were applied as a side effect of
`calculateCogsAmount` — a method named and typed as a pure valuation helper
(`: float`) — called from inside the journal step. Nothing in the code
expressed "ledger effects happen before documents", so the ordering lived
only in comments and tribal memory.

## The restructure

`SalesInvoiceController` now exposes the pipeline as three named phases:

1. **`applyInvoiceOutbounds(invoice): array`** — applies one outbound ICT
   per detail (ledger effects ONLY: no movement rows, no derived quantity)
   and returns/remember the applied ICTs (detail id → ICT). Idempotent at
   the engine level — re-running after a crash returns the existing rows.
   A refused outbound (`Insufficient weighted-average inventory`) aborts
   BEFORE any document or ledger row is written — the Phase 15 property is
   now structural, not conventional.
2. **`createStockMovementsForInvoice`** (unchanged Phase 15 behavior) —
   creates each movement line, then links the detail's outbound ICT to it
   (memory map first, idempotent ledger re-read as fallback for callers
   that skip phase 1).
3. **`postJournalEntryForInvoice`** — posts the journal valued from the
   APPLIED ICTs, then the treasury receipt sync. Thin wrapper over the
   historical upsert so external one-step callers keep working.

`post()` and the posted-create path in `store()` now read top-down as
exactly that pipeline. `calculateCogsAmount` keeps only valuation duty:
when phase 1 has already applied the ICTs it reads them from the map;
when invoked standalone (legacy chain — WAAI-style fixtures call the
journal step directly on an already-posted row) it applies them itself
(idempotent) so COGS always reflects real ledger effects, never document
arithmetic. `applyInvoiceOutbounds` resets the phase-1 memory map on entry,
so back-to-back postings on one controller instance cannot leak ICTs across
invoices.

## Phase 16 battery

`SalesInvoiceMovementLinkContractTest` grew 4 → 8: refusal-first is
structural (posting with no stock leaves NO movement rows, ICTs, journal,
or derived-quantity change — and the is_posted flag rolls back); phase 1
re-entry returns the SAME ICT rows (engine-level idempotency, ledger
applied exactly once); phase 2 links ICTs both from the phase-1 memory map
and from a fresh-controller ledger re-read; the journal-alone legacy chain
(posted row, no documents yet) values COGS from the APPLIED ICTs (3 × 6 =
18) and links everything once documents land later. (Test-side fix en
route: the legacy-chain scenario must run on a POSTED invoice row —
UnPost journals legitimately carry no COGS lines.)

## Phase 16 files

| File | Change |
|---|---|
| `app/Http/Controllers/Backend/Client_Sales/SalesInvoiceController.php` | `applyInvoiceOutbounds` (phase 1), `postJournalEntryForInvoice` wrapper (phase 3), `calculateCogsAmount` → valuation-only with idempotent legacy fallback, call sites rewired, docblocks |
| `tests/Feature/SalesInvoiceMovementLinkContractTest.php` | battery 4 → 8 tests |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 16 baseline

Full suite: **343 passed / 47 failed / 1 skipped** vs Phase 15's 339/47/1.
+4 = the new Phase 16 battery tests; failure clusters byte-identical to
the Phase 9–15 baseline (ErpIntegrity 20, ApiAuth 9, Payroll 8,
parallel-thread Remediation 5, singles: ProfessionCrud,
ProductImportWorkflow, ProductDomain, ProductBulkDeleteAndApi,
BalanceSheetDate). Battery 8/8; neighbors green: SIPL, SalesInvoiceCogs,
InventoryMovementContract, WAAI, SalesReturn + PurchaseReturn batteries,
GrnAccounting, LandedCostLifecycle, BlockerVerification,
PerpetualInventory, JournalReversal, ARI, WAC engine + concurrency (96
tests).

## Outlook

- The lifecycle journal contract still keys on `reference` + `entry_type`
  with code-suffix probing; a `journal_reversals` link table would make
  "live entry" a join — cross-document GL phase.
- The same three-phase extraction is available for the purchase side
  (GRN/PI) if their controllers ever grow posting pipelines.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 18 — every remaining GL lifecycle reads the live entry through one service

## Why

Phase 17 gave the GL a single answer to *which journal entry is the live
one for this reference?* — but only the return services and the stock
adjustment engine were asking it. The invoice/voucher/adjustment upsert
flows still took `JournalEntry::where('reference', …)->first()`, which on
a fully-reversed history would find a REVERSED original (or, worse, its
`-REV` document) and mutate it — resurrecting a reversed slot. Phase 17's
outlook named the SalesInvoiceController pair; this phase migrated that
pair and its direct siblings.

## The service API addition

`JournalReversalService::unreversedEntryFor(reference, entryType,
?companyId = null, ?lock = false)` — the strict upsert-side twin of
`liveEntryFor`: backfill → candidates (reversal entries and legacy
`-REV`-suffixed rows are NEVER candidates) → first candidate WITHOUT a
recorded reversal — or **null**. No last-candidate fallback: when the
whole history is reversed there is nothing to amend and the caller posts
a FRESH entry. (`liveEntryFor` keeps its fallback — the retract side must
still resolve history for audit decisions.) Both resolvers now share one
private `reversalCandidatesFor` helper, and the optional `lock` flag
preserves the `lockForUpdate` the sales-invoice posting upsert held under
its transaction.

## Per-site migration

| Site | Was | Now |
|---|---|---|
| `SalesInvoiceController::upsertJournalEntryForInvoice` | `where(reference…)->lockForUpdate()->first()` | `unreversedEntryFor(…, lock: true)` — fully-reversed history posts a fresh entry |
| `SalesInvoiceController::createReversalForInvoice` | `where(reference…)->first()` | `unreversedEntryFor` — never re-reverses or adopts `-REV` rows |
| `SalesInvoiceController::deleteJournalEntryForInvoice` | same | same — reversed history is audit-only for a draft delete |
| `StockAdjustmentService::upsertJournalEntryForAdjustment` | same | same — a re-approved adjustment posts a fresh journal |
| `PurchaseInvoiceController::createJournalEntryForInvoice` (upsert) | same | same |
| `PurchaseInvoiceController::deleteJournalEntryForInvoice` | same | same |
| `PurchaseInvoiceController` update-reversal check | same | same |
| `PurchaseInvoiceController::destroy` posted-check | same | same — already-reversed references fall through to draft cleanup |

## Deliberately NOT migrated (same family, needs its own treatment)

- **`LandedCostService::createJournal`** — hazard: its consumed-cost
  correction entry (`LC-…-COGS`) shares `entry_type='LandedCost'` AND the
  landed cost reference, so a plain reference lookup could adopt it as
  the amendable entry; migrate only with that entry distinguished (code
  suffix exclusion or a dedicated entry_type).
- **Next sweep candidates** — `ReceiptVoucherController` (4 sites),
  `PaymentVoucherController` (4), `TreasuryService` (3),
  `SalesReturnController`/`PurchaseReturnController` cancel-side posted
  checks, `AssetLifecycleService` ('AssetDisposal').

## Phase 18 battery

`JournalReversalLinkTableTest` grew 5 → 8: `unreversedEntryFor` returns
null when every candidate is reversed (the strictness contrast with
`liveEntryFor`); returns the unreversed entry among mixed history and
never a `-REV` document; a reused reference's lifecycles reverse
independently (two entries, two distinct edges, both reversible — the
reused-number discriminator). `SalesInvoicePostingLifecycleTest` +1:
deleting a posted invoice records the company-stamped `journal_reversals`
edge. (Note: `sales_invoices.invoice_number` is UNIQUE and soft-deleted
rows keep the slot, so the reused-number scenario is pinned at the
service level, not HTTP.)

## Phase 18 files

| File | Change |
|---|---|
| `app/Services/Accounting/JournalReversalService.php` | `unreversedEntryFor`, shared `reversalCandidatesFor` (liveEntryFor refactored onto it), optional lock |
| `app/Http/Controllers/Backend/Client_Sales/SalesInvoiceController.php` | 3 reference lookups → `unreversedEntryFor` |
| `app/Services/Inventory/StockAdjustmentService.php` | upsert lookup → `unreversedEntryFor` |
| `app/Http/Controllers/Backend/Purchases/PurchaseInvoiceController.php` | 4 reference lookups → `unreversedEntryFor` |
| `tests/Feature/JournalReversalLinkTableTest.php` | battery 5 → 8 tests |
| `tests/Feature/SalesInvoicePostingLifecycleTest.php` | +1 link-table edge test |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 18 baseline

Full suite: **374 passed / 47 failed / 1 skipped** vs Phase 17's
370/47/1. +4 = the new Phase 18 battery tests; failure clusters
byte-identical to the Phase 9–17 baseline (ErpIntegrity 20, ApiAuth 9,
Payroll 8, parallel-thread Remediation 5, singles: ProfessionCrud,
ProductImportWorkflow, ProductDomain, ProductBulkDeleteAndApi,
BalanceSheetDate). Batteries 8/8 and 10/10; neighbors green: SIPL,
SalesInvoiceCogs, P15/16 battery, InventoryMovementContract, WAAI, WAC
engine + concurrency, SalesReturn + PurchaseReturn batteries,
GrnAccounting, LandedCostLifecycle, BlockerVerification,
PerpetualInventory, JournalReversal, ARI, StockAdjustmentLifecycle,
JournalReversalLinkTable (124 tests).

## Outlook

- Finish the same-family sweep (vouchers, treasury, return controllers,
  asset lifecycle) so no GL lifecycle resolves a reference outside the
  service; then the landed-cost `-COGS` hazard with its own design.
- A `unique(original_entry_code)` on `journal_reversals` would make the
  one-edge-per-slot invariant schema-enforced; today it is service-
  enforced only.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 19 — the reference-lookup sweep completed: no GL lifecycle resolves a reference outside the service

## Why

Phases 17–18 moved the returns, stock adjustments, and both invoice
controllers onto the link table; the voucher/treasury/asset/return-
controller flows still took `JournalEntry::where('reference', …)
->first()` — the last places a fully-reversed history could be adopted
as an amend/delete target (or a `-REV` document mistaken for the live
entry). This phase swept the remainder.

## Per-site migration

| Site | Lookup | Note |
|---|---|---|
| `ReceiptVoucherController::update` (reversal check) | `unreversedEntryFor('CustomerReceipt')` | never re-reverses an already-reversed slot |
| `ReceiptVoucherController::destroy` (posted check) | same | already-reversed references fall through to draft cleanup |
| `ReceiptVoucherController::createJournalEntryForPayment` (upsert) | same, `lock: true` | keeps the transactional FOR UPDATE lock; fully-reversed history posts a fresh entry |
| `ReceiptVoucherController::deleteJournalEntryForPayment` | same | reversed history is audit-only |
| `PaymentVoucherController` — the same 4 shapes | `unreversedEntryFor('SupplierPayment')` | identical semantics |
| `TreasuryService` upsert / `deleteJournalEntry` / `reverseJournalEntry` | `unreversedEntryFor((string) $code, $qaidType)` | dynamic `BnkReceipt`/`BnkPayment`/`BnkTransfer` types |
| `SalesReturnController::destroy` (cancel-side posted check) | `unreversedEntryFor('SalesReturn')` | controller-side twin of the Phase 17 service migration |
| `PurchaseReturnController::destroy` (cancel-side posted check) | `unreversedEntryFor('PurchaseReturn')` | same |
| `AssetLifecycleService` disposal upsert | `unreversedEntryFor('AssetDisposal')` | a fully reversed disposal posts a fresh entry |

After the sweep, the ONLY remaining `where(reference…)` first-lookup in
`app/` is `LandedCostService::createJournal` — deliberately deferred
(Phase 18 appendix: its `LC-…-COGS` correction entry shares the landed
cost's entry_type + reference, so it needs its own design first).

## Phase 19 battery

`JournalReversalLinkTableTest` grew 8 → 9: `makePostedEntry` is
entry-type-parameterized and a first direct TreasuryService test pins the
migrated lookups — the delete path removes an UnPost treasury journal by
reference while a posted original stays audit-only, and
`reverseJournalEntry` records exactly one edge and a second call never
creates a `-REV-REV`. (ErpTransactionIntegrity's asset-disposal tests
remain dead at fixture — the parallel thread's known
UniqueConstraintViolation cluster, untouched.)

## Phase 19 files

| File | Change |
|---|---|
| `app/Http/Controllers/Backend/Cash/ReceiptVoucherController.php` | 4 reference lookups → `unreversedEntryFor` |
| `app/Http/Controllers/Backend/Cash/PaymentVoucherController.php` | 4 reference lookups → `unreversedEntryFor` |
| `app/Services/TreasuryService.php` | 3 reference lookups → `unreversedEntryFor` |
| `app/Http/Controllers/Backend/Client_Sales/SalesReturnController.php` | destroy posted-check → `unreversedEntryFor` |
| `app/Http/Controllers/Backend/Purchases/PurchaseReturnController.php` | destroy posted-check → `unreversedEntryFor` |
| `app/Services/Assets/AssetLifecycleService.php` | disposal upsert → `unreversedEntryFor` |
| `tests/Feature/JournalReversalLinkTableTest.php` | battery 8 → 9 tests |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 19 baseline

Full suite: **375 passed / 47 failed / 1 skipped** vs Phase 18's
374/47/1. +1 = the new Phase 19 battery test; failure clusters
byte-identical to the Phase 9–18 baseline (ErpIntegrity 20, ApiAuth 9,
Payroll 8, parallel-thread Remediation 5, singles: ProfessionCrud,
ProductImportWorkflow, ProductDomain, ProductBulkDeleteAndApi,
BalanceSheetDate). Battery 9/9; neighbors green: SIPL, SalesInvoiceCogs,
P15/16 battery, InventoryMovementContract, WAAI, WAC engine +
concurrency, SalesReturn + PurchaseReturn batteries, GrnAccounting,
LandedCostLifecycle, BlockerVerification, PerpetualInventory,
JournalReversal, ARI, StockAdjustmentLifecycle,
JournalEntryTypeSemantics, JournalReversalLinkTable (130 tests).

## Outlook

- HTTP-path batteries for the voucher controllers and treasury transaction
  flows do not exist (only the new service-level treasury test); building
  them would pin the full voucher lifecycle like SIPL does for invoices.
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.

# Phase 20 — the landed-cost journal joins the service: the last reference lookup in `app/` is gone

## Survey corrections first (the Phase 18/19 'hazard' claim was wrong)

Reading the file revealed the deferred hazard did not exist as framed: the
consumed-cost correction entry uses `entry_type=
'LandedCostReversalCorrection'` (and its own `-COGS` code), so it was
NEVER adoptable by a `entry_type='LandedCost'` reference lookup — and the
Phase 9 battery already pinned that distinction. The REAL hazards in
`createJournal` were the two every other upsert had, plus one specific to
its deterministic code slot:

1. `->first()` adopts a REVERSED original (or, unguarded, its `-REV`
   document) on a fully-reversed history — the universal resurrection
   hazard.
2. The code fallback was the deterministic `'LC-<id>'`. Under the UNIQUE
   `journal_entries.entry_code` index, a fresh posting whose slot is
   occupied by a reversed original (its `LC-<id>-REV` reversal also
   pinned by the unique index) crashes on duplicate entry_code.

## The fix

`LandedCostService::createJournal` now resolves its existing entry via
`unreversedEntryFor('LandedCost', lock: true)` (it already runs inside
`post()`'s transaction), and the fallback code keeps the readable
deterministic `LC-<id>` slot for a fresh posting, escaping to a fresh
`QID-` code only when that slot is already occupied — minimal behavior
change, collision-proof. The escape draws through the new public
`JournalReversalService::nextFreshEntryCode()` (a thin public wrapper
over the existing `generateNextEntryCode` generator, kept `protected` so
subclass overrides still work). One bug caught mid-phase by `php -l`:
the first draft called a private generator that did not exist — proof the
lint gate belongs in the loop.

## Phase 20 battery (LandedCostLifecycleTest 7 → 9)

- `posting_twice_reuses_the_live_journal_instead_of_duplicating` — a
  second `createJournal` invocation (reflection; upsert shapes the doc
  treats as idempotent) adopts the LIVE entry through the link table:
  same code, exactly one LandedCost journal.
- `repost_after_full_reversal_never_resurrects_the_reversed_slot` — post →
  reverse → re-arm the same row → post again: the fresh entry is NOT the
  `LC-<id>` slot, NOT the reversed original, starts with `QID-`, the
  reference owns exactly 3 entries (original + reversal copy + fresh),
  and the fresh entry is not recorded as a reversal.

## Phase 20 files

| File | Change |
|---|---|
| `app/Services/Vendor_Purchases/LandedCostService.php` | `createJournal` → `unreversedEntryFor(lock: true)`; occupied-slot escape to fresh `QID-` code |
| `app/Services/Accounting/JournalReversalService.php` | `nextFreshEntryCode()` public generator wrapper |
| `tests/Feature/LandedCostLifecycleTest.php` | battery 7 → 9 tests |
| `docs/inventory/inventory-source-of-truth.md` | this appendix |

No migrations; no frontend changes.

## Phase 20 baseline

Full suite: **377 passed / 47 failed / 1 skipped** vs Phase 19's
375/47/1. +2 = the new Phase 20 battery tests; failure clusters
byte-identical to the Phase 9–19 baseline (ErpIntegrity 20, ApiAuth 9,
Payroll 8, parallel-thread Remediation 5, singles: ProfessionCrud,
ProductImportWorkflow, ProductDomain, ProductBulkDeleteAndApi,
BalanceSheetDate). Battery 9/9; neighbors green: SIPL, SalesInvoiceCogs,
P15/16 battery, InventoryMovementContract, WAAI, WAC engine +
concurrency, SalesReturn + PurchaseReturn batteries, GrnAccounting,
LandedCostLifecycle, BlockerVerification, PerpetualInventory,
JournalReversal, ARI, StockAdjustmentLifecycle, JournalEntryTypeSemantics,
JournalReversalLinkTable (132 tests).

## Outlook

- The reference-lookup migration is COMPLETE: zero `where(reference…)`
  first-lookups remain in `app/`. Remaining hardening is schema-level
  (a unique index on `journal_reversals.original_entry_code`) and
  coverage-level (HTTP-path batteries for voucher/treasury lifecycles).
- Dead `import.preview/confirm` routes (ProductImportWorkflowTest) —
  still open, out of inventory scope.
