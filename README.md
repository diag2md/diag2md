# diag2md Documentation

`diag2md` is a CLI application and Node.js/TypeScript library designed to convert Draw.io C4 architecture diagrams (`.xml` or `.drawio` files) into Mermaid Markdown formatted diagrams.

## Architectural Overview

The project is structured according to the Swarm Architecture defined in [`AGENTS.md`](../AGENTS.md):

1. **`Project_Setup_Agent` (`/`)**: Manages npm dependencies, configuration files (`.gitignore`, `.npmrc`, `tsconfig.json`), and `tsup` build configuration.
2. **`Converter_Controller_Agent` (`/src`)**: Configures options (`--type c4|uml`, `--input`, `--output`) and dispatches diagram conversion.
3. **`Parser_Agent` (`/src/parsers`)**: Parses Draw.io XML structure, decompresses base64/zlib payload string content, and extracts graph cells.
4. **`C4_to_Mermaid_Agent` (`/src/models`)**: Transforms Draw.io cells into Mermaid C4 model syntax (`C4Context`, `Person`, `Container`, `System`, `Rel`, etc.).
5. **`UML_to_Mermaid_Agent` (`/src/models`)**: Reserved domain for future UML conversion.

## CLI Usage

```bash
# Build binary
npm run build

# Convert file to Mermaid Markdown
node dist/cli.js -i examples/sample-c4.drawio -o output.md -t c4
```

## Programmatic API

```typescript
import { convertC4ToMermaid } from "diag2md";

const mermaidMarkdown = convertC4ToMermaid(xmlContent);
```
