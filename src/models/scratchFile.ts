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
      return "symbol-method";
    case FileTypeEnum.TypeScript:
      return "symbol-interface";
    case FileTypeEnum.HTML:
      return "browser";
    case FileTypeEnum.CSS:
      return "symbol-color";
    case FileTypeEnum.JSON:
      return "symbol-object";
    case FileTypeEnum.Markdown:
      return "markdown";
    case FileTypeEnum.SQL:
      return "database";
    case FileTypeEnum.Text:
      return "file-text";
    default:
      // For custom extensions, return extension-specific icons where available
      return getCustomFileIcon(extension);
  }
};

export const getCustomFileIcon = (extension: string): string => {
  const iconMap: { [key: string]: string } = {
    py: "symbol-method",
    rb: "ruby",
    go: "go",
    java: "coffee",
    c: "symbol-method",
    cpp: "symbol-method",
    cs: "symbol-class",
    php: "symbol-method",
    swift: "symbol-method",
    kt: "symbol-class",
    rs: "symbol-method",
    dart: "symbol-method",
    lua: "symbol-method",
    r: "graph",
    sh: "terminal",
    bash: "terminal",
    ps1: "terminal",
    bat: "terminal",
    yaml: "symbol-object",
    yml: "symbol-object",
    toml: "symbol-object",
    ini: "gear",
    cfg: "gear",
    xml: "symbol-object",
    vue: "symbol-color",
    svelte: "symbol-color",
    jsx: "symbol-method",
    tsx: "symbol-interface",
    scss: "symbol-color",
    sass: "symbol-color",
    less: "symbol-color",
    styl: "symbol-color",
    coffee: "coffee",
    elm: "symbol-method",
    hs: "symbol-method",
    clj: "symbol-method",
    ex: "symbol-method",
    erl: "symbol-method",
    vim: "gear",
    dockerfile: "package",
    tf: "symbol-object",
    hcl: "symbol-object",
    cody: "robot",
    ["*"]: "file-code",
  };

  return iconMap[extension.toLowerCase()] || "file-code";
};
