---
name: "Code Review"
description: "Merge gate. Blockers only."
when: ["selection","file","diff"]
model: "gpt-5-thinking"
temperature: 0.1
max_output_tokens: 900
---

# Gate

`{{file_path}}`

```diff
{{diff}}
```

```text
{{selection}}
```

## Output

`Risk: <Low|Med|High>. Ship: <Yes|No>.`

If No: blockers only.

## Findings

`**[Severity|Confidence]** Title — file:line`

```diff
# minimal patch
```

Severity: Blocker/High/Med/Low/Nit. Confidence: High/Med/Low.

## Checklist

1. Correctness
2. Security
3. Reliability
4. Performance
5. Contracts/migrations
6. Tests
7. Observability

## Tests

Concrete cases. Given/When/Then.

## Observability

Boundaries. Fields.

## Rules

- TS/JS: narrow types; validate; no loop awaits; SSR guards.
- Python: timeouts; no bare except; validate.
- Go: check errors; context.
- Rust: no unwrap.
- Solidity: CEI; reentrancy; access.
- DB: parameterize; index; backward-compat.
