---
name: generate-fuzz-data
description: Generate adversarial edge-case test data arrays for QA. Used by @quinn-qa when writing fuzz tests or stress-testing input validation. Accepts a type ENUM and returns a JSON array of extreme inputs. Triggers on "fuzz data", "edge cases", "adversarial inputs", "generate test data", "boundary values".
---

# Generate Fuzz Data

Produce an array of adversarial edge-case inputs for a given data type.

## Usage

Specify one or more types from the ENUM below. Returns a JSON array for use in test suites.

```
generate-fuzz-data type=email
generate-fuzz-data type=sql,string
generate-fuzz-data type=currency count=20
```

## Type ENUM

| Type | Description |
|---|---|
| `email` | Email address edge cases |
| `url` | URL edge cases |
| `currency` | Monetary value edge cases |
| `date` | Date/time edge cases |
| `string` | General string edge cases |
| `sql` | SQL injection patterns |
| `html` | XSS / HTML injection patterns |

## Fuzz Patterns (see assets/fuzz-patterns.json for full list)

### email
```json
["", "a", "a@", "@b.com", "a@b", "a @b.com", "a@b.c",
 "a+tag@b.com", "\"quoted\"@b.com", "a@[127.0.0.1]",
 "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@b.com",
 "test@test.com\nBcc:attacker@evil.com", "user%40domain@b.com"]
```

### sql
```json
["' OR '1'='1", "'; DROP TABLE users; --", "1; SELECT * FROM users",
 "' UNION SELECT NULL,NULL,NULL --", "admin'--", "' OR 1=1 --",
 "\" OR \"1\"=\"1", "1' AND SLEEP(5) --", "%27 OR %271%27%3D%271"]
```

### html / XSS
```json
["<script>alert(1)</script>", "<img src=x onerror=alert(1)>",
 "javascript:alert(1)", "<svg onload=alert(1)>",
 "';alert(1)//", "\"><script>alert(1)</script>",
 "<iframe src=\"javascript:alert(1)\">", "{{7*7}}",
 "${7*7}", "#{7*7}"]
```

### currency
```json
[0, -1, -0.01, 0.001, 999999999.99, -999999999.99,
 "1,000.00", "1.000,00", "$100", "100USD",
 null, "", "NaN", "Infinity", 1e20, -1e20]
```

### string
```json
["", " ", "\t\n\r", "null", "undefined", "NaN",
 "true", "false", "0", "-1",
 "A".repeat(10000),
 "\u0000", "\uFFFD", "\u202E",
 "<script>", "'; DROP TABLE", "{{7*7}}",
 "😀🔥💯", "\n\r\t"]
```

### date
```json
["", "0", "2000-02-29", "2001-02-29", "9999-12-31",
 "0000-01-01", "1970-01-01T00:00:00Z", "2038-01-19T03:14:08Z",
 "2038-01-19T03:14:09Z", "-1", "not-a-date",
 "12/31/9999", "31/12/9999", "2024-13-01", "2024-00-01"]
```

### url
```json
["", "javascript:alert(1)", "data:text/html,<h1>test</h1>",
 "http://localhost", "http://127.0.0.1", "http://0.0.0.0",
 "http://[::1]", "file:///etc/passwd",
 "http://evil.com@good.com", "http://good.com.evil.com",
 "http://" + "a".repeat(2000) + ".com", "//evil.com"]
```

## Output Format

```json
{
  "type": "email",
  "count": 13,
  "values": ["", "a", "a@", ...]
}
```

## Gotchas

- **SQL patterns must be used in parameterized query tests** — never execute raw against a real DB
- **XSS patterns need HTML context to be meaningful** — inject into DOM in a headless browser or jsdom
- **Currency edge cases include type coercion traps** — test both string and numeric representations
- **Large strings (10k chars) can trigger timeout issues** — use sparingly and with timeout guards in tests
