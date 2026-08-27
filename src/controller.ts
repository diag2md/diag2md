import * as fs from "fs";
import { ConverterOptions, resolveConverterConfig, ResolvedConverterConfig } from "./config.js";
import { parseDrawIoXml } from "./parsers/drawio-parser.js";
import { convertDrawIoToMermaidC4 } from "./models/c4-converter.js";

export class ConverterController {
  private config: ResolvedConverterConfig;

  constructor(options: ConverterOptions) {
    this.config = resolveConverterConfig(options);
  }

  public getConfig(): ResolvedConverterConfig {
    return this.config;
  }

  public execute(): string {
    const { input, output, type } = this.config;

    if (type === "uml") {
      throw new Error("UML to Mermaid conversion is not implemented yet.");
    }

    let xmlContent = input;
    if (fs.existsSync(input)) {
      xmlContent = fs.readFileSync(input, "utf-8");
    }

    const graph = parseDrawIoXml(xmlContent);
    const mermaidMarkdown = convertDrawIoToMermaidC4(graph);

    if (output) {
      fs.writeFileSync(output, mermaidMarkdown, "utf-8");
    }

    return mermaidMarkdown;
  }
}
