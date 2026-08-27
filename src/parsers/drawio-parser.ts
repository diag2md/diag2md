import { XMLParser } from "fast-xml-parser";
import * as zlib from "zlib";

export interface DrawIoCell {
  id: string;
  value: string;
  style: string;
  parent?: string;
  vertex?: boolean;
  edge?: boolean;
  source?: string;
  target?: string;
  attributes?: Record<string, string>;
  diagramName?: string;
}

export interface DrawIoDiagram {
  id?: string;
  name?: string;
  cells: DrawIoCell[];
}

export interface DrawIoGraph {
  diagramId?: string;
  diagramName?: string;
  cells: DrawIoCell[];
  diagrams: DrawIoDiagram[];
}

/**
 * Decode compressed draw.io diagram payload if base64 encoded and deflated.
 */
export function decodeDrawIoDiagram(data: string): string {
  const trimmed = data.trim();
  if (trimmed.startsWith("<")) {
    return trimmed;
  }

  try {
    const buffer = Buffer.from(trimmed, "base64");
    // Draw.io uses raw deflate (wbits = -15)
    let decompressed: Buffer;
    try {
      decompressed = zlib.inflateRawSync(buffer);
    } catch {
      decompressed = zlib.inflateSync(buffer);
    }
    const decodedUri = decodeURIComponent(decompressed.toString("utf-8"));
    return decodedUri;
  } catch {
    // If decoding fails, return raw trimmed data
    return trimmed;
  }
}

/**
 * Parse Draw.io XML (.xml or .drawio) into a normalized DrawIoGraph representation.
 * Scope: Parser_Agent (/src/parsers)
 */
export function parseDrawIoXml(xmlContent: string): DrawIoGraph {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });

  const parsed = parser.parse(xmlContent);
  const diagramsList: DrawIoDiagram[] = [];

  if (parsed.mxfile) {
    const rawDiagrams = parsed.mxfile.diagram;
    const diagrams = Array.isArray(rawDiagrams) ? rawDiagrams : rawDiagrams ? [rawDiagrams] : [];

    diagrams.forEach((diagram: any, index: number) => {
      const diagramName = diagram["@_name"] || `Page-${index + 1}`;
      const diagramId = diagram["@_id"] || `page-${index + 1}`;
      const pageCells: DrawIoCell[] = [];

      let rootNode: any = null;
      if (typeof diagram === "string") {
        const decompressedXml = decodeDrawIoDiagram(diagram);
        const innerParsed = parser.parse(decompressedXml);
        rootNode = innerParsed.mxGraphModel?.root;
      } else if (diagram["#text"]) {
        const decompressedXml = decodeDrawIoDiagram(diagram["#text"]);
        const innerParsed = parser.parse(decompressedXml);
        rootNode = innerParsed.mxGraphModel?.root;
      } else if (diagram.mxGraphModel) {
        rootNode = diagram.mxGraphModel.root;
      }

      if (rootNode) {
        extractCellsFromRoot(rootNode, diagramName, pageCells);
      }

      diagramsList.push({
        id: diagramId,
        name: diagramName,
        cells: pageCells,
      });
    });
  } else if (parsed.mxGraphModel) {
    const pageCells: DrawIoCell[] = [];
    if (parsed.mxGraphModel.root) {
      extractCellsFromRoot(parsed.mxGraphModel.root, "Diagram", pageCells);
    }
    diagramsList.push({
      id: "diagram-1",
      name: "Diagram",
      cells: pageCells,
    });
  }

  const allCells = diagramsList.flatMap((d) => d.cells);
  const mainDiagram = diagramsList[0];

  return {
    diagramId: mainDiagram?.id || "",
    diagramName: mainDiagram?.name || "",
    cells: allCells,
    diagrams: diagramsList,
  };
}

function extractCellsFromRoot(rootNode: any, diagramName: string, cellsOut: DrawIoCell[]) {
  const processCell = (cellData: any, extraAttributes: Record<string, string> = {}) => {
    const id = cellData["@_id"] || extraAttributes.id || "";
    let value = cellData["@_value"] || extraAttributes.label || extraAttributes.value || "";
    const style = cellData["@_style"] || "";
    const parent = cellData["@_parent"] || extraAttributes.parent;
    const vertex = cellData["@_vertex"] === "1" || cellData["@_vertex"] === 1 || cellData["@_vertex"] === true;
    const edge = cellData["@_edge"] === "1" || cellData["@_edge"] === 1 || cellData["@_edge"] === true;
    const source = cellData["@_source"] || extraAttributes.source;
    const target = cellData["@_target"] || extraAttributes.target;

    // Substitute placeholders like %c4Name% using extraAttributes
    if (value && extraAttributes) {
      value = value.replace(/%(\w+)%/g, (_: string, key: string) => extraAttributes[key] || "");
    }

    if (id && id !== "0" && id !== "1") {
      cellsOut.push({
        id: String(id),
        value: unescapeHtml(String(value)),
        style: String(style),
        parent: parent ? String(parent) : undefined,
        vertex,
        edge,
        source: source ? String(source) : undefined,
        target: target ? String(target) : undefined,
        attributes: extraAttributes,
        diagramName,
      });
    }
  };

  if (rootNode.mxCell) {
    const rawCells = Array.isArray(rootNode.mxCell) ? rootNode.mxCell : [rootNode.mxCell];
    rawCells.forEach((c: any) => processCell(c));
  }

  if (rootNode.object) {
    const rawObjects = Array.isArray(rootNode.object) ? rootNode.object : [rootNode.object];
    rawObjects.forEach((obj: any) => {
      const attrs: Record<string, string> = {};
      Object.keys(obj).forEach((key) => {
        if (key.startsWith("@_")) {
          attrs[key.substring(2)] = String(obj[key]);
        }
      });
      if (obj.mxCell) {
        processCell(obj.mxCell, attrs);
      }
    });
  }
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&#10;|&#xa;|&#xA;/g, "\n")
    .replace(/&#13;|&#xd;|&#xD;/g, "\r")
    .replace(/&#(\d+);/g, (_: string, code: string) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_: string, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, ""); // Strip remaining HTML tags
}
