# diag2md Documentation

`diag2md` is a CLI application and Node.js/TypeScript library designed to convert Draw.io C4 architecture diagrams (`.xml` or `.drawio` files) into Mermaid Markdown formatted diagrams.

---

## CLI Usage

```bash
# Build binary
npm run build

# Print help and available options
node dist/cli.js --help

# Convert file and print output to stdout
node dist/cli.js -i examples/sample-c4.drawio

# Convert file and save output to markdown file
node dist/cli.js -i examples/sample-c4.drawio -o output.md -t c4
```

---

## Available Options

| Option | Alias | Description | Required | Default |
| --- | --- | --- | --- | --- |
| `--input <path>` | `-i` | Path to input Draw.io diagram file (`.xml` or `.drawio`) | **Yes** | — |
| `--output <path>` | `-o` | Path to save generated Mermaid Markdown (`.md`) file | No | `stdout` |
| `--type <type>` | `-t` | Type of diagram conversion (`'c4'` or `'uml'`) | No | `'c4'` |
| `--version` | `-V` | Output version number | No | — |
| `--help` | `-h` | Display command help and available flags | No | — |

---

## Programmatic API

```typescript
import { convertC4ToMermaid, ConverterController } from "diag2md";

// Quick string/file content conversion
const mermaidMarkdown = convertC4ToMermaid(xmlContent);

// Advanced controller options
const controller = new ConverterController({
  input: "path/to/diagram.drawio",
  output: "path/to/output.md",
  type: "c4",
});

const output = controller.execute();
```
