---
id: REQ-0001
title: Every spec element is an atomic, linkable record
status: active
because: [FCT-0001, FCT-0002]
---

## Statement
The system MUST store each assumption (`ASM`), fact (`FCT`), question (`QST`), requirement (`REQ`), and spec (`SPC`) as its own record file whose filename begins with `<ID>-`, whose `id` matches `^(ASM|FCT|QST|REQ|SPC)-\d{4}$`, and whose `title` is non-empty. The system MUST reject duplicate IDs, invalid statuses outside the allowed set for each prefix (`ASM`: `open`/`validated`/`invalidated`, `FCT`: `active`/`deprecated`, `QST`: `open`/`answered`, `REQ`: `provisional`/`active`/`broken`, `SPC`: `draft`/`active`), and any link (`because`, `requirements`, `depends_on`, `blocks`, `promoted_to`, `promoted_from`, `answered_by`) that targets an unknown record ID.

## Acceptance
- Given a requirement whose `because` names an ID that does not exist
- When the graph is checked
- Then the check fails and names the broken link
