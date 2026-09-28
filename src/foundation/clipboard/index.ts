import { writeText, writeImage } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Copy plain text to the system clipboard using the narrow Tauri write-text capability.
 */
export async function copyText(text: string): Promise<void> {
  await writeText(text);
}

/**
 * Copy image bytes (e.g. PNG) to the system clipboard using the narrow Tauri write-image capability.
 */
export async function copyImage(bytes: Uint8Array): Promise<void> {
  await writeImage(bytes);
}
