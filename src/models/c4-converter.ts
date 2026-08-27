import { DrawIoGraph, DrawIoDiagram, DrawIoCell } from "../parsers/drawio-parser.js";

export interface C4Node {
  id: string;
  alias: string;
  type: "Person" | "Person_Ext" | "System" | "System_Ext" | "SystemDb" | "Container" | "ContainerDb" | "Component" | "Boundary";
  label: string;
  description?: string;
  technology?: string;
  parentId?: string;
  children: string[];
}

export interface C4Relationship {
  id: string;
  from: string;
  to: string;
  label: string;
  technology?: string;
}

/**
 * Convert a DrawIoGraph model into Mermaid C4 Markdown output.
 * Scope: C4_to_Mermaid_Agent (/src/models)
 */
export function convertDrawIoToMermaidC4(graph: DrawIoGraph): string {
  const diagrams: DrawIoDiagram[] =
    graph.diagrams && graph.diagrams.length > 0
      ? graph.diagrams
      : [
          {
            id: graph.diagramId,
            name: graph.diagramName,
            cells: graph.cells || [],
          },
        ];

  return diagrams.map((diagram) => convertSingleDiagramToMermaidC4(diagram)).join("\n\n");
}

function convertSingleDiagramToMermaidC4(diagram: DrawIoDiagram): string {
  const nodesMap = new Map<string, C4Node>();
  const relationships: C4Relationship[] = [];

  // Vertex candidate cells (excluding relationship objects)
  const vertexCells = diagram.cells.filter((c) => c.vertex || (c.attributes?.c4Type && c.attributes.c4Type.toLowerCase() !== "relationship"));

  // Edge candidate cells
  const edgeCells = diagram.cells.filter((c) => c.edge || (c.attributes?.c4Type && c.attributes.c4Type.toLowerCase() === "relationship"));

  // Identify nodes
  for (const cell of vertexCells) {
    if (isIgnorableCell(cell)) continue;

    const nodeType = detectC4Type(cell);
    const { label, description, technology } = parseC4Content(cell);
    const alias = sanitizeAlias(cell.attributes?.c4Alias || cell.id);

    nodesMap.set(cell.id, {
      id: cell.id,
      alias,
      type: nodeType,
      label,
      description,
      technology,
      parentId: cell.parent && cell.parent !== "0" && cell.parent !== "1" ? cell.parent : undefined,
      children: [],
    });
  }

  // Populate children hierarchy for boundaries
  for (const node of nodesMap.values()) {
    if (node.parentId && nodesMap.has(node.parentId)) {
      nodesMap.get(node.parentId)!.children.push(node.id);
    }
  }

  // Identify relationships
  for (const cell of edgeCells) {
    if (!cell.source || !cell.target) continue;
    const sourceNode = nodesMap.get(cell.source);
    const targetNode = nodesMap.get(cell.target);

    if (sourceNode && targetNode) {
      const { label, technology } = parseRelationshipContent(cell);
      relationships.push({
        id: cell.id,
        from: sourceNode.alias,
        to: targetNode.alias,
        label: label || "Uses",
        technology,
      });
    }
  }

  // Build Mermaid C4 Markdown output
  const lines: string[] = ["```mermaid", "C4Context"];

  if (diagram.name) {
    lines.push(`  title ${diagram.name}`);
  }

  lines.push("");

  const processedNodeIds = new Set<string>();

  // Helper to render boundary container
  const renderNode = (nodeId: string, indent: string = "  ") => {
    if (processedNodeIds.has(nodeId)) return;
    processedNodeIds.add(nodeId);

    const node = nodesMap.get(nodeId);
    if (!node) return;

    if (node.children.length > 0 || node.type === "Boundary") {
      lines.push(`${indent}System_Boundary(${node.alias}, "${escapeQuotes(node.label)}") {`);
      for (const childId of node.children) {
        renderNode(childId, `${indent}  `);
      }
      lines.push(`${indent}}`);
    } else {
      lines.push(`${indent}${formatC4Element(node)}`);
    }
  };

  // Render top-level nodes (nodes with no parent or top level root parent)
  for (const node of nodesMap.values()) {
    if (!node.parentId || !nodesMap.has(node.parentId)) {
      renderNode(node.id, "  ");
    }
  }

  lines.push("");

  // Render relationships
  for (const rel of relationships) {
    if (rel.technology) {
      lines.push(`  Rel(${rel.from}, ${rel.to}, "${escapeQuotes(rel.label)}", "${escapeQuotes(rel.technology)}")`);
    } else {
      lines.push(`  Rel(${rel.from}, ${rel.to}, "${escapeQuotes(rel.label)}")`);
    }
  }

  lines.push("```");
  return lines.join("\n");
}

function isIgnorableCell(cell: DrawIoCell): boolean {
  if (!cell.id || cell.id === "0" || cell.id === "1") return true;
  const c4Type = (cell.attributes?.c4Type || "").toLowerCase();
  if (c4Type === "relationship") return true;
  if (!cell.style && !cell.value && !cell.attributes?.c4Type && !cell.vertex) return true;
  return false;
}

