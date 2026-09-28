import { invoke } from "@tauri-apps/api/core";
import type {
  InspectPortResult,
  TerminateProcessRequest,
  TerminateProcessResult,
} from "../../contracts/port-inspector";

export async function inspectPort(port: number): Promise<InspectPortResult> {
  return invoke<InspectPortResult>("inspect_port", { port });
}

export async function terminatePortProcess(
  request: TerminateProcessRequest
): Promise<TerminateProcessResult> {
  return invoke<TerminateProcessResult>("terminate_port_process", { request });
}
