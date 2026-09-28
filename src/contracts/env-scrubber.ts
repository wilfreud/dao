export const MAX_ENV_INPUT_BYTES = 1024 * 1024; // 1 MiB

export type ScrubDiagnosticKind =
  | "unrecognized-line"
  | "unterminated-quote";

export interface ScrubDiagnostic {
  readonly line: number; // 1-based start line
  readonly kind: ScrubDiagnosticKind;
  readonly message: string;
}

export interface ScrubResult {
  readonly output: string;
  readonly redactedAssignments: number;
  readonly diagnostics: readonly ScrubDiagnostic[];
}
