use super::contracts::{
    DropServerSnapshot, DropServerStartRequest, UploadEventPayload, EVENT_STOPPED_UNEXPECTEDLY,
    EVENT_UPLOAD_COMPLETED, EVENT_UPLOAD_FAILED, EVENT_UPLOAD_STARTED,
};
use super::http::DropServerEventListener;
use super::manager::DropServerManager;
use crate::error::AppCommandError;
use crate::foundation::network::{list_eligible_ipv4_interfaces, NetworkInterfaceDto};
use tauri::{AppHandle, Emitter, State};

pub struct TauriDropServerEventListener {
    app_handle: AppHandle,
}

impl TauriDropServerEventListener {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
}

impl DropServerEventListener for TauriDropServerEventListener {
    fn emit_upload_started(&self, payload: UploadEventPayload) {
        let _ = self.app_handle.emit(EVENT_UPLOAD_STARTED, payload);
    }

    fn emit_upload_completed(&self, payload: UploadEventPayload) {
        let _ = self.app_handle.emit(EVENT_UPLOAD_COMPLETED, payload);
    }

    fn emit_upload_failed(&self, payload: UploadEventPayload) {
        let _ = self.app_handle.emit(EVENT_UPLOAD_FAILED, payload);
    }

    fn emit_stopped_unexpectedly(&self) {
        let _ = self.app_handle.emit(EVENT_STOPPED_UNEXPECTEDLY, ());
    }
}

#[tauri::command]
pub async fn network_list_ipv4_interfaces() -> Result<Vec<NetworkInterfaceDto>, AppCommandError> {
    list_eligible_ipv4_interfaces().map_err(Into::into)
}

#[tauri::command]
pub async fn drop_server_start(
    manager: State<'_, DropServerManager>,
    request: DropServerStartRequest,
) -> Result<DropServerSnapshot, AppCommandError> {
    manager.start(request).await.map_err(Into::into)
}

#[tauri::command]
pub async fn drop_server_stop(
    manager: State<'_, DropServerManager>,
) -> Result<DropServerSnapshot, AppCommandError> {
    manager.stop().await.map_err(Into::into)
}

#[tauri::command]
pub async fn drop_server_status(
    manager: State<'_, DropServerManager>,
) -> Result<DropServerSnapshot, AppCommandError> {
    Ok(manager.status().await)
}
