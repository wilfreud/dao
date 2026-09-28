import { createHashRouter } from "react-router";
import { LauncherPage } from "./LauncherPage";
import { DropServerPage } from "../tools/drop-server/DropServerPage";
import { EnvScrubberPage } from "../tools/env-scrubber/EnvScrubberPage";
import { PortInspectorPage } from "../tools/port-inspector/PortInspectorPage";
import { QrGeneratorPage } from "../tools/qr-generator/QrGeneratorPage";
import { NotFoundPage } from "./NotFoundPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <LauncherPage />,
  },
  {
    path: "/tools/drop-server",
    element: <DropServerPage />,
  },
  {
    path: "/tools/env-scrubber",
    element: <EnvScrubberPage />,
  },
  {
    path: "/tools/port-inspector",
    element: <PortInspectorPage />,
  },
  {
    path: "/tools/qr-generator",
    element: <QrGeneratorPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
