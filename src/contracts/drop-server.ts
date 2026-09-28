export interface NetworkInterfaceDto {
  readonly name: string;
  readonly address: string; // canonical IPv4 string
  readonly isPrivate: boolean; // RFC1918
  readonly isRecommended: boolean;
}

export type PortSelection =
  | { readonly mode: "fixed"; readonly port: number }
  | { readonly mode: "auto" };

export interface DropServerStartRequest {
  readonly destinationPath: string;
  readonly bindAddress: string;
  readonly port: PortSelection;
}

export type DropServerLifecycle =
  | "stopped"
  | "starting"
  | "running"
  | "stopping";

export type UploadOutcome = "completed" | "failed";

export interface UploadRecord {
  readonly uploadId: number;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly receivedAtEpochMs: number;
  readonly outcome: UploadOutcome;
  readonly errorCode?: string;
}

export interface DropServerSnapshot {
  readonly lifecycle: DropServerLifecycle;
  readonly bindAddress: string | null;
  readonly port: number | null;
  readonly destinationPath: string | null;
  readonly startedAtEpochMs: number | null;
  readonly recentUploads: readonly UploadRecord[];
}

export interface UploadEventPayload {
  readonly uploadId: number;
  readonly fileName: string;
  readonly sizeBytes?: number;
  readonly receivedAtEpochMs: number;
  readonly errorCode?: string;
}

export const DROP_SERVER_EVENTS = {
  UPLOAD_STARTED: "drop-server://upload-started",
  UPLOAD_COMPLETED: "drop-server://upload-completed",
  UPLOAD_FAILED: "drop-server://upload-failed",
  STOPPED_UNEXPECTEDLY: "drop-server://stopped-unexpectedly",
} as const;

export type DropServerEventName =
  (typeof DROP_SERVER_EVENTS)[keyof typeof DROP_SERVER_EVENTS];
