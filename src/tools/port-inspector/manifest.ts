import { Radio } from "lucide-react";
import type { ToolManifest } from "../../contracts/tools";

export const portInspectorManifest: ToolManifest = Object.freeze({
  id: "port-inspector",
  route: "/tools/port-inspector",
  name: "Port Inspector",
  description: "Find which local process owns a port and terminate it when possible.",
  category: "network",
  icon: Radio,
  search: {
    aliases: [
      "port",
      "pid",
      "process",
      "listener",
      "socket",
      "kill port",
      "free port",
      "lsof",
      "ss",
      "netstat",
    ],
    intents: [
      "who uses port",
      "who uses port 3000",
      "who uses port 5432",
      "kill 3000",
      "kill port 5000",
      "free localhost 8080",
      "find process listening on 5432",
      "see what is running on a port",
      "terminate process on port",
      "port already in use",
      "find process by port",
    ],
    examples: [
      "who uses port 3000",
      "kill port 5000",
      "free localhost 8080",
      "find process listening on 5432",
    ],
  },
});
