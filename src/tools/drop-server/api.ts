import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  DropServerSnapshot,
  DropServerStartRequest,
  NetworkInterfaceDto,
  UploadEventPayload,
} from "../../contracts/drop-server";
import { DROP_SERVER_EVENTS } from "../../contracts/drop-server";

export async function listEligibleNetworkInterfaces(): Promise<NetworkInterfaceDto[]> {
  return invoke<NetworkInterfaceDto[]>("network_list_ipv4_interfaces");
}

export async function getDropServerStatus(): Promise<DropServerSnapshot> {
  return invoke<DropServerSnapshot>("drop_server_status");
}

export async function startDropServer(
  request: DropServerStartRequest
): Promise<DropServerSnapshot> {
  return invoke<DropServerSnapshot>("drop_server_start", { request });
}

export async function stopDropServer(): Promise<DropServerSnapshot> {
  return invoke<DropServerSnapshot>("drop_server_stop");
}

export async function selectDestinationFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Destination Directory",
  });
  if (typeof selected === "string") {
    return selected;
  }
  return null;
}

export interface DropServerEventListeners {
  onUploadStarted?: (payload: UploadEventPayload) => void;
  onUploadCompleted?: (payload: UploadEventPayload) => void;
  onUploadFailed?: (payload: UploadEventPayload) => void;
  onStoppedUnexpectedly?: () => void;
}

export async function subscribeToDropServerEvents(
  listeners: DropServerEventListeners
): Promise<() => void> {
  const unlisteners: UnlistenFn[] = [];

  if (listeners.onUploadStarted) {
    unlisteners.push(
      await listen<UploadEventPayload>(DROP_SERVER_EVENTS.UPLOAD_STARTED, (event) => {
        listeners.onUploadStarted?.(event.payload);
      })
    );
  }

  if (listeners.onUploadCompleted) {
    unlisteners.push(
      await listen<UploadEventPayload>(DROP_SERVER_EVENTS.UPLOAD_COMPLETED, (event) => {
        listeners.onUploadCompleted?.(event.payload);
      })
    );
  }

  if (listeners.onUploadFailed) {
    unlisteners.push(
      await listen<UploadEventPayload>(DROP_SERVER_EVENTS.UPLOAD_FAILED, (event) => {
        listeners.onUploadFailed?.(event.payload);
      })
    );
  }

  if (listeners.onStoppedUnexpectedly) {
    unlisteners.push(
      await listen(DROP_SERVER_EVENTS.STOPPED_UNEXPECTEDLY, () => {
        listeners.onStoppedUnexpectedly?.();
      })
    );
  }

  return () => {
    for (const unlisten of unlisteners) {
      unlisten();
    }
  };
}
