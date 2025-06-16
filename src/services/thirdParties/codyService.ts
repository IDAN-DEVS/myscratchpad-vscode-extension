import * as vscode from "vscode";

const extensionName = "Cody Ai";
const extensionIdentifier = "sourcegraph.cody-ai";

const CODY_COMMAND = {
  MENTION: {
    FILE: "cody.mention.file",
  },
  COMMAND: {
    CUSTOM: "cody.command.custom",
  },
};

function checkCodyIsInstalledAndReady(): boolean {
  const codyExtension = vscode.extensions.getExtension(extensionIdentifier);

  if (!codyExtension) {
    vscode.window.showErrorMessage(
      `${extensionName} extension is not installed or is disabled.`
    );
    return false;
  }

  if (!codyExtension.packageJSON?.version) {
    vscode.window.showErrorMessage(
      `${extensionName} extension is not loaded properly.`
    );
    return false;
  }

  if (!codyExtension.isActive) {
    vscode.window.showErrorMessage(
      `${extensionName} extension is not active.`
    );
    return false;
  }

  return true;
}

async function executeMentionFileCommand(uri: vscode.Uri) {
  try {
    const isReady = checkCodyIsInstalledAndReady();
    if (!isReady) {
      return;
    }
    await vscode.commands.executeCommand(CODY_COMMAND.MENTION.FILE, uri);
    vscode.window.showInformationMessage(
      `File added as context in ${extensionName}.`
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to trigger ${extensionName} to mention file: ${error.message}`
    );
  }
}

export const codyService = {
  executeMentionFileCommand,
};
