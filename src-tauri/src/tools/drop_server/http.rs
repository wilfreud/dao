use super::contracts::{
    UploadEventPayload, UploadOutcome, UploadRecord, MAX_FILES_PER_REQUEST,
    MAX_UPLOAD_REQUEST_BYTES, RECENT_UPLOAD_CAPACITY,
};
use super::filename::{resolve_collision_free_path, sanitize_basename};
use axum::{
    extract::{DefaultBodyLimit, Multipart, State},
    http::{header, HeaderValue, StatusCode},
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use std::{
    collections::VecDeque,
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::{io::AsyncWriteExt, sync::Mutex};
use tower_http::limit::RequestBodyLimitLayer;

pub trait DropServerEventListener: Send + Sync + 'static {
    fn emit_upload_started(&self, payload: UploadEventPayload);
    fn emit_upload_completed(&self, payload: UploadEventPayload);
    fn emit_upload_failed(&self, payload: UploadEventPayload);
    fn emit_stopped_unexpectedly(&self);
}

#[derive(Default)]
pub struct NoopEventListener;

impl DropServerEventListener for NoopEventListener {
    fn emit_upload_started(&self, _payload: UploadEventPayload) {}
    fn emit_upload_completed(&self, _payload: UploadEventPayload) {}
    fn emit_upload_failed(&self, _payload: UploadEventPayload) {}
    fn emit_stopped_unexpectedly(&self) {}
}

pub struct UploadContext {
    pub destination: PathBuf,
    pub listener: Arc<dyn DropServerEventListener>,
    pub next_upload_id: Arc<std::sync::atomic::AtomicU64>,
    pub recent_uploads: Arc<Mutex<VecDeque<UploadRecord>>>,
}

pub fn html_escape(input: &str) -> String {
    let mut escaped = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '&' => escaped.push_str("&amp;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            '"' => escaped.push_str("&quot;"),
            '\'' => escaped.push_str("&#39;"),
            _ => escaped.push(c),
        }
    }
    escaped
}

pub fn current_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// Minimal, clean, responsive upload page HTML
const UPLOAD_PAGE_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LAN Drop Upload</title>
  <style>
    :root {
      --bg: #0f1115;
      --surface: #16181d;
      --border: #292d38;
      --text: #f0f2f5;
      --muted: #8b949e;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2rem;
      max-width: 440px;
      width: 100%;
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: var(--muted); margin-bottom: 1.5rem; line-height: 1.4; }
    .file-input {
      display: block;
      width: 100%;
      padding: 0.75rem;
      border: 1px dashed var(--border);
      border-radius: 6px;
      margin-bottom: 1.5rem;
      color: var(--text);
      font-size: 0.875rem;
      background: rgba(255, 255, 255, 0.02);
    }
    .btn {
      display: block;
      width: 100%;
      background: var(--accent);
      color: #fff;
      font-weight: 500;
      border: none;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .btn:hover { background: var(--accent-hover); }
    .notice {
      margin-top: 1.25rem;
      font-size: 0.75rem;
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>File Upload</h1>
    <p>Select one or more files to send to this computer over the local network.</p>
    <form method="post" action="/upload" enctype="multipart/form-data">
      <input type="file" name="files" class="file-input" multiple required>
      <button type="submit" class="btn">Send Files</button>
    </form>
    <div class="notice">Files will be safely saved in the receiver's folder.</div>
  </div>
</body>
</html>"#;

async fn handle_get_index() -> impl IntoResponse {
    let mut response = Html(UPLOAD_PAGE_HTML).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("default-src 'none'; style-src 'unsafe-inline'"),
    );
    response
}

async fn handle_healthz() -> impl IntoResponse {
    (StatusCode::OK, [("content-type", "text/plain")], "ok")
}

async fn handle_not_found() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        [("content-type", "text/plain")],
        "Not Found",
    )
}

