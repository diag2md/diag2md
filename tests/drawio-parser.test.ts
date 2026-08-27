import { describe, it, expect } from "vitest";
import { parseDrawIoXml, decodeDrawIoDiagram } from "../src/parsers/drawio-parser.js";
import * as zlib from "zlib";

describe("drawio-parser", () => {
  it("should parse raw uncompressed XML", () => {
    const xml = `
      <mxfile name="Test System">
        <diagram id="diag-1" name="Context">
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="2" value="Customer" style="shape=mxgraph.c4.person;" parent="1" vertex="1" />
              <mxCell id="3" value="Banking App" style="shape=mxgraph.c4.softwareSystem;" parent="1" vertex="1" />
              <mxCell id="4" value="Uses" style="edgeStyle=orthogonalEdgeStyle;" parent="1" source="2" target="3" edge="1" />
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `;

    const graph = parseDrawIoXml(xml);
    expect(graph.diagramName).toBe("Context");
    expect(graph.cells.length).toBe(3); // cell 2, 3, 4 (0 and 1 skipped)
    
    const person = graph.cells.find((c) => c.id === "2");
    expect(person?.value).toBe("Customer");
    expect(person?.vertex).toBe(true);

    const edge = graph.cells.find((c) => c.id === "4");
    expect(edge?.edge).toBe(true);
    expect(edge?.source).toBe("2");
    expect(edge?.target).toBe("3");
  });

  it("should decode compressed deflated diagram string", () => {
    const rawXml = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/><mxCell id='2' value='User' vertex='1'/></root></mxGraphModel>";
    const deflated = zlib.deflateRawSync(Buffer.from(encodeURIComponent(rawXml)));
    const base64 = deflated.toString("base64");

    const decoded = decodeDrawIoDiagram(base64);
    expect(decoded).toContain("<mxGraphModel>");
    expect(decoded).toContain("User");
  });
});
