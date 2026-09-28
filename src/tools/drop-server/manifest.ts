import { FolderDown } from "lucide-react";
import type { ToolManifest } from "../../contracts/tools";

export const dropServerManifest: ToolManifest = Object.freeze({
  id: "drop-server",
  route: "/tools/drop-server",
  name: "LAN Drop Server",
  description: "Receive files from devices on your local network through an embedded HTTP endpoint.",
  category: "network",
  icon: FolderDown,
  search: {
    aliases: ["file drop", "lan upload", "local upload", "airdrop alternative"],
    intents: [
      "receive a file from another device",
      "send a file to this computer over wifi",
      "send a file over wifi",
      "temporary local file upload server",
    ],
    examples: [
      "receive a file from my iphone",
      "receive file from my iphone",
      "open a local upload page",
      "transfer a file over lan",
      "transfer file over lan",
      "local upload server",
    ],
  },
});
