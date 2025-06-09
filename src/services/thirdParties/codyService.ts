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
  try {
    const codyExtension = vscode.extensions.getExtension(extensionIdentifier);

    if (!codyExtension) {
      vscode.window.showErrorMessage(
        `${extensionName} extension is not installed or is disabled.`
      );
      return false;
    }

    if (!codyExtension.isActive) {
      vscode.window.showErrorMessage(
        `${extensionName} extension is not active.`
      );
      return false;
    }

    vscode.window.showInformationMessage(
      `${extensionName} extension is ready.`
    );
    return true;
  } catch (error) {
    console.error("Error checking for cody extension", error);
    vscode.window.showErrorMessage(
      `Failed to check ${extensionName} extension status.`
    );
    return false;
  }
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
