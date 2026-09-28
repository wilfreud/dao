use super::contracts::{InspectPortResult, TerminateProcessRequest, TerminateProcessResult};
use super::inspect::inspect_port_sync;
use super::process::terminate_process_sync;
use crate::error::AppCommandError;

#[tauri::command]
pub async fn inspect_port(port: u16) -> Result<InspectPortResult, AppCommandError> {
    tokio::task::spawn_blocking(move || inspect_port_sync(port))
        .await
        .map_err(|e| crate::error::AppError::ServerInternal(e.to_string()))?
        .map_err(Into::into)
}

#[tauri::command]
pub async fn terminate_port_process(
    request: TerminateProcessRequest,
) -> Result<TerminateProcessResult, AppCommandError> {
    tokio::task::spawn_blocking(move || terminate_process_sync(request))
        .await
        .map_err(|e| crate::error::AppError::ServerInternal(e.to_string()))?
        .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    #[test]
    fn test_inspect_port_ephemeral_listener() {
        // Bind an ephemeral TCP listener on 127.0.0.1:0
        let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind ephemeral listener");
        let local_port = listener.local_addr().unwrap().port();

        // Inspect that port
        let result = inspect_port_sync(local_port).expect("Inspection should succeed");
        assert_eq!(result.port, local_port);
        assert!(!result.sockets.is_empty(), "Should find at least 1 socket");

        let socket = result
            .sockets
            .iter()
            .find(|s| s.local_port == local_port)
            .expect("Should contain the matching socket");

        assert_eq!(socket.tcp_state.as_deref(), Some("LISTEN"));

        // If platform exposed PID, check that current pid is present
        let current_pid = std::process::id();
        if !socket.associated_pids.is_empty() {
            assert!(
                socket.associated_pids.contains(&current_pid),
                "Socket associated PIDs should contain current test process PID"
            );
        }
    }

    #[test]
    fn test_inspect_port_zero_rejected() {
        let err = inspect_port_sync(0);
        assert!(err.is_err());
    }
}
