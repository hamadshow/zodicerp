# General Ledger — Opening Balance semantics (audit Phase 10 decision record)

## The rules considered

- **Rule A** — Opening Balance = ALL posted activity on the account before
  `date_from` (every entry_type).
- **Rule B** — Opening Balance = only `entry_type = 'Opening'` journals.
- **Rule C** — Opening entries plus pre-period movements (a hybrid).

## Repository evidence

| Surface | Semantics today | Reading |
|---|---|---|
| **General Ledger** (`JournalController::generalLedger`) | Opening = all posted activity `< date_from`, any entry_type | **Rule A** — the brought-forward balance an accountant expects on a ledger card |
| **Balance Sheet** (`fetchBalanceSheetData`) | balance = ALL posted activity `<= as_of date`, no entry_type special-case | Rule-A-equivalent cumulative (point-in-time); no separate "opening" concept |
| **Trial Balance** (`getTrialBalanceData`) | BEGINNING = only `entry_type='Opening'` (≤ as-of); CURRENT = non-Opening within `[start_date, as_of]` | **Rule B as a display classification** (documented deliberate), NOT an opening-balance definition |

The Trial Balance comment explicitly marks its split as deliberate
("Beginning: ONLY 'Opening' entries... Note: the date-window split
deliberately does NOT apply here"). It is a presentation convention for the
Beginning vs Current columns, not a competing definition of opening balance.
The entry_type semantics themselves are canonical project-wide: 'Opening' is
reserved for opening-balance journals; normal in-year entries are 'Regular'
(manual API entries default to Regular; imports preserve an explicit
'Opening').

## Decision

**Rule A is the canonical OPENING-BALANCE semantic**: the opening balance of
an account for a period is all posted activity on that account before the
period start, regardless of entry_type. The General Ledger already implements
exactly this (pinned by
`GeneralLedgerCharacterizationTest::test_opening_balance_is_all_pre_period_activity_regardless_of_entry_type`)
and the Balance Sheet's cumulative computation is consistent with it. The GL
required NO change.

Rule B survives only as the Trial Balance's column classification, which is
out of the General Ledger's scope. The two surfaces answer different
questions: "what had this account accumulated before this period?" (GL /
Balance Sheet) vs "of the movement up to now, what came from formal opening
entries vs this year's activity?" (Trial Balance columns).

## Known edge in the Trial Balance classification (reported, NOT fixed here)

A posted **Regular** journal dated BEFORE the Trial Balance's `start_date`
falls into NEITHER bucket (Beginning excludes it by entry_type; CURRENT
excludes it by date) — its contribution vanishes from both displayed columns
although the ending balance (beginning + current) is computed from
`beginning + current` per leaf, so the ENDING column drops it too. This is a
Trial Balance defect candidate, deliberately left untouched: the audit
mandate forbids silently changing unrelated financial reports. Flagged for a
dedicated Trial Balance phase with the business.

## Tests pinning this decision

- `GeneralLedgerCharacterizationTest::test_opening_balance_is_all_pre_period_activity_regardless_of_entry_type`
  (Rule A: Opening + Regular both contribute to the brought-forward balance)
- `GeneralLedgerCharacterizationTest::test_opening_entry_inside_period_appears_as_movement_row`
  (an Opening-type journal INSIDE the period is a movement row — the boundary
  is date-based, not type-based)
- `GeneralLedgerPaginationTest::opening_balance_is_identical_on_every_page`
  (Rule A under pagination: pre-period Regular activity is the opening)
