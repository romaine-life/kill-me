# Decision Records

This directory is the durable history of consequential product, program, and
architecture decisions for `kill-me`. The format is inspired by Architecture
Decision Records, but the scope includes the Synergy training model itself.

`CLAUDE.md` describes the current system. Migrations implement changes. Decision
records explain why a choice was made, which alternatives were rejected, and
what would cause the choice to be revisited.

## Index

| Record | Status | Decision |
| --- | --- | --- |
| [0001](0001-synergy-16-program-architecture.md) | Accepted | Adopt the Synergy 16 coverage-first program architecture |
| [0002](0002-add-dedicated-vertical-press-day.md) | Accepted | Add a dedicated vertical-press day and advance to Synergy 17 |
| [0003](0003-remove-browser-snapshot-data-path.md) | Accepted | Remove the browser SQLite snapshot and use the AKS API for every read |

## Process

1. Copy `template.md` and use the next unused four-digit number.
2. Write the record while the decision is being made, not after its context has
   faded.
3. Include the record in the same change as the migration or implementation.
4. Link supporting discussions, research, pull requests, and migrations, but
   make the record understandable without those links.
5. Do not rewrite an accepted record to make history look cleaner. Add a new
   record that supersedes it and update the old record's status and link.

Small reversible implementation choices do not need records. A record is
warranted when a choice changes the training model, data model, safety rules,
operational architecture, or a constraint future work needs to understand.
