import { describe, it, expect } from "vitest";
import { convertC4ToMermaid, ConverterController } from "../src/index.js";

describe("CLI Integration & Converter", () => {
  it("should return valid mermaid C4 diagram string via convertC4ToMermaid", () => {
    const xml = `
      <mxfile name="Test">
        <diagram id="d1" name="Context">
          <mxGraphModel>
            <root>
              <mxCell id="0"/>
              <mxCell id="1" parent="0"/>
              <mxCell id="2" value="User" style="shape=mxgraph.c4.person;" parent="1" vertex="1"/>
            </root>
          </mxGraphModel>
        </diagram>
      </mxfile>
    `;
    const result = convertC4ToMermaid(xml);
    expect(result).toContain("C4Context");
    expect(result).toContain("Person(node_2, \"User\")");
  });

  it("should support ConverterController options execution", () => {
    const controller = new ConverterController({
      input: "<mxGraphModel><root><mxCell id='2' value='App' style='shape=mxgraph.c4.system;' vertex='1'/></root></mxGraphModel>",
      type: "c4",
    });
    const output = controller.execute();
    expect(output).toContain("C4Context");
    expect(output).toContain("System(node_2, \"App\")");
  });
});
