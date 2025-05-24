export interface IScratchFile {
  name: string;
  extension: string;
  path: string;
  created: number;
  lastModified: number;
}

export enum FileTypeEnum {
  JavaScript = "js",
  TypeScript = "ts",
  HTML = "html",
  CSS = "css",
  JSON = "json",
  Markdown = "md",
  Text = "txt",
  SQL = "sql",
  Custom = "custom",
}

export const fileTypeLabels: Record<FileTypeEnum, string> = {
  [FileTypeEnum.JavaScript]: "JavaScript",
  [FileTypeEnum.TypeScript]: "TypeScript",
  [FileTypeEnum.HTML]: "HTML",
  [FileTypeEnum.CSS]: "CSS",
  [FileTypeEnum.JSON]: "JSON",
  [FileTypeEnum.Markdown]: "Markdown",
  [FileTypeEnum.Text]: "Plain Text",
  [FileTypeEnum.SQL]: "SQL",
  [FileTypeEnum.Custom]: "Custom File",
};

export const getFileTypeIcon = (extension: string): string => {
  switch (extension) {
    case FileTypeEnum.JavaScript:
      return "js";
    case FileTypeEnum.TypeScript:
      return "typescript";
    case FileTypeEnum.HTML:
      return "html";
    case FileTypeEnum.CSS:
      return "css";
    case FileTypeEnum.JSON:
      return "json";
    case FileTypeEnum.Markdown:
      return "markdown";
    case FileTypeEnum.SQL:
      return "database";
    case FileTypeEnum.Text:
    default:
      return "file";
  }
};
