import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface StoragePaths {
  unifiedRoot: string;
  globalScratchFiles: string;
  workspaceScratchFiles: string;
  config: string;
}

export interface MigrationConfig {
  migrationCompleted: boolean;
  migrationDate?: string;
  oldPathsScanned: string[];
  lastMigrationVersion: string;
}

export class StorageHelper {
  private static readonly EXTENSION_NAME = ".myscratchpad-extension";
  private static readonly MIGRATION_VERSION = "1.0.0";
  private static readonly CONFIG_FILE = "config.json";

  /**
   * Get the unified storage paths
   */
  static getUnifiedStoragePaths(): StoragePaths {
    const homeDir = os.homedir();
    const unifiedRoot = path.join(homeDir, this.EXTENSION_NAME);

    return {
      unifiedRoot,
      globalScratchFiles: path.join(unifiedRoot, "scratchfiles", "global"),
      workspaceScratchFiles: path.join(
        unifiedRoot,
        "scratchfiles",
        "workspaces"
      ),
      config: path.join(unifiedRoot, this.CONFIG_FILE),
    };
  }

  /**
   * Get workspace-specific scratch files path
   */
  static getWorkspaceScratchFilesPath(workspaceName: string): string {
    const paths = this.getUnifiedStoragePaths();
    return path.join(paths.workspaceScratchFiles, workspaceName);
  }

  /**
   * Ensure all required directories exist
   */
  static ensureDirectoriesExist(): void {
    const paths = this.getUnifiedStoragePaths();

    // Create root directory
    this.createDirectoryIfNotExists(paths.unifiedRoot);

    // Create scratchfiles directories
    this.createDirectoryIfNotExists(paths.globalScratchFiles);
    this.createDirectoryIfNotExists(paths.workspaceScratchFiles);
  }

  /**
   * Create directory if it doesn't exist
   */
  private static createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get migration configuration
   */
  static getMigrationConfig(): MigrationConfig | null {
    const paths = this.getUnifiedStoragePaths();

    if (!fs.existsSync(paths.config)) {
      return null;
    }

    try {
      const configContent = fs.readFileSync(paths.config, "utf8");
      return JSON.parse(configContent) as MigrationConfig;
    } catch (error) {
      console.error("Error reading migration config:", error);
      return null;
    }
  }

  /**
   * Save migration configuration
   */
  static saveMigrationConfig(config: MigrationConfig): void {
    const paths = this.getUnifiedStoragePaths();

    try {
      this.ensureDirectoriesExist();
      fs.writeFileSync(paths.config, JSON.stringify(config, null, 2), "utf8");
    } catch (error) {
      console.error("Error saving migration config:", error);
      throw error;
    }
  }

  /**
   * Mark migration as completed
   */
  static markMigrationCompleted(oldPathsScanned: string[]): void {
    const config: MigrationConfig = {
      migrationCompleted: true,
      migrationDate: new Date().toISOString(),
      oldPathsScanned,
      lastMigrationVersion: this.MIGRATION_VERSION,
    };

    this.saveMigrationConfig(config);
  }

  /**
   * Check if migration has been completed
   */
  static isMigrationCompleted(): boolean {
    const config = this.getMigrationConfig();
    return config?.migrationCompleted === true;
  }

  /**
   * Get all possible old storage paths for different IDEs
   */
  static getOldStoragePaths(): string[] {
    const homeDir = os.homedir();
    const ideNames = ["Code", "Code - Insiders", "Cursor", "Windsurf"];
    const oldPaths: string[] = [];

    // Common application support paths for different platforms
    const appSupportPaths = this.getAppSupportPaths(homeDir);

    for (const appSupportPath of appSupportPaths) {
      for (const ideName of ideNames) {
        const globalStoragePath = path.join(
          appSupportPath,
          ideName,
          "User",
          "globalStorage",
          "jccoder.myscratchpad"
        );

        const workspaceStoragePath = path.join(
          appSupportPath,
          ideName,
          "User",
          "globalStorage",
          "jccoder.myscratchpad",
          "workspaceScratchFiles"
        );

        oldPaths.push(globalStoragePath, workspaceStoragePath);
      }
    }

    return oldPaths;
  }

