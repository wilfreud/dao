use super::contracts::{
    DropServerLifecycle, DropServerSnapshot, DropServerStartRequest, PortSelection, UploadRecord,
    MAX_VALID_PORT, MIN_VALID_PORT, STOP_TIMEOUT,
};
use super::http::{
    create_drop_server_router, current_epoch_ms, DropServerEventListener, NoopEventListener,
    UploadContext,
};
use crate::error::AppError;
use crate::foundation::network::list_eligible_ipv4_interfaces;
use std::{
    collections::VecDeque,
    net::{Ipv4Addr, SocketAddrV4},
    path::PathBuf,
    sync::{atomic::AtomicU64, Arc},
};
use tokio::{net::TcpListener, sync::Mutex, task::JoinHandle, time::timeout};
use tokio_util::sync::CancellationToken;

struct ServerRuntime {
    bind_address: Ipv4Addr,
    port: u16,
    destination: PathBuf,
    started_at_epoch_ms: u64,
    cancellation: CancellationToken,
    task: JoinHandle<()>,
}

struct DropServerState {
    lifecycle: DropServerLifecycle,
    runtime: Option<ServerRuntime>,
    recent_uploads: Arc<Mutex<VecDeque<UploadRecord>>>,
    next_upload_id: Arc<AtomicU64>,
}

#[derive(Clone)]
pub struct DropServerManager {
    inner: Arc<Mutex<DropServerState>>,
    event_listener: Arc<dyn DropServerEventListener>,
}

impl DropServerManager {
    pub fn new(event_listener: Arc<dyn DropServerEventListener>) -> Self {
        Self {
            inner: Arc::new(Mutex::new(DropServerState {
                lifecycle: DropServerLifecycle::Stopped,
                runtime: None,
                recent_uploads: Arc::new(Mutex::new(VecDeque::new())),
                next_upload_id: Arc::new(AtomicU64::new(1)),
            })),
            event_listener,
        }
    }

    pub fn with_noop_events() -> Self {
        Self::new(Arc::new(NoopEventListener))
    }

    pub async fn status(&self) -> DropServerSnapshot {
        let state = self.inner.lock().await;
        let recent = state.recent_uploads.lock().await.clone().into();

        match &state.runtime {
            Some(rt) => DropServerSnapshot {
                lifecycle: state.lifecycle,
                bind_address: Some(rt.bind_address.to_string()),
                port: Some(rt.port),
                destination_path: Some(rt.destination.to_string_lossy().to_string()),
                started_at_epoch_ms: Some(rt.started_at_epoch_ms),
                recent_uploads: recent,
            },
            None => DropServerSnapshot {
                lifecycle: state.lifecycle,
                bind_address: None,
                port: None,
                destination_path: None,
                started_at_epoch_ms: None,
                recent_uploads: recent,
            },
        }
    }

