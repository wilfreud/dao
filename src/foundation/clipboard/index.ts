import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Copy plain text to the system clipboard using the narrow Tauri write-text capability.
 */
export async function copyText(text: string): Promise<void> {
  await writeText(text);
}
