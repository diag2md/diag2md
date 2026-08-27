import { DrawIoGraph, DrawIoCell } from "../parsers/drawio-parser.js";

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
  const nodesMap = new Map<string, C4Node>();
  const relationships: C4Relationship[] = [];
  const vertexCells = graph.cells.filter((c) => c.vertex);
  const edgeCells = graph.cells.filter((c) => c.edge && c.source && c.target);

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
      const { label, technology } = parseRelationshipContent(cell.value);
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

  if (graph.diagramName) {
    lines.push(`  title ${graph.diagramName}`);
  }

  lines.push("");

  // Render top-level boundaries & nodes
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
  // Ignore cells with no style and empty value that aren't boundaries
  if (!cell.style && !cell.value && !cell.attributes?.c4Type) return true;
  return false;
}

function detectC4Type(cell: DrawIoCell): C4Node["type"] {
  const style = (cell.style || "").toLowerCase();
  const c4TypeAttr = cell.attributes?.c4Type;
  const val = (cell.value || "").toLowerCase();

  if (c4TypeAttr) {
    const matched = matchTypeString(c4TypeAttr);
    if (matched) return matched;
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
  if (style.includes("containerdb") || val.includes("container db")) {
    return "ContainerDb";
  }
  if (style.includes("container") || val.includes("«container»") || style.includes("c4.container")) {
    return "Container";
  }
  if (style.includes("component") || val.includes("«component»") || style.includes("c4.component")) {
    return "Component";
  }
  if (style.includes("group") || style.includes("swimlane") || style.includes("boundary")) {
    return "Boundary";
  }

  // Fallback default
  return "System";
}

function matchTypeString(str: string): C4Node["type"] | null {
  const normalized = str.trim().toLowerCase();
  switch (normalized) {
    case "person": return "Person";
    case "person_ext": return "Person_Ext";
    case "system": return "System";
    case "system_ext": return "System_Ext";
    case "systemdb": return "SystemDb";
    case "container": return "Container";
    case "containerdb": return "ContainerDb";
    case "component": return "Component";
    case "boundary": return "Boundary";
    default: return null;
  }
}

function parseC4Content(cell: DrawIoCell): { label: string; description?: string; technology?: string } {
  let label = cell.attributes?.c4Name || cell.attributes?.name || "";
  let description = cell.attributes?.c4Description || cell.attributes?.description || "";
  let technology = cell.attributes?.c4Technology || cell.attributes?.technology || "";

  if (!label && cell.value) {
    const lines = cell.value.split("\n").map((l) => l.trim()).filter(Boolean);
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

  if (!label) {
    label = `Element_${cell.id}`;
  }

  return {
    label,
    description: description || undefined,
    technology: technology || undefined,
  };
}

function parseRelationshipContent(value: string): { label: string; technology?: string } {
  let label = "";
  let technology: string | undefined;

  if (value) {
    const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
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

  return { label: label || "Uses", technology };
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