    pub async fn start(
        &self,
        request: DropServerStartRequest,
    ) -> Result<DropServerSnapshot, AppError> {
        // 1. Validate fixed port if requested
        if let PortSelection::Fixed { port } = request.port {
            if !(MIN_VALID_PORT..=MAX_VALID_PORT).contains(&port) {
                return Err(AppError::InvalidPort(port));
            }
        }

        // 2. Parse IPv4 address
        let bind_ip: Ipv4Addr = request
            .bind_address
            .parse()
            .map_err(|_| AppError::InvalidBindAddress(request.bind_address.clone()))?;

        // 3. Acquire lock and check lifecycle state
        let (recent_uploads_ref, next_upload_id_ref) = {
            let mut state = self.inner.lock().await;
            match state.lifecycle {
                DropServerLifecycle::Starting | DropServerLifecycle::Stopping => {
                    return Err(AppError::ServerTransitionInProgress);
                }
                DropServerLifecycle::Running => {
                    return Err(AppError::ServerAlreadyRunning);
                }
                DropServerLifecycle::Stopped => {
                    state.lifecycle = DropServerLifecycle::Starting;
                }
            }
            (state.recent_uploads.clone(), state.next_upload_id.clone())
        };

        // Helper to reset lifecycle to Stopped on start failure
        let reset_stopped = || async {
            let mut state = self.inner.lock().await;
            state.lifecycle = DropServerLifecycle::Stopped;
        };

        // 4. Validate that bind_ip is currently assigned and eligible
        let eligible = match list_eligible_ipv4_interfaces() {
            Ok(list) => list,
            Err(e) => {
                reset_stopped().await;
                return Err(e);
            }
        };

        let is_eligible = eligible
            .iter()
            .any(|iface| iface.address == request.bind_address);
        if !is_eligible {
            reset_stopped().await;
            return Err(AppError::InvalidBindAddress(format!(
                "Address {} is not an eligible local IPv4 interface",
                request.bind_address
            )));
        }

        // 5. Validate destination directory
        let dest_path = PathBuf::from(&request.destination_path);
        if !dest_path.exists() {
            reset_stopped().await;
            return Err(AppError::DestinationNotFound(request.destination_path));
        }
        if !dest_path.is_dir() {
            reset_stopped().await;
            return Err(AppError::DestinationNotDirectory(request.destination_path));
        }

        // Probe writability using temporary file
        match tempfile::Builder::new()
            .prefix(".probe-")
            .tempfile_in(&dest_path)
        {
            Ok(_) => {}
            Err(e) => {
                reset_stopped().await;
                return Err(AppError::DestinationNotWritable(format!(
                    "Cannot write to destination {}: {}",
                    request.destination_path, e
                )));
            }
        }

        // 6. Bind listener
        let requested_port = match request.port {
            PortSelection::Fixed { port } => port,
            PortSelection::Auto => 0,
        };

        let socket_addr = SocketAddrV4::new(bind_ip, requested_port);
        let listener = match TcpListener::bind(socket_addr).await {
            Ok(l) => l,
            Err(e) => {
                reset_stopped().await;
                if e.kind() == std::io::ErrorKind::AddrInUse {
                    return Err(AppError::PortInUse(requested_port));
                }
                return Err(AppError::ServerBindFailed(
                    request.bind_address,
                    requested_port,
                    e.to_string(),
                ));
            }
        };

        let actual_port = match listener.local_addr() {
            Ok(addr) => addr.port(),
            Err(e) => {
                reset_stopped().await;
                return Err(AppError::ServerInternal(format!(
                    "Failed to read bound socket port: {}",
                    e
                )));
            }
        };

        // 7. Prepare router and cancellation
        let upload_ctx = Arc::new(UploadContext {
            destination: dest_path.clone(),
            listener: self.event_listener.clone(),
            next_upload_id: next_upload_id_ref,
            recent_uploads: recent_uploads_ref.clone(),
        });

        let router = create_drop_server_router(upload_ctx);
        let cancel_token = CancellationToken::new();
        let cancel_clone = cancel_token.clone();
        let listener_event = self.event_listener.clone();

        let task = tokio::spawn(async move {
            let res = axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    cancel_clone.cancelled().await;
                })
                .await;

            if let Err(_e) = res {
                listener_event.emit_stopped_unexpectedly();
            }
        });

        let started_at_epoch_ms = current_epoch_ms();

        // 8. Reacquire lock and update state to Running
        let mut state = self.inner.lock().await;
        state.lifecycle = DropServerLifecycle::Running;
        state.runtime = Some(ServerRuntime {
            bind_address: bind_ip,
            port: actual_port,
            destination: dest_path.clone(),
            started_at_epoch_ms,
            cancellation: cancel_token,
            task,
        });

        let recent = state.recent_uploads.lock().await.clone().into();

        Ok(DropServerSnapshot {
            lifecycle: DropServerLifecycle::Running,
            bind_address: Some(bind_ip.to_string()),
            port: Some(actual_port),
            destination_path: Some(dest_path.to_string_lossy().to_string()),
            started_at_epoch_ms: Some(started_at_epoch_ms),
            recent_uploads: recent,
        })
    }

    pub async fn stop(&self) -> Result<DropServerSnapshot, AppError> {
        // 1. Acquire lock and take runtime
        let runtime = {
            let mut state = self.inner.lock().await;
            match state.lifecycle {
                DropServerLifecycle::Starting | DropServerLifecycle::Stopping => {
                    return Err(AppError::ServerTransitionInProgress);
                }
                DropServerLifecycle::Stopped => {
                    return Err(AppError::ServerNotRunning);
                }
                DropServerLifecycle::Running => {
                    state.lifecycle = DropServerLifecycle::Stopping;
                    match state.runtime.take() {
                        Some(rt) => rt,
                        None => {
                            state.lifecycle = DropServerLifecycle::Stopped;
                            return Err(AppError::ServerNotRunning);
                        }
                    }
                }
            }
        };

        // 2. Trigger cancellation and await server shutdown with timeout
        runtime.cancellation.cancel();

        let _ = match timeout(STOP_TIMEOUT, runtime.task).await {
            Ok(join_res) => join_res,
            Err(_) => {
                // Timeout elapsed, proceed with force shutdown
                Ok(())
            }
        };

        // 3. Reacquire lock and mark Stopped
        let mut state = self.inner.lock().await;
        state.lifecycle = DropServerLifecycle::Stopped;
        state.runtime = None;

        let recent = state.recent_uploads.lock().await.clone().into();

        Ok(DropServerSnapshot {
            lifecycle: DropServerLifecycle::Stopped,
            bind_address: None,
            port: None,
            destination_path: None,
            started_at_epoch_ms: None,
            recent_uploads: recent,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_manager_lifecycle_transitions() {
        let manager = DropServerManager::with_noop_events();
        let initial = manager.status().await;
        assert_eq!(initial.lifecycle, DropServerLifecycle::Stopped);

        // Attempting to stop while stopped returns ServerNotRunning
        let stop_err = manager.stop().await;
        assert!(matches!(stop_err, Err(AppError::ServerNotRunning)));

        // Invalid port rejected
        let invalid_port_req = DropServerStartRequest {
            destination_path: "/tmp".to_string(),
            bind_address: "127.0.0.1".to_string(),
            port: PortSelection::Fixed { port: 80 }, // Privileged < 1024
        };
        assert!(matches!(
            manager.start(invalid_port_req).await,
            Err(AppError::InvalidPort(80))
        ));

        // Non-existent directory rejected
        let bad_dir_req = DropServerStartRequest {
            destination_path: "/nonexistent/directory/xyz".to_string(),
            bind_address: "127.0.0.1".to_string(),
            port: PortSelection::Fixed { port: 8090 },
        };
        assert!(manager.start(bad_dir_req).await.is_err());
    }
}
