# diag2md Documentation

`diag2md` is a CLI application and Node.js/TypeScript library designed to convert Draw.io (diagrams.net) [C4](https://c4model.com) architecture diagrams (`.xml` or `.drawio` files) into [Mermaid](https://mermaid.js.org) Markdown formatted diagrams.

---

## Draw.io Authoring Guidelines for C4 Diagrams

To ensure accurate XML parsing and valid Mermaid C4 output, follow these key guidelines when creating your diagrams in Draw.io (diagrams.net):

1. **Properly Connect Relationships (Arrows & Connectors)**
   - Always snap relationship arrows directly to the connection points of source and target shapes.
   - Unconnected or floating arrows will not establish `source` and `target` cell references in the underlying XML, which prevents relationship edges from being converted.
   - 📖 *Guide*: [Draw.io Connectors & Connection Points](https://www.drawio.com/doc/faq/connector-styles)

2. **Group Boundaries & Containers (Parent-Child Hierarchy)**
   - Place elements (such as Containers, Databases, or Components) directly inside System or Container Boundary shapes.
   - Ensure boundary shapes act as container shapes in Draw.io so the parent-child hierarchy is recorded in the XML structure and properly translated into Mermaid `System_Boundary` blocks.
   - 📖 *Guide*: [Draw.io C4 Modelling & Boundaries](https://www.drawio.com/blog/c4-modelling)

3. **Use Built-in C4 Shapes**
   - Enable the built-in C4 shape library in Draw.io (**More Shapes... → Software → C4**) or open Draw.io with C4 shapes preloaded.
   - 📖 *Resource*: [Open Draw.io with C4 Shapes Preloaded](https://app.diagrams.net/?libs=c4)

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
| `--output <path>` | `-o` | Path to save generated [Mermaid](https://mermaid.js.org) Markdown (`.md`) file | No | `stdout` |
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
