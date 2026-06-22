use std::process::Command;
use std::sync::{Arc, OnceLock};

use crate::system::utils::{
    NoWindow, bin_ytdlp, expand_tilde
};
use crate::services::mpv_player::{
    extract_stream_url_async, PREFETCH_CACHE, CacheEntry
};
use tauri::Emitter;

static PREFETCH_SEMAPHORE: OnceLock<tokio::sync::Semaphore> = OnceLock::new();
fn prefetch_semaphore() -> &'static tokio::sync::Semaphore {
    PREFETCH_SEMAPHORE.get_or_init(|| tokio::sync::Semaphore::new(1))
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BatchProgress {
    index: usize,
    total: usize,
    title: String,
    success: bool,
    error: Option<String>,
}

#[tauri::command]
pub async fn search_youtube(query: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let q_trim = query.trim();
        let is_url = q_trim.starts_with("http://") 
            || q_trim.starts_with("https://") 
            || q_trim.contains("youtube.com") 
            || q_trim.contains("youtu.be");
        let search_arg = if is_url {
            q_trim.to_string()
        } else {
            format!("ytsearch40:{}", q_trim)
        };
        let mut child = Command::new(bin_ytdlp())
            .args([
                &search_arg,
                "--flat-playlist",
                "--print", "%(title)s====%(uploader)s====%(duration_string)s====%(id)s",
                "--no-warnings",
                "--no-check-certificates",
                "--socket-timeout", "8",
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .no_window()
            .spawn()
            .map_err(|e| format!("yt-dlp not found: {}", e))?;

        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(15);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => {
                    if std::time::Instant::now() > deadline {
                        let _ = child.kill();
                        let _ = child.wait();
                        return Err("Search timed out — check your connection".to_string());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(25));
                }
                Err(e) => return Err(e.to_string()),
            }
        }
        let out = child.wait_with_output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        if stdout.trim().is_empty() {
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            return Err(if stderr.trim().is_empty() { "No results found".to_string() } else { stderr });
        }
        Ok(stdout)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn search_yt_music(query: String, search_type: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let full_query = match search_type.as_str() {
            "artist" => format!("{} artist", query),
            "album"  => format!("{} full album", query),
            _        => query.clone(),
        };
        let search_arg = format!("ytsearch15:{}", full_query);
        let mut child = Command::new(bin_ytdlp())
            .args([
                &search_arg,
                "--flat-playlist",
                "--print", "%(title)s====%(uploader)s====%(id)s====%(thumbnails.0.url)s====%(view_count)s",
                "--no-warnings",
                "--no-check-certificates",
                "--socket-timeout", "8",
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .no_window()
            .spawn()
            .map_err(|e| format!("yt-dlp not found: {}", e))?;

        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(12);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => {
                    if std::time::Instant::now() > deadline {
                        let _ = child.kill(); let _ = child.wait();
                        return Err("Search timed out".to_string());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(25));
                }
                Err(e) => return Err(e.to_string()),
            }
        }
        let out = child.wait_with_output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        if stdout.trim().is_empty() { return Err("No results".to_string()); }

        let items: Vec<serde_json::Value> = stdout.trim().lines().take(10).filter_map(|line| {
            let parts: Vec<&str> = line.splitn(5, "====").collect();
            if parts.len() < 3 { return None; }
            let title     = parts[0].trim();
            let uploader  = parts[1].trim();
            let id        = parts[2].trim();
            let thumb     = if parts.len() > 3 { parts[3].trim() } else {
                &format!("https://i.ytimg.com/vi/{}/mqdefault.jpg", id)
            };
            let thumb = if thumb.starts_with("http") { thumb.to_string() }
                        else { format!("https://i.ytimg.com/vi/{}/mqdefault.jpg", id) };
            Some(serde_json::json!({
                "title": title,
                "uploader": uploader,
                "id": id,
                "thumbnail": thumb,
                "url": format!("https://youtube.com/watch?v={}", id),
            }))
        }).collect();

        Ok(serde_json::to_string(&items).unwrap_or_default())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn import_youtube_playlist(url: String) -> Result<String, String> {
    let flat_output = tokio::task::spawn_blocking(move || {
        let mut child = Command::new(bin_ytdlp())
            .args([
                "--flat-playlist",
                "--no-warnings",
                "--ignore-errors",
                "--socket-timeout", "10",
                "--no-config",
                "--print", "%(id)s====%(title)s====%(duration_string|0:00)s====%(thumbnails.-1.url,thumbnail|no_thumb)s====%(artist,uploader,channel|Unknown)s====%(playlist_title|YouTube Playlist)s",
                "--",
                url.as_str(),
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .no_window()
            .spawn()
            .map_err(|e| format!("yt-dlp not found: {}", e))?;

        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(60);
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => {
                    if std::time::Instant::now() > deadline {
                        let _ = child.kill();
                        let _ = child.wait();
                        return Err("Playlist import timed out — check the URL and your connection".to_string());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(e) => return Err(e.to_string()),
            }
        }
        let out = child.wait_with_output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        Ok(stdout)
    })
    .await
    .map_err(|e| e.to_string())??;

    let lines: Vec<String> = flat_output.lines().filter(|l| !l.trim().is_empty()).map(|s| s.to_string()).collect();
    if lines.is_empty() {
        return Err("No tracks found. Is this a public playlist?".to_string());
    }

    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(6));
    let mut handles = Vec::new();
    for line in lines {
        let sem_clone = std::sync::Arc::clone(&semaphore);
        let handle = tokio::spawn(async move {
            let parts: Vec<String> = line.split("====").map(|s| s.to_string()).collect();
            if parts.len() < 6 {
                return line;
            }
            let id = parts[0].clone();
            let title = parts[1].clone();
            let duration = parts[2].clone();
            let thumb = parts[3].clone();
            let mut artist = parts[4].clone();
            let playlist_title = parts[5].clone();

            if let Ok(_permit) = sem_clone.acquire().await {
                let mut cmd = tokio::process::Command::new(bin_ytdlp());
                cmd.args([
                    "--no-warnings",
                    "--ignore-errors",
                    "--socket-timeout", "5",
                    "--no-config",
                    "--print", "%(artist,creator,uploader,channel|Unknown)s",
                    "--",
                    &id,
                ])
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .no_window();

                if let Ok(mut child) = cmd.spawn() {
                    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
                    let mut status = None;
                    loop {
                        match child.try_wait() {
                            Ok(Some(s)) => { status = Some(s); break; }
                            Ok(None) => {
                                if std::time::Instant::now() > deadline {
                                    let _ = child.kill().await;
                                    let _ = child.wait().await;
                                    break;
                                }
                                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                            }
                            Err(_) => break,
                        }
                    }
                    if status.map_or(false, |s| s.success()) {
                        if let Ok(out) = child.wait_with_output().await {
                            let mut got = String::from_utf8_lossy(&out.stdout).trim().to_string();
                            if !got.is_empty() && got != "Unknown" {
                                if got.to_lowercase().ends_with(" - topic") {
                                    got = got[..got.len() - 8].trim().to_string();
                                }
                                artist = got;
                            }
                        }
                    }
                }
            }

            format!("{}===={}===={}===={}===={}===={}", id, title, duration, thumb, artist, playlist_title)
        });
        handles.push(handle);
    }

    let mut resolved_lines = Vec::new();
    for h in handles {
        if let Ok(res) = h.await {
            resolved_lines.push(res);
        }
    }

    Ok(resolved_lines.join("\n"))
}

#[tauri::command]
pub async fn import_csv_playlist(csv_content: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let mut lines = csv_content.lines();
        let header = lines.next().unwrap_or("").to_lowercase();
        let cols: Vec<&str> = header.split(',').collect();
        let find_col = |names: &[&str]| -> Option<usize> {
            cols.iter().position(|c| names.iter().any(|n| c.contains(n)))
        };
        let title_idx  = find_col(&["track name", "title", "name"]).unwrap_or(2);
        let artist_idx = find_col(&["artist name", "artist(s)", "artists"]).unwrap_or(4);

        let mut output = String::from("PLAYLIST:Spotify Import\n");
        let mut count = 0usize;
        for line in lines {
            if line.trim().is_empty() { continue; }
            let fields = parse_csv_row(line);
            let title  = fields.get(title_idx).map(|s| s.trim().trim_matches('"').trim()).unwrap_or("").to_string();
            let artist = fields.get(artist_idx).map(|s| s.trim().trim_matches('"').trim()).unwrap_or("").to_string();
            if title.is_empty() { continue; }
            output.push_str(&format!("{}===={}\n", title, artist));
            count += 1;
        }
        if count == 0 {
            return Err("No tracks found in CSV. Make sure this is an Exportify CSV file.".to_string());
        }
        Ok(output)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn parse_csv_row(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '"' => {
                if in_quotes && chars.peek() == Some(&'"') {
                    chars.next();
                    current.push('"');
                } else {
                    in_quotes = !in_quotes;
                }
            }
            ',' if !in_quotes => { fields.push(current.clone()); current.clear(); }
            _ => current.push(ch),
        }
    }
    fields.push(current);
    fields
}

#[tauri::command]
pub async fn prefetch_track(url: String) -> Result<(), String> {
    if url.starts_with("local://") { return Ok(()); }
    if PREFETCH_CACHE.lock().unwrap().contains_key(&url) { return Ok(()); }
    let cache = Arc::clone(&PREFETCH_CACHE);
    tokio::spawn(async move {
        let permit = prefetch_semaphore().acquire().await.ok();
        if PREFETCH_CACHE.lock().unwrap().contains_key(&url) { return; }
        if let Some(stream_url) = extract_stream_url_async(url.clone(), None).await {
            let mut c = cache.lock().unwrap();
            let now = std::time::Instant::now();
            c.retain(|_, v| now.duration_since(v.ts) < std::time::Duration::from_secs(4 * 3600));
            if c.len() >= 200 { c.retain(|_, v| std::time::Instant::now().duration_since(v.ts) < std::time::Duration::from_secs(3600)); }
            c.insert(url, CacheEntry { url: stream_url, ts: now });
        }
        drop(permit);
    });
    Ok(())
}

#[tauri::command]
pub async fn download_song(url: String, quality: String, format: Option<String>, embed_thumbnail: Option<bool>, path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let resolved_path = expand_tilde(&path);
        let fmt = format.as_deref().unwrap_or("mp3");
        let do_embed = embed_thumbnail.unwrap_or(true);
        let audio_format = match fmt {
            "opus" => "opus",
            "m4a"  => "m4a",
            "flac" => "flac",
            _      => "mp3",
        };
        let audio_quality = match quality.as_str() {
            "Low"    => "9",
            "Medium" => "4",
            _        => "0",
        };
        let sep = std::path::MAIN_SEPARATOR;
        let output_template = if resolved_path.ends_with('/') || resolved_path.ends_with('\\') {
            format!("{}%(title)s.%(ext)s", resolved_path)
        } else {
            format!("{}{}%(title)s.%(ext)s", resolved_path, sep)
        };
        let mut args = vec![
            "--extract-audio".to_string(),
            "--audio-format".to_string(), audio_format.to_string(),
            "--audio-quality".to_string(), audio_quality.to_string(),
            "--add-metadata".to_string(),
            "--no-check-certificates".to_string(),
            "--no-warnings".to_string(),
            "-o".to_string(), output_template.clone(),
        ];
        if do_embed {
            args.push("--embed-thumbnail".to_string());
        }
        args.push(url.clone());
        let output = Command::new(bin_ytdlp())
            .args(&args)
            .no_window()
            .output()
            .map_err(|e| format!("yt-dlp not found: {}", e))?;
        if output.status.success() {
            Ok("Downloaded successfully".to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn batch_download(
    app_handle: tauri::AppHandle,
    urls: Vec<String>,
    quality: String,
    path: String,
) -> Result<(), String> {
    let total = urls.len();
    let resolved_path = expand_tilde(&path);

    for (i, url) in urls.iter().enumerate() {
        let url_clone     = url.clone();
        let quality_clone = quality.clone();
        let path_clone    = resolved_path.clone();

        let result: Result<String, String> = tokio::task::spawn_blocking(move || {
            let format = match quality_clone.as_str() {
                "Low"    => "worstaudio/worst",
                "Medium" => "bestaudio[abr<=160]/bestaudio/best",
                _        => "bestaudio/best",
            };
            let audio_quality = match quality_clone.as_str() {
                "Low"    => "9",
                "Medium" => "4",
                _        => "0",
            };
            let sep = std::path::MAIN_SEPARATOR;
            let tpl = format!("{}{}%(title)s.%(ext)s", path_clone, sep);
            let out = Command::new(bin_ytdlp())
                .args(["-f", format, "--extract-audio", "--audio-format", "mp3",
                       "--audio-quality", audio_quality, "--embed-thumbnail", "--add-metadata",
                       "--no-check-certificates", "--no-warnings", "-o", &tpl, &url_clone])
                .no_window()
                .output()
                .map_err(|e| format!("yt-dlp not found: {}", e))?;
            if out.status.success() {
                Ok(String::from_utf8_lossy(&out.stdout).to_string())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).to_string())
            }
        })
        .await
        .map_err(|e| e.to_string())?;

        let (success, error) = match &result {
            Ok(_)  => (true, None),
            Err(e) => (false, Some(e.clone())),
        };
        let _ = app_handle.emit("batch_download_progress", &BatchProgress {
            index: i, total, title: url.clone(), success, error,
        });
    }
    Ok(())
}
