# Plugin Schema Notes

Critical validator quirks and anti-patterns. Read before modifying `plugin.json`.

## Rules

| Rule | Why |
|------|-----|
| `version` is **required** | Validator rejects manifests without it; error is just `"Invalid input"` |
| `agents` must be **explicit file paths** | `"./agents/"` silently fails; must be `"./agents/hermes.md"` etc. |
| `skills` and `commands` can use directories | `"./skills/"` works fine here |
| **Do NOT add `"hooks"`** | `hooks/hooks.json` is auto-loaded by convention; adding the field causes a duplicate-registration error in v2.1+ |
| All component fields must be **arrays** | `"agents": "..."` fails; must be `"agents": [...]` |
| Version format must be **x.y.z** | `"0.1"` fails; must be `"0.1.0"` |

## Anti-Patterns

```jsonc
// WRONG — directory path for agents
"agents": ["./agents/"]

// WRONG — string instead of array
"skills": "./skills/"

// WRONG — hooks field present
"hooks": ["./hooks/hooks.json"]

// WRONG — non-semantic version
"version": "0.1"
```

## Correct Template

```json
{
  "name": "ohmyclaude",
  "version": "0.1.0",
  "agents": [
    "./agents/hermes.md",
    "./agents/hephaestus.md"
  ],
  "skills": ["./skills/"],
  "commands": ["./commands/"]
}
```

## Validation

```bash
claude plugin validate .claude-plugin/plugin.json
```

If validation fails with a vague error, check these rules first.
