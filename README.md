# diag2md Documentation

`diag2md` is a CLI application and Node.js/TypeScript library designed to convert Draw.io C4 architecture diagrams (`.xml` or `.drawio` files) into Mermaid Markdown formatted diagrams.

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
