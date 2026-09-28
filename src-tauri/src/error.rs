use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CommandErrorCode {
    InvalidRequest,
    InvalidPort,
    InvalidBindAddress,
    NetworkEnumerationFailed,
    DestinationNotFound,
    DestinationNotDirectory,
    DestinationNotWritable,
    ServerAlreadyRunning,
    ServerNotRunning,
    ServerTransitionInProgress,
    PortInUse,
    ServerBindFailed,
    ServerInternal,
    SocketTableUnavailable,
    ProcessLookupFailed,
    ProcessNotFound,
    ProtectedProcess,
    TerminationDenied,
    TerminationFailed,
    UnsupportedPlatform,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppCommandError {
    pub code: CommandErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<HashMap<String, serde_json::Value>>,
}

impl std::fmt::Display for AppCommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}: {}", self.code, self.message)
    }
}

impl std::error::Error for AppCommandError {}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Invalid port: {0}. Valid range is 1024..=65535")]
    InvalidPort(u16),

    #[error("Invalid bind address: {0}")]
    InvalidBindAddress(String),

    #[error("Network interface enumeration failed: {0}")]
    NetworkEnumerationFailed(String),

    #[error("Destination path does not exist: {0}")]
    DestinationNotFound(String),

    #[error("Destination path is not a directory: {0}")]
    DestinationNotDirectory(String),

    #[error("Destination directory is not writable: {0}")]
    DestinationNotWritable(String),

    #[error("Drop server is already running")]
    ServerAlreadyRunning,

    #[error("Drop server is not running")]
    ServerNotRunning,

    #[error("Server state transition in progress")]
    ServerTransitionInProgress,

    #[error("Port {0} is already in use")]
    PortInUse(u16),

    #[error("Failed to bind server to {0}:{1}: {2}")]
    ServerBindFailed(String, u16, String),

    #[error("Internal server error: {0}")]
    ServerInternal(String),

    #[error("Socket table unavailable: {0}")]
    SocketTableUnavailable(String),

    #[error("Process lookup failed: {0}")]
    ProcessLookupFailed(String),

    #[error("Process with PID {0} not found")]
    ProcessNotFound(u32),

    #[error("Cannot terminate protected process {0}: {1}")]
    ProtectedProcess(u32, String),

    #[error("Permission denied when terminating PID {0}: {1}")]
    TerminationDenied(u32, String),

    #[error("Failed to terminate PID {0}: {1}")]
    TerminationFailed(u32, String),

    #[error("Operation is not supported on this platform: {0}")]
    UnsupportedPlatform(String),
}

impl From<AppError> for AppCommandError {
    fn from(err: AppError) -> Self {
        let code = match &err {
            AppError::InvalidRequest(_) => CommandErrorCode::InvalidRequest,
            AppError::InvalidPort(_) => CommandErrorCode::InvalidPort,
            AppError::InvalidBindAddress(_) => CommandErrorCode::InvalidBindAddress,
            AppError::NetworkEnumerationFailed(_) => CommandErrorCode::NetworkEnumerationFailed,
            AppError::DestinationNotFound(_) => CommandErrorCode::DestinationNotFound,
            AppError::DestinationNotDirectory(_) => CommandErrorCode::DestinationNotDirectory,
            AppError::DestinationNotWritable(_) => CommandErrorCode::DestinationNotWritable,
            AppError::ServerAlreadyRunning => CommandErrorCode::ServerAlreadyRunning,
            AppError::ServerNotRunning => CommandErrorCode::ServerNotRunning,
            AppError::ServerTransitionInProgress => CommandErrorCode::ServerTransitionInProgress,
            AppError::PortInUse(_) => CommandErrorCode::PortInUse,
            AppError::ServerBindFailed(_, _, _) => CommandErrorCode::ServerBindFailed,
            AppError::ServerInternal(_) => CommandErrorCode::ServerInternal,
            AppError::SocketTableUnavailable(_) => CommandErrorCode::SocketTableUnavailable,
            AppError::ProcessLookupFailed(_) => CommandErrorCode::ProcessLookupFailed,
            AppError::ProcessNotFound(_) => CommandErrorCode::ProcessNotFound,
            AppError::ProtectedProcess(_, _) => CommandErrorCode::ProtectedProcess,
            AppError::TerminationDenied(_, _) => CommandErrorCode::TerminationDenied,
            AppError::TerminationFailed(_, _) => CommandErrorCode::TerminationFailed,
            AppError::UnsupportedPlatform(_) => CommandErrorCode::UnsupportedPlatform,
        };

        Self {
            code,
            message: err.to_string(),
            details: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_mapping_to_command_error() {
        let err = AppError::InvalidPort(80);
        let cmd_err: AppCommandError = err.into();
        assert_eq!(cmd_err.code, CommandErrorCode::InvalidPort);
        assert!(cmd_err.message.contains("80"));

        let err = AppError::ServerAlreadyRunning;
        let cmd_err: AppCommandError = err.into();
        assert_eq!(cmd_err.code, CommandErrorCode::ServerAlreadyRunning);

        let err = AppError::PortInUse(8090);
        let cmd_err: AppCommandError = err.into();
        assert_eq!(cmd_err.code, CommandErrorCode::PortInUse);
    }
}
