use std::process::Command;
use serde_json::Value;
use crate::system::utils::{
    NoWindow, bin_ffmpeg, bin_ffprobe, expand_tilde
};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct LocalTrack {
    title: String,
    path: String,
    size_bytes: u64,
    extension: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct AudioMetadata {
    title: String,
    artist: String,
    album: String,
    duration: String,
    has_cover: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct DiskInfo {
    used_bytes: u64,
    track_count: usize,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct TrackExport {
    title: String,
    artist: String,
    url: String,
    duration_secs: i64,
}

#[tauri::command]
pub async fn scan_downloads(path: String) -> Result<Vec<LocalTrack>, String> {
    tokio::task::spawn_blocking(move || {
        let resolved   = expand_tilde(&path);
        let extensions = ["mp3", "flac", "wav", "ogg", "m4a", "aac", "opus", "wma"];
        let mut tracks: Vec<LocalTrack> = Vec::new();
        let dir = std::fs::read_dir(&resolved)
            .map_err(|e| format!("Cannot read directory: {}", e))?;
        for entry in dir.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                    if extensions.contains(&ext.to_lowercase().as_str()) {
                        tracks.push(LocalTrack {
                            title:      p.file_stem().and_then(|s| s.to_str()).unwrap_or("Unknown").to_string(),
                            path:       p.to_string_lossy().to_string(),
                            size_bytes: entry.metadata().map(|m| m.len()).unwrap_or(0),
                            extension:  ext.to_lowercase(),
                        });
                    }
                }
            }
        }
        tracks.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        Ok(tracks)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_local_file(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        std::fs::remove_file(&path).map_err(|e| format!("Delete failed: {}", e))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn rename_local_file(old_path: String, new_title: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let old    = std::path::Path::new(&old_path);
        let parent = old.parent().ok_or("No parent directory")?;
        let ext    = old.extension().and_then(|e| e.to_str()).unwrap_or("mp3");
        let safe_title: String = new_title.chars()
            .map(|c| if "/\\:*?\"<>|".contains(c) { '_' } else { c })
            .collect();
        let mut new_path = parent.join(format!("{}.{}", safe_title, ext));
        let mut counter = 1;
        while new_path.exists() {
            if let (Ok(new_canon), Ok(old_canon)) = (new_path.canonicalize(), old.canonicalize()) {
                if new_canon == old_canon {
                    break;
                }
            }
            new_path = parent.join(format!("{} ({}).{}", safe_title, counter, ext));
            counter += 1;
        }
        std::fs::rename(&old_path, &new_path).map_err(|e| format!("Rename failed: {}", e))?;
        Ok(new_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_in_file_manager(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let p   = std::path::Path::new(&path);
        let dir = if p.is_file() {
            p.parent().map(|d| d.to_string_lossy().to_string()).unwrap_or(path)
        } else { path };
        #[cfg(target_os = "macos")]
        { Command::new("open").arg(&dir).no_window().spawn().map_err(|e| format!("open failed: {}", e))?; }
        #[cfg(target_os = "windows")]
        { Command::new("explorer.exe").arg(&dir).no_window().spawn().map_err(|e| format!("explorer failed: {}", e))?; }
        #[cfg(target_os = "linux")]
        { Command::new("xdg-open").arg(&dir).no_window().spawn().map_err(|e| format!("xdg-open failed: {}", e))?; }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_audio_metadata(path: String) -> Result<AudioMetadata, String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new(bin_ffprobe())
            .args(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", &path])
            .no_window()
            .output()
            .map_err(|_| "ffprobe not found — install ffmpeg".to_string())?;
        let json: Value = serde_json::from_str(
            &String::from_utf8_lossy(&output.stdout)
        ).unwrap_or(Value::Null);
        let tags = &json["format"]["tags"];
        let duration_secs = json["format"]["duration"]
            .as_str().and_then(|d| d.parse::<f64>().ok()).unwrap_or(0.0);
        let mins = (duration_secs as u64) / 60;
        let secs = (duration_secs as u64) % 60;
        let has_cover = json["streams"].as_array()
            .map(|streams| {
                streams.iter().any(|s| {
                    s["disposition"]["attached_pic"].as_i64() == Some(1)
                        || s["disposition"]["attached_pic"].as_str() == Some("1")
                })
            })
            .unwrap_or(false);
        Ok(AudioMetadata {
            title:    tags["title"].as_str().or_else(|| tags["TITLE"].as_str()).unwrap_or("").to_string(),
            artist:   tags["artist"].as_str().or_else(|| tags["ARTIST"].as_str())
                          .or_else(|| tags["album_artist"].as_str()).unwrap_or("").to_string(),
            album:    tags["album"].as_str().or_else(|| tags["ALBUM"].as_str()).unwrap_or("").to_string(),
            duration: format!("{}:{:02}", mins, secs),
            has_cover,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_audio_cover(path: String) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new(bin_ffmpeg())
            .args(["-i", &path, "-an", "-vcodec", "copy", "-f", "image2pipe", "-"])
            .no_window()
            .output();

        match output {
            Ok(out) => {
                if out.status.success() && !out.stdout.is_empty() {
                    let bytes = out.stdout;
                    let mime = if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
                        "image/jpeg"
                    } else if bytes.starts_with(&[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) {
                        "image/png"
                    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
                        "image/webp"
                    } else {
                        "image/jpeg" 
                    };

                    let b64 = base64_encode(&bytes);
                    Ok(Some(format!("data:{};base64,{}", mime, b64)))
                } else {
                    Ok(None)
                }
            }
            Err(e) => Err(e.to_string()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn write_audio_metadata(path: String, title: String, artist: String, album: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ext = std::path::Path::new(&path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("mp3");
        let temp_path = format!("{}.tmp.edit.{}", path, ext);
        
        let status = Command::new(bin_ffmpeg())
            .args([
                "-y",
                "-i", &path,
                "-metadata", &format!("title={}", title),
                "-metadata", &format!("artist={}", artist),
                "-metadata", &format!("album={}", album),
                "-codec", "copy",
                &temp_path
            ])
            .no_window()
            .status()
            .map_err(|e| format!("ffmpeg execution failed: {}", e))?;
            
        if !status.success() {
            let _ = std::fs::remove_file(&temp_path);
            return Err("ffmpeg failed to write metadata".to_string());
        }
        
        std::fs::rename(&temp_path, &path)
            .map_err(|e| format!("Failed to replace audio file: {}", e))?;
            
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn base64_encode(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        match chunk.len() {
            3 => {
                let n = ((chunk[0] as u32) << 16) | ((chunk[1] as u32) << 8) | (chunk[2] as u32);
                result.push(CHARSET[((n >> 18) & 63) as usize] as char);
                result.push(CHARSET[((n >> 12) & 63) as usize] as char);
                result.push(CHARSET[((n >> 6) & 63) as usize] as char);
                result.push(CHARSET[(n & 63) as usize] as char);
            }
            2 => {
                let n = ((chunk[0] as u32) << 8) | (chunk[1] as u32);
                result.push(CHARSET[((n >> 10) & 63) as usize] as char);
                result.push(CHARSET[((n >> 4) & 63) as usize] as char);
                result.push(CHARSET[((n << 2) & 63) as usize] as char);
                result.push('=');
            }
            1 => {
                let n = chunk[0] as u32;
                result.push(CHARSET[((n >> 2) & 63) as usize] as char);
                result.push(CHARSET[((n << 4) & 63) as usize] as char);
                result.push('=');
                result.push('=');
            }
            _ => unreachable!(),
        }
    }
    result
}

#[tauri::command]
pub async fn get_waveform_thumbnail(path: String) -> Result<Vec<f32>, String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new(bin_ffmpeg())
            .args(["-i", &path, "-ac", "1", "-ar", "500", "-f", "f32le", "-"])
            .no_window()
            .output()
            .map_err(|_| "ffmpeg not found".to_string())?;
        if output.stdout.is_empty() { return Err("No audio data".to_string()); }
        let samples: Vec<f32> = output.stdout.chunks_exact(4)
            .map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]).abs())
            .collect();
        let target = 200usize;
        let chunk_size = (samples.len() / target).max(1);
        let envelope: Vec<f32> = samples.chunks(chunk_size).take(target)
            .map(|chunk| {
                (chunk.iter().map(|&x| x * x).sum::<f32>() / chunk.len() as f32).sqrt()
            })
            .collect();
        Ok(envelope)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_disk_usage(path: String) -> Result<DiskInfo, String> {
    tokio::task::spawn_blocking(move || {
        let resolved   = expand_tilde(&path);
        let extensions = ["mp3", "flac", "wav", "ogg", "m4a", "aac", "opus", "wma"];
        let dir = std::fs::read_dir(&resolved)
            .map_err(|e| format!("Cannot read directory: {}", e))?;
        let mut used_bytes  = 0u64;
        let mut track_count = 0usize;
        for entry in dir.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                    if extensions.contains(&ext.to_lowercase().as_str()) {
                        used_bytes += entry.metadata().map(|m| m.len()).unwrap_or(0);
                        track_count += 1;
                    }
                }
            }
        }
        Ok(DiskInfo { used_bytes, track_count })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn export_playlist_m3u(tracks: Vec<TrackExport>, path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let resolved = expand_tilde(&path);
        let mut content = String::from("#EXTM3U\n");
        for t in &tracks {
            content.push_str(&format!("#EXTINF:{},{} - {}\n{}\n",
                t.duration_secs, t.artist, t.title, t.url));
        }
        std::fs::write(&resolved, content).map_err(|e| format!("Write failed: {}", e))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn import_playlist_m3u(path: String) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        let resolved = expand_tilde(&path);
        let content = std::fs::read_to_string(&resolved)
            .map_err(|e| format!("Read failed: {}", e))?;
        let urls: Vec<String> = content.lines()
            .filter(|l| !l.starts_with('#') && !l.trim().is_empty())
            .map(|l| l.trim().to_string())
            .collect();
        Ok(urls)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn normalize_file(path: String, output_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let resolved_in  = expand_tilde(&path);
        let resolved_out = expand_tilde(&output_path);
        let out = Command::new(bin_ffmpeg())
            .args(["-i", &resolved_in, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                   "-ar", "44100", "-y", &resolved_out])
            .no_window()
            .output()
            .map_err(|_| "ffmpeg not found".to_string())?;
        if out.status.success() { Ok(()) }
        else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
    })
    .await
    .map_err(|e| e.to_string())?
}
