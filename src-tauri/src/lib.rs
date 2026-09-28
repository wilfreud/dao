pub mod error;
pub mod foundation;
pub mod tools;

use std::sync::Arc;
use tauri::Manager;
use tools::drop_server::{
    commands::{
        drop_server_start, drop_server_status, drop_server_stop, network_list_ipv4_interfaces,
        TauriDropServerEventListener,
    },
    manager::DropServerManager,
};
use tools::port_inspector::commands::{inspect_port, terminate_port_process};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let listener = Arc::new(TauriDropServerEventListener::new(app.handle().clone()));
            let manager = DropServerManager::new(listener);
            app.manage(manager);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            network_list_ipv4_interfaces,
            drop_server_start,
            drop_server_stop,
            drop_server_status,
            inspect_port,
            terminate_port_process,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
