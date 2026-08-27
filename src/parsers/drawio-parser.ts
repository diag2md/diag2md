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
}

export interface DrawIoGraph {
  diagramId?: string;
  diagramName?: string;
  cells: DrawIoCell[];
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
  let rootNode: any = null;
  let diagramName = "";
  let diagramId = "";

  if (parsed.mxfile) {
    let diagram = parsed.mxfile.diagram;
    if (Array.isArray(diagram)) {
      diagram = diagram[0];
    }
    if (diagram) {
      diagramName = diagram["@_name"] || "";
      diagramId = diagram["@_id"] || "";
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
    }
  } else if (parsed.mxGraphModel) {
    rootNode = parsed.mxGraphModel.root;
  }

  const cells: DrawIoCell[] = [];

  if (rootNode) {
    const processCell = (cellData: any, extraAttributes: Record<string, string> = {}) => {
      const id = cellData["@_id"] || extraAttributes.id || "";
      const value = cellData["@_value"] || extraAttributes.label || extraAttributes.value || "";
      const style = cellData["@_style"] || "";
      const parent = cellData["@_parent"] || extraAttributes.parent;
      const vertex = cellData["@_vertex"] === "1" || cellData["@_vertex"] === 1 || cellData["@_vertex"] === true;
      const edge = cellData["@_edge"] === "1" || cellData["@_edge"] === 1 || cellData["@_edge"] === true;
      const source = cellData["@_source"] || extraAttributes.source;
      const target = cellData["@_target"] || extraAttributes.target;

      if (id && id !== "0" && id !== "1") {
        cells.push({
          id: String(id),
          value: unescapeHtml(String(value)),
          style: String(style),
          parent: parent ? String(parent) : undefined,
          vertex,
          edge,
          source: source ? String(source) : undefined,
          target: target ? String(target) : undefined,
          attributes: extraAttributes,
        });
      }
    };

    // Helper to traverse cells and objects
    const extractFromRoot = (container: any) => {
      if (!container) return;

      if (container.mxCell) {
        const rawCells = Array.isArray(container.mxCell) ? container.mxCell : [container.mxCell];
        rawCells.forEach((c: any) => processCell(c));
      }

      if (container.object) {
        const rawObjects = Array.isArray(container.object) ? container.object : [container.object];
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
    };

    extractFromRoot(rootNode);
  }

  return {
    diagramId,
    diagramName,
    cells,
  };
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, ""); // Strip remaining HTML tags
}
