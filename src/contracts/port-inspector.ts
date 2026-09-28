export type NetworkProtocol = "tcp" | "udp";
export type AddressFamily = "ipv4" | "ipv6";

export interface ProcessSummary {
  readonly pid: number;
  readonly name: string | null;
  readonly executablePath: string | null;
  readonly command: readonly string[] | null;
}

export interface PortSocket {
  readonly protocol: NetworkProtocol;
  readonly addressFamily: AddressFamily;
  readonly localAddress: string;
  readonly localPort: number;
  readonly tcpState: string | null;
  readonly associatedPids: readonly number[];
}

export interface ProcessOwner {
  readonly process: ProcessSummary;
  readonly sockets: readonly PortSocket[];
}

export interface CommandSuggestion {
  readonly label: string;
  readonly command: string;
  readonly requiresElevation: boolean;
}

export interface InspectPortResult {
  readonly port: number;
  readonly sockets: readonly PortSocket[];
  readonly owners: readonly ProcessOwner[];
  readonly unresolvedSocketCount: number;
  readonly inspectionCommands: readonly CommandSuggestion[];
}

export interface TerminateProcessRequest {
  readonly pid: number;
  readonly portContext: number;
  readonly mode: "graceful" | "force";
}

export type SignalAttempted = "term" | "kill" | "platform-terminate";

export interface TerminateProcessResult {
  readonly pid: number;
  readonly signalAttempted: SignalAttempted;
  readonly signalSent: boolean;
  readonly stillRunning: boolean;
  readonly terminationCommands: readonly CommandSuggestion[];
}

export type PortInspectorErrorCode =
  | "INVALID_PORT"
  | "SOCKET_TABLE_UNAVAILABLE"
  | "PROCESS_LOOKUP_FAILED"
  | "PROCESS_NOT_FOUND"
  | "PROTECTED_PROCESS"
  | "TERMINATION_DENIED"
  | "TERMINATION_FAILED"
  | "UNSUPPORTED_PLATFORM"
  | "INTERNAL_ERROR";
