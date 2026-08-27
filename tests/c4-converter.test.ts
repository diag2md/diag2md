import { describe, it, expect } from "vitest";
import { parseDrawIoXml } from "../src/parsers/drawio-parser.js";
import { convertDrawIoToMermaidC4 } from "../src/models/c4-converter.js";

describe("c4-converter", () => {
  it("should convert C4 elements into Mermaid C4 markdown", () => {
    const xml = `
      <mxfile name="Architecture Diagram">
        <diagram id="diag-1" name="System Context">
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="2" value="Bank Customer&#10;Personal banking user" style="shape=mxgraph.c4.person;" parent="1" vertex="1" />
              <mxCell id="3" value="Internet Banking&#10;[Spring Boot]&#10;Allows online banking" style="shape=mxgraph.c4.container;" parent="1" vertex="1" />
              <mxCell id="4" value="Submits Payments&#10;[HTTPS]" style="" parent="1" source="2" target="3" edge="1" />
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `;

    const graph = parseDrawIoXml(xml);
    const mermaid = convertDrawIoToMermaidC4(graph);

    expect(mermaid).toContain("C4Context");
    expect(mermaid).toContain("title System Context");
    expect(mermaid).toContain('Person(node_2, "Bank Customer", "Personal banking user")');
    expect(mermaid).toContain('Container(node_3, "Internet Banking", "Spring Boot", "Allows online banking")');
    expect(mermaid).toContain('Rel(node_2, node_3, "Submits Payments", "HTTPS")');
  });

  it("should convert multi-page Draw.io diagrams into separate ```mermaid blocks", () => {
    const xml = `
      <mxfile pages="2">
        <diagram id="diag-1" name="System Context">
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="2" value="User" style="shape=mxgraph.c4.person;" parent="1" vertex="1" />
            </root>
          </mxGraphModel>
        </diagram>
        <diagram id="diag-2" name="Container View">
          <mxGraphModel>
            <root>
              <mxCell id="0" />
              <mxCell id="1" parent="0" />
              <mxCell id="3" value="API Gateway" style="shape=mxgraph.c4.container;" parent="1" vertex="1" />
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `;

    const graph = parseDrawIoXml(xml);
    const mermaid = convertDrawIoToMermaidC4(graph);

    const blocks = mermaid.split("```mermaid");
    expect(blocks.length).toBe(3); // split by ```mermaid gives empty string before 1st block, then 2 blocks

    expect(mermaid).toContain("title System Context");
    expect(mermaid).toContain("title Container View");
    expect(mermaid).toContain('Person(node_2, "User")');
    expect(mermaid).toContain('Container(node_3, "API Gateway")');
  });
});
