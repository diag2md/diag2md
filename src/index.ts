/**
 * diag2md - Draw.io C4 Architecture to Mermaid Markdown Converter
 */

import { ConverterController } from "./controller.js";

export * from "./config.js";
export * from "./controller.js";
export * from "./parsers/drawio-parser.js";
export * from "./models/c4-converter.js";

/**
 * Convenience function to convert C4 Draw.io XML directly to Mermaid Markdown string.
 */
export function convertC4ToMermaid(xmlContent: string): string {
  const controller = new ConverterController({
    input: xmlContent,
    type: "c4",
  });
  return controller.execute();
}