  /**
   * Get application support paths for different platforms
   */
  private static getAppSupportPaths(homeDir: string): string[] {
    const paths: string[] = [];

    switch (process.platform) {
      case "darwin": // macOS
        paths.push(
          path.join(homeDir, "Library", "Application Support"),
          path.join(homeDir, "Library", "Application Support", "Code")
        );
        break;
      case "win32": // Windows
        paths.push(
          path.join(homeDir, "AppData", "Roaming"),
          path.join(homeDir, "AppData", "Local")
        );
        break;
      case "linux": // Linux
        paths.push(
          path.join(homeDir, ".config"),
          path.join(homeDir, ".local", "share")
        );
        break;
    }

    return paths;
  }

  /**
   * Scan for existing files in old storage paths
   */
  static scanOldStoragePaths(): {
    globalFiles: string[];
    workspaceFiles: { [workspaceName: string]: string[] };
  } {
    const oldPaths = this.getOldStoragePaths();
    const globalFiles: string[] = [];
    const workspaceFiles: { [workspaceName: string]: string[] } = {};

    for (const oldPath of oldPaths) {
      if (!fs.existsSync(oldPath)) {
        continue;
      }

      try {
        // Check for global scratch files
        const globalScratchFilesPath = path.join(oldPath, "scratchFiles");
        if (fs.existsSync(globalScratchFilesPath)) {
          const files = this.getFilesInDirectory(globalScratchFilesPath);
          globalFiles.push(...files);
        }

        // Check for workspace scratch files
        const workspaceScratchFilesPath = path.join(
          oldPath,
          "workspaceScratchFiles"
        );
        if (fs.existsSync(workspaceScratchFilesPath)) {
          const workspaceDirs = fs
            .readdirSync(workspaceScratchFilesPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

          for (const workspaceDir of workspaceDirs) {
            const workspacePath = path.join(
              workspaceScratchFilesPath,
              workspaceDir
            );
            const files = this.getFilesInDirectory(workspacePath);
            if (files.length > 0) {
              workspaceFiles[workspaceDir] = files;
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning old path ${oldPath}:`, error);
      }
    }

    return { globalFiles, workspaceFiles };
  }

  /**
   * Get all files in a directory recursively
   */
  private static getFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Recursively get files from subdirectories
          const subFiles = this.getFilesInDirectory(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * Copy file from source to destination
   */
  static copyFile(sourcePath: string, destinationPath: string): void {
    // Ensure destination directory exists
    const destDir = path.dirname(destinationPath);
    this.createDirectoryIfNotExists(destDir);

    // Copy file
    fs.copyFileSync(sourcePath, destinationPath);
  }

  /**
   * Delete file or directory recursively
   */
  static deletePath(targetPath: string): void {
    if (!fs.existsSync(targetPath)) {
      return;
    }

    const stats = fs.statSync(targetPath);

    if (stats.isDirectory()) {
      // Delete directory recursively
      const items = fs.readdirSync(targetPath);
      for (const item of items) {
        this.deletePath(path.join(targetPath, item));
      }
      fs.rmdirSync(targetPath);
    } else {
      // Delete file
      fs.unlinkSync(targetPath);
    }
  }

  /**
   * Check if we have write access to the home directory
   */
  static checkHomeDirectoryAccess(): boolean {
    try {
      const paths = this.getUnifiedStoragePaths();
      this.ensureDirectoriesExist();

      // Try to create a test file
      const testFile = path.join(paths.unifiedRoot, ".test-write-access");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      return true;
    } catch (error) {
      console.error("No write access to home directory:", error);
      return false;
    }
  }

  /**
   * Generate unique filename if conflict exists
   */
  static generateUniqueFilename(directory: string, filename: string): string {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    let counter = 1;
    let newFilename = filename;

    while (fs.existsSync(path.join(directory, newFilename))) {
      newFilename = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }

    return newFilename;
  }
}
