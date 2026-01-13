# Product JSON files (anchor table format)

This folder contains per-product JSON files storing anchor parameter tables and a JSON Schema to validate them.

Files

- `product-schema.json`: JSON Schema (draft-07) matching the simplified anchor table format
- `SST-STB2.json`: Example product using `anchorSize`, `effectiveEmbedmentDepth`, and `tensionSteelStrength`

Format

- `name` (string) — product name
- `image` (string, uri) — URL or relative path to image
- `Date Expires` (string, date) — ISO 8601 date field (keeps your original header name)
- `diameters` (array) — each item is an object with:
  - `anchorSize` (string) — anchor size label (e.g. `1/4"`)
  - `effectiveEmbedmentDepth` (number) — hnom value (units implied)
  - `tensionSteelStrength` (number) — fNsa value

Validate

Node (ajv-cli)

```bash
npm install -g ajv-cli
ajv validate -s product-schema.json -d SST-STB2.json --strict=false
```

Python (jsonschema)

```bash
pip install jsonschema
python - <<'PY'
import json, sys
from jsonschema import Draft7Validator
schema = json.load(open('product-schema.json'))
data = json.load(open('SST-STB2.json'))
validator = Draft7Validator(schema)
errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
if errors:
    print('Validation errors:')
    for e in errors:
        path = '.'.join(map(str, e.path))
        print(f'- {path}: {e.message}')
    sys.exit(1)
print('Valid')
PY
```

Add products

Copy `SST-STB2.json` to a new file per product and update fields. Keep the array structure: one object per anchor-size row.