async fn handle_post_upload(
    State(ctx): State<Arc<UploadContext>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut received_files: Vec<(String, u64)> = Vec::new();
    let mut error_messages: Vec<String> = Vec::new();
    let mut file_count: usize = 0;

    while let Ok(Some(mut field)) = multipart.next_field().await {
        file_count += 1;
        if file_count > MAX_FILES_PER_REQUEST {
            error_messages.push(format!(
                "Exceeded maximum file limit of {} files per request",
                MAX_FILES_PER_REQUEST
            ));
            break;
        }

        // Validate field name
        let field_name = field.name().unwrap_or("").to_string();
        if field_name != "files" {
            error_messages.push(format!(
                "Unexpected form field '{}'; expected 'files'",
                html_escape(&field_name)
            ));
            continue;
        }

        let raw_file_name = match field.file_name() {
            Some(name) if !name.trim().is_empty() => name.to_string(),
            _ => {
                error_messages.push("A file was submitted without a filename".to_string());
                continue;
            }
        };

        let safe_file_name = match sanitize_basename(&raw_file_name) {
            Ok(name) => name,
            Err(e) => {
                error_messages.push(format!(
                    "Invalid filename '{}': {}",
                    html_escape(&raw_file_name),
                    e
                ));
                continue;
            }
        };

        let upload_id = ctx
            .next_upload_id
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let start_epoch = current_epoch_ms();

        ctx.listener.emit_upload_started(UploadEventPayload {
            upload_id,
            file_name: safe_file_name.clone(),
            size_bytes: None,
            received_at_epoch_ms: start_epoch,
            error_code: None,
        });

        // Create temporary file in same destination directory
        let temp_result = tempfile::Builder::new()
            .prefix(".drop-upload-")
            .tempfile_in(&ctx.destination);

        let temp_file = match temp_result {
            Ok(f) => f,
            Err(e) => {
                let err_msg = format!("Failed to create temporary file: {}", e);
                ctx.listener.emit_upload_failed(UploadEventPayload {
                    upload_id,
                    file_name: safe_file_name.clone(),
                    size_bytes: None,
                    received_at_epoch_ms: start_epoch,
                    error_code: Some("DESTINATION_NOT_WRITABLE".to_string()),
                });
                error_messages.push(err_msg);
                continue;
            }
        };

        // Open as async file for non-blocking streamed writes
        let async_file_result = match temp_file.as_file().try_clone() {
            Ok(std_file) => Ok(tokio::fs::File::from_std(std_file)),
            Err(e) => Err(format!("Failed to prepare file stream: {}", e)),
        };

        let mut async_file = match async_file_result {
            Ok(f) => f,
            Err(err_msg) => {
                ctx.listener.emit_upload_failed(UploadEventPayload {
                    upload_id,
                    file_name: safe_file_name.clone(),
                    size_bytes: None,
                    received_at_epoch_ms: start_epoch,
                    error_code: Some("SERVER_INTERNAL".to_string()),
                });
                error_messages.push(err_msg);
                continue;
            }
        };

        let mut total_bytes: u64 = 0;
        let mut read_failed = false;

        while let Ok(Some(chunk)) = field.chunk().await {
            total_bytes = match total_bytes.checked_add(chunk.len() as u64) {
                Some(b) => b,
                None => {
                    read_failed = true;
                    error_messages.push("File size integer overflow".to_string());
                    break;
                }
            };

            if let Err(e) = async_file.write_all(&chunk).await {
                read_failed = true;
                error_messages.push(format!("Disk write error: {}", e));
                break;
            }
        }

        if read_failed {
            // temp_file is dropped and automatically unlinked
            ctx.listener.emit_upload_failed(UploadEventPayload {
                upload_id,
                file_name: safe_file_name.clone(),
                size_bytes: Some(total_bytes),
                received_at_epoch_ms: start_epoch,
                error_code: Some("DISK_WRITE_FAILED".to_string()),
            });
            continue;
        }

        if let Err(e) = async_file.flush().await {
            error_messages.push(format!("Disk flush error: {}", e));
            ctx.listener.emit_upload_failed(UploadEventPayload {
                upload_id,
                file_name: safe_file_name.clone(),
                size_bytes: Some(total_bytes),
                received_at_epoch_ms: start_epoch,
                error_code: Some("DISK_FLUSH_FAILED".to_string()),
            });
            continue;
        }
        drop(async_file);

        // Resolve destination path with collision avoidance
        let target_path = match resolve_collision_free_path(&ctx.destination, &safe_file_name) {
            Ok(p) => p,
            Err(e) => {
                error_messages.push(format!("Path collision error: {}", e));
                ctx.listener.emit_upload_failed(UploadEventPayload {
                    upload_id,
                    file_name: safe_file_name.clone(),
                    size_bytes: Some(total_bytes),
                    received_at_epoch_ms: start_epoch,
                    error_code: Some("COLLISION_ERROR".to_string()),
                });
                continue;
            }
        };

        // Atomically persist temporary file to target path
        let final_filename = match target_path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => safe_file_name.clone(),
        };

        match temp_file.persist_noclobber(&target_path) {
            Ok(_) => {
                received_files.push((final_filename.clone(), total_bytes));

                let record = UploadRecord {
                    upload_id,
                    file_name: final_filename.clone(),
                    size_bytes: total_bytes,
                    received_at_epoch_ms: current_epoch_ms(),
                    outcome: UploadOutcome::Completed,
                    error_code: None,
                };

                // Add to recent uploads, maintaining capacity cap
                {
                    let mut recent = ctx.recent_uploads.lock().await;
                    recent.push_front(record);
                    while recent.len() > RECENT_UPLOAD_CAPACITY {
                        recent.pop_back();
                    }
                }

                ctx.listener.emit_upload_completed(UploadEventPayload {
                    upload_id,
                    file_name: final_filename,
                    size_bytes: Some(total_bytes),
                    received_at_epoch_ms: current_epoch_ms(),
                    error_code: None,
                });
            }
            Err(e) => {
                error_messages.push(format!("Failed to persist file: {}", e));
                ctx.listener.emit_upload_failed(UploadEventPayload {
                    upload_id,
                    file_name: safe_file_name,
                    size_bytes: Some(total_bytes),
                    received_at_epoch_ms: start_epoch,
                    error_code: Some("PERSIST_FAILED".to_string()),
                });
            }
        }
    }

    // Build human-readable response HTML
    let mut html = String::from(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Upload Results</title>
  <style>
    :root {
      --bg: #0f1115;
      --surface: #16181d;
      --border: #292d38;
      --text: #f0f2f5;
      --muted: #8b949e;
      --accent: #3b82f6;
      --success: #22c55e;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2rem;
      max-width: 480px;
      width: 100%;
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
    .success-item { color: var(--success); font-size: 0.875rem; margin-bottom: 0.5rem; word-break: break-all; }
    .error-item { color: var(--error); font-size: 0.875rem; margin-bottom: 0.5rem; }
    .btn {
      display: inline-block;
      margin-top: 1.5rem;
      background: var(--accent);
      color: #fff;
      text-decoration: none;
      padding: 0.6rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="card">
"#,
    );

    if !received_files.is_empty() {
        html.push_str("<h1>Files Received</h1>");
        for (name, size) in &received_files {
            html.push_str(&format!(
                "<div class=\"success-item\">&check; {} ({} bytes)</div>",
                html_escape(name),
                size
            ));
        }
    }

    if !error_messages.is_empty() {
        html.push_str("<h1>Errors</h1>");
        for msg in &error_messages {
            html.push_str(&format!(
                "<div class=\"error-item\">&cross; {}</div>",
                html_escape(msg)
            ));
        }
    }

    if received_files.is_empty() && error_messages.is_empty() {
        html.push_str("<h1>No Files Received</h1><p>No valid files were uploaded.</p>");
    }

    html.push_str(
        r#"<a href="/" class="btn">Send More Files</a>
  </div>
</body>
</html>"#,
    );

    let status = if !received_files.is_empty() {
        StatusCode::OK
    } else {
        StatusCode::BAD_REQUEST
    };

    (status, [("content-type", "text/html; charset=utf-8")], html)
}

pub fn create_drop_server_router(context: Arc<UploadContext>) -> Router {
    Router::new()
        .route("/", get(handle_get_index))
        .route("/healthz", get(handle_healthz))
        .route("/upload", post(handle_post_upload))
        .fallback(handle_not_found)
        .layer(DefaultBodyLimit::max(MAX_UPLOAD_REQUEST_BYTES as usize))
        .layer(RequestBodyLimitLayer::new(
            MAX_UPLOAD_REQUEST_BYTES as usize,
        ))
        .with_state(context)
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::multipart::{Form, Part};
    use tempfile::tempdir;
    use tokio::net::TcpListener;
    use tokio_util::sync::CancellationToken;

    fn build_test_context(dir: PathBuf) -> Arc<UploadContext> {
        Arc::new(UploadContext {
            destination: dir,
            listener: Arc::new(NoopEventListener),
            next_upload_id: Arc::new(std::sync::atomic::AtomicU64::new(1)),
            recent_uploads: Arc::new(Mutex::new(VecDeque::new())),
        })
    }

    #[tokio::test]
    async fn test_http_healthz_and_get_routes() {
        let dir = tempdir().unwrap();
        let ctx = build_test_context(dir.path().to_path_buf());
        let router = create_drop_server_router(ctx);

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();

        let cancel = CancellationToken::new();
        let cancel_clone = cancel.clone();

        let server_handle = tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    cancel_clone.cancelled().await;
                })
                .await
                .unwrap();
        });

        let client = reqwest::Client::new();

        // 1. Test /healthz
        let res = client
            .get(format!("http://127.0.0.1:{}/healthz", port))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(res.text().await.unwrap(), "ok");

        // 2. Test GET /
        let res = client
            .get(format!("http://127.0.0.1:{}/", port))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = res.text().await.unwrap();
        assert!(body.contains("File Upload"));
        assert!(body.contains("action=\"/upload\""));

        // 3. Test 404 fallback
        let res = client
            .get(format!("http://127.0.0.1:{}/random-route", port))
            .send()
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);

        cancel.cancel();
        server_handle.await.unwrap();
    }

    #[tokio::test]
    async fn test_http_multipart_upload_persisted() {
        let dir = tempdir().unwrap();
        let ctx = build_test_context(dir.path().to_path_buf());
        let recent = ctx.recent_uploads.clone();
        let router = create_drop_server_router(ctx);

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();

        let cancel = CancellationToken::new();
        let cancel_clone = cancel.clone();

        let server_handle = tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    cancel_clone.cancelled().await;
                })
                .await
                .unwrap();
        });

        let client = reqwest::Client::new();

        let file_part = Part::bytes(b"hello world test content".to_vec())
            .file_name("notes.txt")
            .mime_str("text/plain")
            .unwrap();

        let form = Form::new().part("files", file_part);

        let res = client
            .post(format!("http://127.0.0.1:{}/upload", port))
            .multipart(form)
            .send()
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::OK);

        // Verify file persisted on disk
        let saved_file = dir.path().join("notes.txt");
        assert!(saved_file.exists());
        let content = std::fs::read_to_string(&saved_file).unwrap();
        assert_eq!(content, "hello world test content");

        // Verify recent uploads recorded
        let recent_records = recent.lock().await;
        assert_eq!(recent_records.len(), 1);
        assert_eq!(recent_records[0].file_name, "notes.txt");
        assert_eq!(recent_records[0].size_bytes, 24);

        cancel.cancel();
        server_handle.await.unwrap();
    }

    #[tokio::test]
    async fn test_http_multipart_collision_handling() {
        let dir = tempdir().unwrap();
        let ctx = build_test_context(dir.path().to_path_buf());
        let router = create_drop_server_router(ctx);

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();

        let cancel = CancellationToken::new();
        let cancel_clone = cancel.clone();

        let server_handle = tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    cancel_clone.cancelled().await;
                })
                .await
                .unwrap();
        });

        // Pre-create file to force collision
        std::fs::write(dir.path().join("doc.pdf"), b"existing file").unwrap();

        let client = reqwest::Client::new();
        let file_part = Part::bytes(b"new incoming file".to_vec())
            .file_name("doc.pdf")
            .mime_str("application/pdf")
            .unwrap();

        let form = Form::new().part("files", file_part);

        let res = client
            .post(format!("http://127.0.0.1:{}/upload", port))
            .multipart(form)
            .send()
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::OK);

        // Verify original file intact
        assert_eq!(
            std::fs::read_to_string(dir.path().join("doc.pdf")).unwrap(),
            "existing file"
        );

        // Verify new file saved as collision name
        let collision_file = dir.path().join("doc (1).pdf");
        assert!(collision_file.exists());
        assert_eq!(
            std::fs::read_to_string(collision_file).unwrap(),
            "new incoming file"
        );

        cancel.cancel();
        server_handle.await.unwrap();
    }
}
