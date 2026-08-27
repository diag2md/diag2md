import { describe, it, expect } from "vitest";
import { ConverterController } from "../src/controller.js";

describe("ConverterController", () => {
  it("should configure c4 diagram type by default", () => {
    const controller = new ConverterController({ input: "<xml></xml>" });
    expect(controller.getConfig().type).toBe("c4");
  });

  it("should throw error for unsupported type or uml type", () => {
    const controller = new ConverterController({ input: "<xml></xml>", type: "uml" });
    expect(() => controller.execute()).toThrow("UML to Mermaid conversion is not implemented yet.");
  });

  it("should throw error for invalid diagram type", () => {
    expect(() => new ConverterController({ input: "<xml></xml>", type: "invalid" as any })).toThrow(
      'Unsupported diagram type "invalid"'
    );
  });
});
