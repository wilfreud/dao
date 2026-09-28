import { FileText } from "lucide-react";
import type { ToolManifest } from "../../contracts/tools";

export const envScrubberManifest: ToolManifest = Object.freeze({
  id: "env-scrubber",
  route: "/tools/env-scrubber",
  name: "Env Scrubber",
  description: "Redact environment variable values while preserving keys, formatting, and comments.",
  category: "text",
  icon: FileText,
  search: {
    aliases: ["dotenv", "env redactor", "secret scrubber", "sanitize env"],
    intents: [
      "remove secrets from an env file",
      "share dotenv without values",
      "empty environment variable values",
      "empty environment variables",
    ],
    examples: [
      "remove passwords from .env",
      "remove passwords from env",
      "share dotenv without values",
      "make an env example file",
      "strip secret values",
      "strip secrets",
    ],
  },
});
