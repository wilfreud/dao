export type CommandErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_PORT"
  | "INVALID_BIND_ADDRESS"
  | "NETWORK_ENUMERATION_FAILED"
  | "DESTINATION_NOT_FOUND"
  | "DESTINATION_NOT_DIRECTORY"
  | "DESTINATION_NOT_WRITABLE"
  | "SERVER_ALREADY_RUNNING"
  | "SERVER_NOT_RUNNING"
  | "SERVER_TRANSITION_IN_PROGRESS"
  | "PORT_IN_USE"
  | "SERVER_BIND_FAILED"
  | "SERVER_INTERNAL"
  | "SOCKET_TABLE_UNAVAILABLE"
  | "PROCESS_LOOKUP_FAILED"
  | "PROCESS_NOT_FOUND"
  | "PROTECTED_PROCESS"
  | "TERMINATION_DENIED"
  | "TERMINATION_FAILED"
  | "UNSUPPORTED_PLATFORM";

export interface AppCommandError {
  readonly code: CommandErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}
