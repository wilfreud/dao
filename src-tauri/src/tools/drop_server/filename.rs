use super::contracts::{COLLISION_ATTEMPTS_MAX, MAX_FILENAME_BYTES};
use crate::error::AppError;
use std::path::{Path, PathBuf};

/// Sanitizes a raw client-supplied filename into a safe basename.
/// - Strips directory traversal (/ and \)
/// - Sanitizes illegal filesystem characters via sanitize_filename
/// - Rejects empty, whitespace, and "." / ".."
/// - Enforces MAX_FILENAME_BYTES (preserving extension and valid UTF-8 boundaries)
pub fn sanitize_basename(raw_filename: &str) -> Result<String, AppError> {
    // 1. Extract basename (handle both UNIX and Windows path separators)
    let normalized = raw_filename.replace('\\', "/");
    let base = normalized.rsplit('/').next().unwrap_or("").trim();

    // 2. Separate extension before sanitization so long stems don't push the extension off
    let (stem, ext) = match base.rfind('.') {
        Some(dot_idx) if dot_idx > 0 => {
            let (s, e) = base.split_at(dot_idx);
            (s, e)
        }
        _ => (base, ""),
    };

    let sanitized_stem = sanitize_filename::sanitize_with_options(
        stem,
        sanitize_filename::Options {
            truncate: false,
            ..Default::default()
        },
    );
    let sanitized_ext = sanitize_filename::sanitize_with_options(
        ext,
        sanitize_filename::Options {
            truncate: false,
            ..Default::default()
        },
    );

    let trimmed_stem = sanitized_stem.trim_matches(|c: char| c.is_whitespace() || c == '.');
    let trimmed_ext = sanitized_ext.trim_matches(|c: char| c.is_whitespace());

    if trimmed_stem.is_empty() && trimmed_ext.is_empty() {
        return Err(AppError::InvalidRequest(
            "Uploaded file has an empty or invalid filename".to_string(),
        ));
    }

    let allowed_stem_bytes = MAX_FILENAME_BYTES.saturating_sub(trimmed_ext.len());
    if allowed_stem_bytes == 0 {
        return Err(AppError::InvalidRequest(
            "Filename extension exceeds maximum allowable length".to_string(),
        ));
    }

    // Find the largest valid UTF-8 char boundary in stem <= allowed_stem_bytes
    let mut truncated_stem_len = allowed_stem_bytes.min(trimmed_stem.len());
    while !trimmed_stem.is_char_boundary(truncated_stem_len) {
        truncated_stem_len = truncated_stem_len.saturating_sub(1);
    }

    let final_stem = trimmed_stem[..truncated_stem_len].trim_end();
    if final_stem.is_empty() {
        return Err(AppError::InvalidRequest(
            "Filename stem is empty after truncation".to_string(),
        ));
    }

    Ok(format!("{}{}", final_stem, trimmed_ext))
}

/// Resolves a collision-safe destination path that will not overwrite existing files.
/// Format for collisions: `photo (1).jpg`, `photo (2).jpg`
pub fn resolve_collision_free_path(
    destination_dir: &Path,
    file_name: &str,
) -> Result<PathBuf, AppError> {
    let initial_path = destination_dir.join(file_name);
    if !initial_path.exists() {
        return Ok(initial_path);
    }

    let (stem, ext) = match file_name.rfind('.') {
        Some(dot_idx) if dot_idx > 0 => (&file_name[..dot_idx], &file_name[dot_idx..]),
        _ => (file_name, ""),
    };

    for i in 1..=COLLISION_ATTEMPTS_MAX {
        let candidate_name = format!("{} ({}){}", stem, i, ext);
        let candidate_path = destination_dir.join(&candidate_name);
        if !candidate_path.exists() {
            return Ok(candidate_path);
        }
    }

    Err(AppError::ServerInternal(format!(
        "Exceeded maximum collision resolution attempts ({}) for file: {}",
        COLLISION_ATTEMPTS_MAX, file_name
    )))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_sanitize_basename_traversal() {
        assert_eq!(sanitize_basename("../../test.png").unwrap(), "test.png");
        assert_eq!(sanitize_basename("..\\..\\test.png").unwrap(), "test.png");
        assert_eq!(
            sanitize_basename("C:\\Users\\admin\\secret.txt").unwrap(),
            "secret.txt"
        );
        assert_eq!(sanitize_basename("/var/log/syslog").unwrap(), "syslog");
    }

    #[test]
    fn test_sanitize_basename_illegal_chars() {
        assert_eq!(
            sanitize_basename("hello:world?.jpg").unwrap(),
            "helloworld.jpg"
        );
        assert_eq!(sanitize_basename("my*file<1>.txt").unwrap(), "myfile1.txt");
    }

    #[test]
    fn test_sanitize_basename_empty_rejected() {
        assert!(sanitize_basename("").is_err());
        assert!(sanitize_basename("   ").is_err());
        assert!(sanitize_basename(".").is_err());
        assert!(sanitize_basename("..").is_err());
        assert!(sanitize_basename("...").is_err());
        assert!(sanitize_basename("/").is_err());
    }

    #[test]
    fn test_sanitize_basename_length_capping() {
        let long_name = format!("{}.txt", "a".repeat(300));
        let sanitized = sanitize_basename(&long_name).unwrap();
        assert!(sanitized.len() <= MAX_FILENAME_BYTES);
        assert!(sanitized.ends_with(".txt"));
        assert!(sanitized.starts_with("aaaa"));
    }

    #[test]
    fn test_resolve_collision_free_path() {
        let dir = tempdir().unwrap();
        let path1 = resolve_collision_free_path(dir.path(), "test.txt").unwrap();
        assert_eq!(path1, dir.path().join("test.txt"));

        // Create the file so next call collides
        std::fs::write(&path1, b"hello").unwrap();

        let path2 = resolve_collision_free_path(dir.path(), "test.txt").unwrap();
        assert_eq!(path2, dir.path().join("test (1).txt"));

        std::fs::write(&path2, b"hello").unwrap();

        let path3 = resolve_collision_free_path(dir.path(), "test.txt").unwrap();
        assert_eq!(path3, dir.path().join("test (2).txt"));
    }

    #[test]
    fn test_resolve_collision_free_path_no_ext() {
        let dir = tempdir().unwrap();
        let path1 = resolve_collision_free_path(dir.path(), "LICENSE").unwrap();
        assert_eq!(path1, dir.path().join("LICENSE"));

        std::fs::write(&path1, b"content").unwrap();

        let path2 = resolve_collision_free_path(dir.path(), "LICENSE").unwrap();
        assert_eq!(path2, dir.path().join("LICENSE (1)"));
    }
}
