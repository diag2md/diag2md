#!/usr/bin/env node
import { Command } from "commander";
import * as path from "path";
import { ConverterController } from "./controller.js";

const program = new Command();

program
  .name("diag2md")
  .description("Convert Draw.io C4 architecture diagrams into Mermaid Markdown")
  .version("1.0.0")
  .option("-i, --input <path>", "Input Draw.io (.xml / .drawio) file")
  .option("-o, --output <path>", "Output Mermaid (.md) file")
  .option("-t, --type <type>", "Diagram type: 'c4' or 'uml'", "c4")
  .action((options) => {
    if (!options.input) {
      console.error("Error: --input option is required.");
      process.exit(1);
    }

    try {
      const controller = new ConverterController({
        input: path.resolve(process.cwd(), options.input),
        output: options.output ? path.resolve(process.cwd(), options.output) : undefined,
        type: options.type,
      });

      const result = controller.execute();

      if (options.output) {
        console.log(`Successfully converted ${options.input} -> ${options.output}`);
      } else {
        console.log(result);
      }
    } catch (err: any) {
      console.error(`Conversion failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
