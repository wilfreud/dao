import { RouterProvider } from "react-router";
import { router } from "./router";
import { LauncherStateProvider } from "./launcher-state";

export function App() {
  return (
    <LauncherStateProvider>
      <RouterProvider router={router} />
    </LauncherStateProvider>
  );
}

export default App;
