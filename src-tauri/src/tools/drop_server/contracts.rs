use serde::{Deserialize, Serialize};
use std::time::Duration;

pub const MAX_UPLOAD_REQUEST_BYTES: u64 = 2 * 1024 * 1024 * 1024; // 2 GiB
pub const MAX_FILES_PER_REQUEST: usize = 32;
pub const MAX_FILENAME_BYTES: usize = 240;
pub const RECENT_UPLOAD_CAPACITY: usize = 50;
pub const STOP_TIMEOUT: Duration = Duration::from_secs(2);
pub const COLLISION_ATTEMPTS_MAX: usize = 10_000;
pub const MIN_VALID_PORT: u16 = 1024;
pub const MAX_VALID_PORT: u16 = 65535;
pub const DEFAULT_FIXED_PORT: u16 = 8090;

pub const EVENT_UPLOAD_STARTED: &str = "drop-server://upload-started";
pub const EVENT_UPLOAD_COMPLETED: &str = "drop-server://upload-completed";
pub const EVENT_UPLOAD_FAILED: &str = "drop-server://upload-failed";
pub const EVENT_STOPPED_UNEXPECTEDLY: &str = "drop-server://stopped-unexpectedly";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum PortSelection {
    Fixed { port: u16 },
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DropServerStartRequest {
    pub destination_path: String,
    pub bind_address: String,
    pub port: PortSelection,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DropServerLifecycle {
    Stopped,
    Starting,
    Running,
    Stopping,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UploadOutcome {
    Completed,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadRecord {
    pub upload_id: u64,
    pub file_name: String,
    pub size_bytes: u64,
    pub received_at_epoch_ms: u64,
    pub outcome: UploadOutcome,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DropServerSnapshot {
    pub lifecycle: DropServerLifecycle,
    pub bind_address: Option<String>,
    pub port: Option<u16>,
    pub destination_path: Option<String>,
    pub started_at_epoch_ms: Option<u64>,
    pub recent_uploads: Vec<UploadRecord>,
}

impl DropServerSnapshot {
    pub fn stopped() -> Self {
        Self {
            lifecycle: DropServerLifecycle::Stopped,
            bind_address: None,
            port: None,
            destination_path: None,
            started_at_epoch_ms: None,
            recent_uploads: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadEventPayload {
    pub upload_id: u64,
    pub file_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    pub received_at_epoch_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_port_selection_serialization() {
        let fixed = PortSelection::Fixed { port: 8090 };
        let json = serde_json::to_string(&fixed).unwrap();
        assert_eq!(json, r#"{"mode":"fixed","port":8090}"#);

        let auto = PortSelection::Auto;
        let json = serde_json::to_string(&auto).unwrap();
        assert_eq!(json, r#"{"mode":"auto"}"#);
    }

    #[test]
    fn test_lifecycle_serialization() {
        assert_eq!(
            serde_json::to_string(&DropServerLifecycle::Stopped).unwrap(),
            "\"stopped\""
        );
        assert_eq!(
            serde_json::to_string(&DropServerLifecycle::Starting).unwrap(),
            "\"starting\""
        );
        assert_eq!(
            serde_json::to_string(&DropServerLifecycle::Running).unwrap(),
            "\"running\""
        );
        assert_eq!(
            serde_json::to_string(&DropServerLifecycle::Stopping).unwrap(),
            "\"stopping\""
        );
    }
}
