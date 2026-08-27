/**
 * Converter options and configuration definitions for diag2md.
 * Scope: Converter_Controller_Agent (/src)
 */

export type DiagramType = "c4" | "uml";

export interface ConverterOptions {
  /** Input Draw.io diagram file path or XML raw string */
  input: string;
  /** Output Mermaid Markdown file path (optional) */
  output?: string;
  /** Type of diagram to convert ('c4' | 'uml'). Default is 'c4' */
  type?: DiagramType;
}

export interface ResolvedConverterConfig {
  input: string;
  output?: string;
  type: DiagramType;
}

export function resolveConverterConfig(options: ConverterOptions): ResolvedConverterConfig {
  const type = (options.type || "c4").toLowerCase() as DiagramType;
  if (type !== "c4" && type !== "uml") {
    throw new Error(`Unsupported diagram type "${options.type}". Supported types are "c4" and "uml".`);
  }

  return {
    input: options.input,
    output: options.output,
    type,
  };
}