function detectC4Type(cell: DrawIoCell): C4Node["type"] {
  const style = (cell.style || "").toLowerCase();
  const c4TypeAttr = (cell.attributes?.c4Type || "").toLowerCase();
  const val = (cell.value || "").toLowerCase();

  if (c4TypeAttr) {
    if (c4TypeAttr.includes("systemscopeboundary") || c4TypeAttr.includes("boundary")) return "Boundary";
    if (c4TypeAttr.includes("software system") || c4TypeAttr === "system") return "System";
    if (c4TypeAttr.includes("containerdb")) return "ContainerDb";
    if (c4TypeAttr.includes("container")) return "Container";
    if (c4TypeAttr.includes("component")) return "Component";
    if (c4TypeAttr.includes("person_ext")) return "Person_Ext";
    if (c4TypeAttr.includes("person")) return "Person";
    if (c4TypeAttr.includes("system_ext")) return "System_Ext";
    if (c4TypeAttr.includes("systemdb")) return "SystemDb";
  }

  if (style.includes("person_ext") || val.includes("«person_ext»") || val.includes("external person")) {
    return "Person_Ext";
  }
  if (style.includes("person") || val.includes("«person»") || style.includes("c4.person")) {
    return "Person";
  }
  if (style.includes("system_ext") || val.includes("«system_ext»") || val.includes("external system")) {
    return "System_Ext";
  }
  if (style.includes("systemdb") || val.includes("system db") || style.includes("c4.systemdb")) {
    return "SystemDb";
  }
  if (style.includes("system") || val.includes("«system»") || style.includes("c4.softwaresystem") || style.includes("c4.system")) {
    return "System";
  }
  if (style.includes("containerdb") || val.includes("container db") || style.includes("cylinder3")) {
    return "ContainerDb";
  }
  if (style.includes("container") || val.includes("«container»") || style.includes("c4.container") || style.includes("webbrowsercontainer")) {
    return "Container";
  }
  if (style.includes("component") || val.includes("«component»") || style.includes("c4.component")) {
    return "Component";
  }
  if (style.includes("group") || style.includes("swimlane") || style.includes("boundary") || style.includes("dashed")) {
    return "Boundary";
  }

  return "System";
}

function parseC4Content(cell: DrawIoCell): { label: string; description?: string; technology?: string } {
  let label = cell.attributes?.c4Name || cell.attributes?.name || "";
  let description = cell.attributes?.c4Description || cell.attributes?.description || "";
  let technology = cell.attributes?.c4Technology || cell.attributes?.technology || "";

  let val = cell.value || "";
  if (cell.attributes) {
    val = val.replace(/%(\w+)%/g, (_, key) => cell.attributes![key] || "");
  }

  if (!label && val) {
    const lines = val.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      label = lines[0].replace(/«[^»]+»/g, "").trim();
    }
    if (lines.length > 1) {
      const remaining = lines.slice(1);
      const techLine = remaining.find((l) => l.startsWith("[") && l.endsWith("]"));
      if (techLine) {
        technology = techLine.slice(1, -1).trim();
      }
      const descLines = remaining.filter((l) => !l.startsWith("[") || !l.endsWith("]"));
      if (descLines.length > 0) {
        description = descLines.join(" ");
      }
    }
  }

  // Clean remaining placeholders or TODO markers
  label = cleanText(label);
  description = cleanText(description);
  technology = cleanText(technology);

  if (!label) {
    label = `Element_${cell.id}`;
  }

  return {
    label,
    description: description || undefined,
    technology: technology || undefined,
  };
}

function parseRelationshipContent(cell: DrawIoCell): { label: string; technology?: string } {
  let label = cell.attributes?.c4Description || cell.attributes?.label || "";
  let technology = cell.attributes?.c4Technology || cell.attributes?.technology || "";

  let val = cell.value || "";
  if (cell.attributes) {
    val = val.replace(/%(\w+)%/g, (_, key) => cell.attributes![key] || "");
  }

  if (!label && val) {
    const lines = val.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      label = lines[0];
    }
    if (lines.length > 1) {
      const techLine = lines.find((l) => l.startsWith("[") && l.endsWith("]"));
      if (techLine) {
        technology = techLine.slice(1, -1).trim();
      }
    }
  }

  label = cleanText(label);
  technology = cleanText(technology);

  return { label: label || "Uses", technology: technology || undefined };
}

function formatC4Element(node: C4Node): string {
  const alias = node.alias;
  const label = escapeQuotes(node.label);
  const desc = node.description ? `, "${escapeQuotes(node.description)}"` : "";
  const tech = node.technology ? `, "${escapeQuotes(node.technology)}"` : "";

  switch (node.type) {
    case "Person":
      return `Person(${alias}, "${label}"${desc})`;
    case "Person_Ext":
      return `Person_Ext(${alias}, "${label}"${desc})`;
    case "System":
      return `System(${alias}, "${label}"${desc})`;
    case "System_Ext":
      return `System_Ext(${alias}, "${label}"${desc})`;
    case "SystemDb":
      return `SystemDb(${alias}, "${label}"${desc})`;
    case "Container":
      return `Container(${alias}, "${label}"${tech}${desc})`;
    case "ContainerDb":
      return `ContainerDb(${alias}, "${label}"${tech}${desc})`;
    case "Component":
      return `Component(${alias}, "${label}"${tech}${desc})`;
    default:
      return `System(${alias}, "${label}"${desc})`;
  }
}

function cleanText(str: string): string {
  return str.replace(/%[^%]+%/g, "").trim();
}

function sanitizeAlias(str: string): string {
  const sanitized = str.replace(/[^a-zA-Z0-9_]/g, "_");
  if (/^[0-9]/.test(sanitized)) {
    return `node_${sanitized}`;
  }
  return sanitized || "node";
}

function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"');
}
