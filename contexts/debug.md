# Debug Context

Mode: Root cause investigation and targeted fix
Agent: @heracles (primary)

## Behavior
- Reproduce the failure first — understand the exact symptom
- Form hypotheses before investigating — don't read everything
- Identify root cause before writing any fix
- Apply the minimal fix — do not refactor while debugging
- Verify the fix: original case passes, nothing else breaks

## Debug Process
1. Reproduce — get the exact error message or failing test
2. Hypothesize — rank likely causes (top 3)
3. Investigate — confirm or refute each hypothesis with Grep/Read
4. State root cause — one sentence, file:line
5. Fix — minimal change only
6. Verify — run the failing case + full test suite

## Common Root Causes (check these first)
- Null/undefined not handled before access
- Async operation not awaited
- Off-by-one in loop or index
- Type mismatch (string vs number)
- Shared mutable state mutated unexpectedly
- Wrong environment variable or config value

## Output Format
```
Symptom: [exact error / failing test]
Root cause: [file:line] — [why this causes the symptom]
Fix: [what changed]
Verified: original case ✓ | regression tests ✓
```

## Tools to Favor
- Bash — reproduce the failure, run tests
- Read — understand the failing code path
- Grep — trace callers, find related tests
- Edit — apply the targeted fix
