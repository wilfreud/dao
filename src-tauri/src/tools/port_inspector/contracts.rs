use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NetworkProtocol {
    Tcp,
    Udp,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AddressFamily {
    Ipv4,
    Ipv6,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSummary {
    pub pid: u32,
    pub name: Option<String>,
    pub executable_path: Option<String>,
    pub command: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PortSocket {
    pub protocol: NetworkProtocol,
    pub address_family: AddressFamily,
    pub local_address: String,
    pub local_port: u16,
    pub tcp_state: Option<String>,
    pub associated_pids: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProcessOwner {
    pub process: ProcessSummary,
    pub sockets: Vec<PortSocket>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommandSuggestion {
    pub label: String,
    pub command: String,
    pub requires_elevation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InspectPortResult {
    pub port: u16,
    pub sockets: Vec<PortSocket>,
    pub owners: Vec<ProcessOwner>,
    pub unresolved_socket_count: usize,
    pub inspection_commands: Vec<CommandSuggestion>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TerminationMode {
    Graceful,
    Force,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessRequest {
    pub pid: u32,
    pub port_context: u16,
    pub mode: TerminationMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SignalAttempted {
    Term,
    Kill,
    PlatformTerminate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminateProcessResult {
    pub pid: u32,
    pub signal_attempted: SignalAttempted,
    pub signal_sent: bool,
    pub still_running: bool,
    pub termination_commands: Vec<CommandSuggestion>,
}
