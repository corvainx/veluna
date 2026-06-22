use std::io::{Write, BufRead, BufReader};
use std::process::{Command, Child};
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::atomic::{AtomicU64, Ordering};
use std::collections::HashMap;
use serde_json::Value;
use crate::system::utils::{
    NoWindow, bin_mpv, bin_ytdlp, sanitize_stream_url, sanitize_file_path, safe_f64
};

#[cfg(unix)]
use std::os::unix::net::UnixStream;

#[cfg(windows)]
use std::fs::OpenOptions;

#[cfg(unix)]
pub const SOCKET_PATH: &str = "/tmp/mpvsocket";

#[cfg(windows)]
pub const SOCKET_PATH: &str = r"\\.\pipe\mpvsocket";

pub static PLAY_COUNTER: AtomicU64 = AtomicU64::new(0);

static MPV_PROCESS: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
pub fn mpv_process() -> &'static Mutex<Option<Child>> {
    MPV_PROCESS.get_or_init(|| Mutex::new(None))
}

lazy_static::lazy_static! {
    pub static ref PREFETCH_CACHE: Arc<Mutex<HashMap<String, CacheEntry>>> =
        Arc::new(Mutex::new(HashMap::new()));

    static ref SLEEP_TIMER: Arc<Mutex<Option<(std::time::Instant, u64)>>> =
        Arc::new(Mutex::new(None));
    static ref SLEEP_TIMER_GEN: Arc<Mutex<u64>> = Arc::new(Mutex::new(0));

    pub static ref LOUDNORM_ENABLED: Arc<Mutex<bool>> = Arc::new(Mutex::new(true));
    pub static ref SKIP_SILENCE: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

pub struct CacheEntry {
    pub url: String,
    pub ts: std::time::Instant,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct PlaybackState {
    playing: bool,
    paused: bool,
    position: f64,
    duration: f64,
    eof_reached: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct AudioInfo {
    codec: String,
    bitrate: f64,
    samplerate: f64,
    channels: String,
    format: String,
    url: String,
}

pub fn log_debug(msg: &str) {
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/home/vanguard/veluna/debug.log")
    {
        let _ = writeln!(file, "[{}] {}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(), msg);
    }
}

pub fn mpv_af_flag() -> Option<String> {
    let loudnorm = *LOUDNORM_ENABLED.lock().unwrap();
    let skip_silence = *SKIP_SILENCE.lock().unwrap();
    match (loudnorm, skip_silence) {
        (true,  true)  => Some("--af=loudnorm=I=-16:TP=-1.5:LRA=11,silenceremove=1:0:-50dB".to_string()),
        (true,  false) => Some("--af=loudnorm=I=-16:TP=-1.5:LRA=11".to_string()),
        (false, true)  => Some("--af=silenceremove=1:0:-50dB".to_string()),
        (false, false) => None,
    }
}

pub fn ensure_mpv_running() -> bool {
    let mut guard = mpv_process().lock().unwrap();

    let alive = guard.as_mut().map(|c| c.try_wait().ok() == Some(None)).unwrap_or(false);
    if alive && wait_for_socket(200) { return true; }

    *guard = None;
    let _ = std::fs::remove_file(SOCKET_PATH); 

    let mut args: Vec<String> = vec![
        "--no-video".into(),
        "--idle=yes".into(),
        "--keep-open=yes".into(),
        "--cache=yes".into(),
        "--cache-secs=30".into(),
        "--demuxer-max-bytes=50MiB".into(),
        "--demuxer-max-back-bytes=5MiB".into(),
        "--demuxer-readahead-secs=5".into(),
        "--cache-pause=no".into(),
        "--cache-pause-initial=no".into(),
        "--network-timeout=10".into(),
        "--audio-buffer=0.1".into(),
        "--demuxer-seekable-cache=yes".into(),
        "--cache-on-disk=no".into(),
        "--audio-pitch-correction=yes".into(),
        "--force-window=no".into(),
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36".into(),
        format!("--input-ipc-server={}", SOCKET_PATH),
    ];
    if let Some(af) = mpv_af_flag() { args.push(af); }

    match Command::new(bin_mpv()).args(&args).no_window().spawn() {
        Ok(child) => { *guard = Some(child); }
        Err(_) => return false,
    }
    drop(guard); 
    wait_for_socket(4000)
}

fn switch_track_ipc(url: &str) -> Result<(), String> {
    let _ = send_ipc_command_with_retry(r#"{"command": ["set_property", "pause", true]}"#, 2);
    
    send_ipc_command_with_retry(r#"{"command": ["playlist-clear"]}"#, 3)
        .map_err(|e| format!("playlist-clear failed: {}", e))?;
    
    let cmd = serde_json::json!({"command": ["loadfile", url, "replace"]}).to_string();
    send_ipc_command_with_retry(&cmd, 3)
        .map_err(|e| format!("loadfile failed: {}", e))?;
    Ok(())
}

pub async fn extract_stream_url_async(youtube_url: String, my_id: Option<u64>) -> Option<String> {
    log_debug(&format!("extract_stream_url_async started for URL: {}, my_id: {:?}", youtube_url, my_id));

    if let Some(id) = my_id {
        if PLAY_COUNTER.load(Ordering::SeqCst) != id {
            log_debug("extract_stream_url_async superseded before starting");
            return None;
        }
    }

    tokio::task::spawn_blocking(move || {
        use std::io::Read;

        let group2: &[(Option<&str>, &str)] = &[
            (Some("chrome+basictext"),      "web"),
            (Some("firefox"),               "web"),
            (Some("brave+basictext"),       "web"),
            (Some("chromium+basictext"),    "web"),
        ];

        let mut children = Vec::new();
        let mut spawned_fallback = false;

        let mut cmd = Command::new(bin_ytdlp());
        cmd.env("PYTHONHASHSEED", "0");
        cmd.env("PYTHONDONTWRITEBYTECODE", "1");
        cmd.env("PYTHONNOUSERSITE", "1");
        cmd.no_window();
        cmd.args([
            "--no-warnings", "--no-playlist", "--no-check-certificates",
            "--socket-timeout", "6", "--retries", "0",
            "--no-call-home",
            "--no-check-formats",
            "--js-runtimes", "node",
            "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "-g",
            "--extractor-args", "youtube:player_client=android,skip=webpage",
            "-f", "140/251/18/bestaudio",
            "--", &youtube_url
        ]);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        cmd.stdin(std::process::Stdio::null());

        log_debug("Spawning primary client (android)...");
        match cmd.spawn() {
            Ok(child) => {
                children.push((child, None, "android"));
            }
            Err(e) => {
                log_debug(&format!("Failed to spawn android client: {}", e));
            }
        }

        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_millis(9500);
        let mut resolved_url = None;
        let mut spawned_group1_fallback = false;

        while start_time.elapsed() < timeout && resolved_url.is_none() && (!children.is_empty() || !spawned_fallback) {
            if !spawned_group1_fallback && (start_time.elapsed() >= std::time::Duration::from_millis(600) || children.is_empty()) {
                log_debug("Spawning secondary group1 clients (ios, default)...");
                let secondary = &[(None, "ios"), (None, "default")];
                for &(browser, client) in secondary {
                    if let Some(id) = my_id {
                        if PLAY_COUNTER.load(Ordering::SeqCst) != id {
                            break;
                        }
                    }
                    let mut cmd = Command::new(bin_ytdlp());
                    cmd.env("PYTHONHASHSEED", "0");
                    cmd.env("PYTHONDONTWRITEBYTECODE", "1");
                    cmd.env("PYTHONNOUSERSITE", "1");
                    cmd.no_window();
                    cmd.args([
                        "--no-warnings", "--no-playlist", "--no-check-certificates",
                        "--socket-timeout", "6", "--retries", "0",
                        "--no-call-home",
                        "--no-check-formats",
                        "--js-runtimes", "node",
                        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                        "-g",
                    ]);
                    if client != "default" {
                        cmd.args(["--extractor-args", &format!("youtube:player_client={},skip=webpage", client)]);
                    }
                    cmd.args(["-f", "140/251/18/bestaudio", "--", &youtube_url]);
                    cmd.stdout(std::process::Stdio::piped());
                    cmd.stderr(std::process::Stdio::piped());
                    cmd.stdin(std::process::Stdio::null());
                    if let Ok(child) = cmd.spawn() {
                        children.push((child, browser, client));
                    }
                }
                spawned_group1_fallback = true;
            }

            if !spawned_fallback && (start_time.elapsed() >= std::time::Duration::from_millis(1600) || children.is_empty()) {
                log_debug("Spawning fallback browser cookie clients...");
                for &(browser, client) in group2 {
                    if let Some(id) = my_id {
                        if PLAY_COUNTER.load(Ordering::SeqCst) != id {
                            break;
                        }
                    }
                    let mut cmd = Command::new(bin_ytdlp());
                    cmd.env("PYTHONHASHSEED", "0");
                    cmd.env("PYTHONDONTWRITEBYTECODE", "1");
                    cmd.env("PYTHONNOUSERSITE", "1");
                    cmd.no_window();
                    cmd.args([
                        "--no-warnings", "--no-playlist", "--no-check-certificates",
                        "--socket-timeout", "6", "--retries", "0",
                        "--no-call-home",
                        "--no-check-formats",
                        "--js-runtimes", "node",
                        "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                        "-g",
                    ]);
                    if client != "default" {
                        cmd.args(["--extractor-args", &format!("youtube:player_client={},skip=webpage", client)]);
                    }
                    cmd.args(["-f", "140/251/18/bestaudio"]);
                    if let Some(ref b) = browser {
                        cmd.args(["--cookies-from-browser", b]);
                    }
                    cmd.args(["--", &youtube_url]);
                    cmd.stdout(std::process::Stdio::piped());
                    cmd.stderr(std::process::Stdio::piped());
                    cmd.stdin(std::process::Stdio::null());
                    if let Ok(child) = cmd.spawn() {
                        children.push((child, browser, client));
                    }
                }
                spawned_fallback = true;
            }

            let mut finished_indices = Vec::new();

            for (idx, (child, browser, client)) in children.iter_mut().enumerate() {
                if let Some(id) = my_id {
                    if PLAY_COUNTER.load(Ordering::SeqCst) != id {
                        log_debug("extract_stream_url superseded during monitoring loop");
                        break;
                    }
                }

                match child.try_wait() {
                    Ok(Some(status)) => {
                        finished_indices.push(idx);
                        log_debug(&format!("Client {}, browser {:?} finished. Status: {}", client, browser, status));

                        if status.success() {
                            if let Some(mut stdout) = child.stdout.take() {
                                let mut stdout_str = String::new();
                                if let Ok(_) = stdout.read_to_string(&mut stdout_str) {
                                    log_debug(&format!("Client {}, browser {:?} stdout read length: {}", client, browser, stdout_str.len()));
                                    if let Some(url) = stdout_str.lines()
                                        .find(|l| l.starts_with("http") && !l.contains(".m3u8") && !l.contains("manifest.googlevideo.com"))
                                        .map(|s| s.trim().to_string())
                                    {
                                        log_debug(&format!("Client {}, browser {:?} found URL: {}", client, browser, &url[..url.len().min(60)]));
                                        resolved_url = Some(url);
                                        break;
                                    }
                                }
                            }
                        } else {
                            if let Some(mut stderr) = child.stderr.take() {
                                let mut stderr_str = String::new();
                                let _ = stderr.read_to_string(&mut stderr_str);
                                log_debug(&format!("Client {}, browser {:?} failed. Stderr: {}", client, browser, stderr_str.trim()));
                            }
                        }
                    }
                    Ok(None) => {}
                    Err(e) => {
                        finished_indices.push(idx);
                        log_debug(&format!("Error checking client {}, browser {:?}: {}", client, browser, e));
                    }
                }
            }

            if resolved_url.is_some() {
                break;
            }

            if let Some(id) = my_id {
                if PLAY_COUNTER.load(Ordering::SeqCst) != id {
                    break;
                }
            }

            if !finished_indices.is_empty() {
                finished_indices.sort_by(|a, b| b.cmp(a));
                for idx in finished_indices {
                    if idx < children.len() {
                        children.remove(idx);
                    }
                }
            }

            if resolved_url.is_none() && !children.is_empty() {
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
        }

        for (mut child, browser, client) in children {
            log_debug(&format!("Killing remaining child process for client: {}, browser: {:?}", client, browser));
            let _ = child.kill();
            let _ = child.wait();
        }

        if resolved_url.is_none() && start_time.elapsed() >= timeout {
            log_debug("Timeout (9.5s) reached in extract_stream_url_async!");
        }

        resolved_url
    })
    .await
    .unwrap_or(None)
}

#[tauri::command]
pub async fn play_audio(url: String) -> Result<(), String> {
    log_debug(&format!("play_audio called with URL: {}", url));
    if url.starts_with("local://") {
        return play_local_file(url.trim_start_matches("local://").to_string()).await;
    }
    let safe_url = sanitize_stream_url(&url)?;

    let my_id = PLAY_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;
    log_debug(&format!("Assigned my_id: {} for {}", my_id, safe_url));

    let cached = {
        let cache = PREFETCH_CACHE.lock().unwrap();
        cache.get(&safe_url).and_then(|entry| {
            let age = std::time::Instant::now().duration_since(entry.ts);
            if age < std::time::Duration::from_secs(4 * 3600)
                && entry.url.starts_with("http")
                && !entry.url.contains(".m3u8")
                && !entry.url.contains("manifest.googlevideo.com")
            { Some(entry.url.clone()) } else { None }
        })
    };

    if cached.is_some() {
        log_debug("Found URL in prefetch cache!");
    }

    if PLAY_COUNTER.load(Ordering::SeqCst) != my_id {
        log_debug(&format!("Superseded during cache check. current PLAY_COUNTER: {}", PLAY_COUNTER.load(Ordering::SeqCst)));
        return Err("Superseded by newer play request".to_string());
    }

    let stream_url = if let Some(c) = cached {
        c
    } else {
        let url = extract_stream_url_async(safe_url.clone(), Some(my_id))
            .await
            .ok_or_else(|| {
                log_debug("Failed to extract stream URL in play_audio");
                "Could not extract stream URL. Update yt-dlp: yt-dlp -U".to_string()
            })?;

        if PLAY_COUNTER.load(Ordering::SeqCst) != my_id {
            log_debug(&format!("Superseded after extraction. current PLAY_COUNTER: {}", PLAY_COUNTER.load(Ordering::SeqCst)));
            return Err("Superseded by newer play request".to_string());
        }

        {
            let mut cache = PREFETCH_CACHE.lock().unwrap();
            let now = std::time::Instant::now();
            cache.insert(safe_url.clone(), CacheEntry { url: url.clone(), ts: now });
        }

        url
    };

    log_debug(&format!("Streaming URL resolved: {}", &stream_url[..stream_url.len().min(80)]));

    tokio::task::spawn_blocking(move || {
        if PLAY_COUNTER.load(Ordering::SeqCst) != my_id {
            log_debug("Superseded in spawn_blocking task startup");
            return Err("Superseded by newer play request".to_string());
        }
        log_debug("Ensuring mpv is running...");
        if !ensure_mpv_running() {
            log_debug("mpv failed to start!");
            return Err("mpv failed to start or is not installed".to_string());
        }

        log_debug("Sending switch track command to mpv...");
        if let Err(e) = switch_track_ipc(&stream_url) {
            log_debug(&format!("switch_track_ipc failed: {}", e));
            return Err(format!("IPC switch failed: {}", e));
        }
        
        log_debug("Resuming playback...");
        let _ = send_ipc_command_with_retry(r#"{"command": ["set_property", "pause", false]}"#, 3);
        log_debug("Play request successfully handled!");
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn play_local_file(path: String) -> Result<(), String> {
    let safe_path = sanitize_file_path(&path)?.to_string_lossy().to_string();
    let my_id = PLAY_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;

    tokio::task::spawn_blocking(move || {
        if PLAY_COUNTER.load(Ordering::SeqCst) != my_id {
            return Err("Superseded".to_string());
        }
        if !ensure_mpv_running() {
            return Err("mpv failed to start".to_string());
        }
        switch_track_ipc(&safe_path).map_err(|e| format!("IPC switch failed: {}", e))?;
        
        std::thread::sleep(std::time::Duration::from_millis(80));
        let _ = send_ipc_command_with_retry(r#"{"command": ["set_property", "pause", false]}"#, 3);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pause_audio() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        send_ipc_command_with_retry(r#"{"command": ["cycle", "pause"]}"#, 2).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn seek_audio(time: f64) -> Result<(), String> {
    if !time.is_finite() { return Err("Invalid seek time".to_string()); }
    let t = safe_f64(time);
    tokio::task::spawn_blocking(move || {
        let cmd = format!(r#"{{"command": ["seek", {}, "absolute"]}}"#, t);
        send_ipc_command_with_retry(&cmd, 2).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn seek_relative(seconds: f64) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let cmd = format!(r#"{{"command": ["seek", {}, "relative"]}}"#, seconds);
        send_ipc_command_with_retry(&cmd, 2).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn seek_to_start() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        send_ipc_command_with_retry(r#"{"command": ["seek", 0, "absolute"]}"#, 3).map(|_| ())?;
        std::thread::sleep(std::time::Duration::from_millis(80));
        send_ipc_command_with_retry(r#"{"command": ["set_property", "pause", false]}"#, 3).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn set_volume(volume: f64) -> Result<(), String> {
    let vol = safe_f64(volume).clamp(0.0, 150.0);
    tokio::task::spawn_blocking(move || {
        let cmd = format!(r#"{{"command": ["set_property", "volume", {}]}}"#, vol);
        send_ipc_command_with_retry(&cmd, 2).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_progress() -> Result<f64, String> {
    tokio::task::spawn_blocking(|| {
        let r = send_ipc_command_with_retry(r#"{"command": ["get_property", "time-pos"]}"#, 2)?;
        parse_f64_from_response(&r)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_duration() -> Result<f64, String> {
    tokio::task::spawn_blocking(|| {
        let r = send_ipc_command_with_retry(r#"{"command": ["get_property", "duration"]}"#, 2)?;
        parse_f64_from_response(&r)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn is_paused() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| {
        let r = send_ipc_command_with_retry(r#"{"command": ["get_property", "pause"]}"#, 2)?;
        let j: Value = serde_json::from_str(&r).map_err(|e| e.to_string())?;
        Ok(j["data"].as_bool().unwrap_or(false))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_playback_state() -> Result<PlaybackState, String> {
    tokio::task::spawn_blocking(|| {
        let responses = send_ipc_batch(&[
            r#"{"command": ["get_property", "pause"]}"#,
            r#"{"command": ["get_property", "time-pos"]}"#,
            r#"{"command": ["get_property", "duration"]}"#,
        ]);

        let pause_resp = responses.get(0)
            .and_then(|r| r.as_ref().ok())
            .cloned()
            .ok_or_else(|| "mpv not running".to_string())?;

        let paused = serde_json::from_str::<Value>(&pause_resp)
            .ok().and_then(|j| j["data"].as_bool()).unwrap_or(false);

        let get_f = |i: usize| responses.get(i)
            .and_then(|r| r.as_ref().ok())
            .and_then(|r| parse_f64_from_response(r).ok())
            .map(safe_f64).unwrap_or(0.0);

        let position = get_f(1);
        let duration  = get_f(2);
        let near_end  = duration > 0.0 && position > 5.0 && (duration - position) < 1.5 && paused;

        Ok(PlaybackState { playing: !paused, paused, position, duration, eof_reached: near_end })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn set_playback_speed(speed: f64) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let cmd = format!(r#"{{"command": ["set_property", "speed", {}]}}"#, speed);
        send_ipc_command_with_retry(&cmd, 2).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_playback_speed() -> Result<f64, String> {
    tokio::task::spawn_blocking(|| {
        let r = send_ipc_command_with_retry(r#"{"command": ["get_property", "speed"]}"#, 2)?;
        parse_f64_from_response(&r)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_audio_info() -> Result<AudioInfo, String> {
    tokio::task::spawn_blocking(|| {
        let queries: &[&str] = &[
            r#"{"command": ["get_property", "audio-codec-name"]}"#,
            r#"{"command": ["get_property", "audio-bitrate"]}"#,
            r#"{"command": ["get_property", "audio-samplerate"]}"#,
            r#"{"command": ["get_property", "audio-channels"]}"#,
            r#"{"command": ["get_property", "file-format"]}"#,
            r#"{"command": ["get_property", "path"]}"#,
        ];
        
        let responses = send_ipc_batch(queries);

        let raw = |i: usize| -> String {
            responses.get(i).and_then(|r| r.as_ref().ok()).cloned().unwrap_or_default()
        };
        let get_str = |i: usize| -> Option<String> {
            serde_json::from_str::<Value>(&raw(i)).ok()
                .and_then(|j| j["data"].as_str().map(|s| s.to_string()))
        };
        let get_f64_r = |i: usize| -> f64 {
            serde_json::from_str::<Value>(&raw(i)).ok()
                .and_then(|j| j["data"].as_f64())
                .unwrap_or(0.0)
        };

        let codec      = get_str(0).unwrap_or_else(|| "unknown".into());
        let bitrate    = get_f64_r(1);
        let samplerate = get_f64_r(2);
        let channels   = serde_json::from_str::<Value>(&raw(3)).ok()
            .and_then(|j| {
                if let Some(s) = j["data"].as_str() { return Some(s.to_string()); }
                j["data"].as_i64().map(|n| n.to_string())
            })
            .unwrap_or_else(|| "stereo".into());
        let format = get_str(4)
            .map(|s| s.split(',').next().unwrap_or(&s).trim().to_uppercase())
            .unwrap_or_default();
        let url = get_str(5).unwrap_or_default();

        Ok(AudioInfo { codec, bitrate, samplerate, channels, format, url })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn set_equalizer(bass: f64, mid: f64, treble: f64) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let b = bass.clamp(-12.0, 12.0);
        let m = mid.clamp(-12.0, 12.0);
        let t = treble.clamp(-12.0, 12.0);
        let loudnorm_on = *LOUDNORM_ENABLED.lock().unwrap();
        let skip_sil    = *SKIP_SILENCE.lock().unwrap();
        let eq_active   = !(b == 0.0 && m == 0.0 && t == 0.0);

        let eq_chain = if eq_active {
            format!(
                "lavfi=[equalizer=f=60:width_type=o:width=2:g={b},equalizer=f=1000:width_type=o:width=2:g={m},equalizer=f=10000:width_type=o:width=2:g={t}]",
                b = b, m = m, t = t
            )
        } else {
            String::new()
        };

        let mut parts: Vec<&str> = Vec::new();
        let loudnorm = "loudnorm=I=-16:TP=-1.5:LRA=11";
        let silence  = "silenceremove=1:0:-50dB";
        let ln_owned;
        if loudnorm_on { parts.push(loudnorm); }
        if skip_sil    { parts.push(silence); }
        if eq_active   { ln_owned = eq_chain.clone(); parts.push(&ln_owned); }

        if parts.is_empty() {
            let cmd = r#"{"command": ["set_property", "af", ""]}"#;
            return send_ipc_command_with_retry(cmd, 2).map(|_| ());
        }

        let af_value = parts.join(",");
        let cmd = serde_json::json!({"command": ["set_property", "af", af_value]}).to_string();
        send_ipc_command_with_retry(&cmd, 2).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn set_loudnorm_enabled(enabled: bool) -> Result<(), String> {
    *LOUDNORM_ENABLED.lock().unwrap() = enabled;
    Ok(())
}

#[tauri::command]
pub fn get_loudnorm_enabled() -> bool {
    *LOUDNORM_ENABLED.lock().unwrap()
}

#[tauri::command]
pub fn set_skip_silence(enabled: bool) -> Result<(), String> {
    *SKIP_SILENCE.lock().unwrap() = enabled;
    let af_cmd = if enabled {
        r#"{"command": ["set_property", "af", "silenceremove=1:0:-50dB"]}"#.to_string()
    } else {
        r#"{"command": ["set_property", "af", ""]}"#.to_string()
    };
    let _ = send_ipc_command(&af_cmd);
    Ok(())
}

#[tauri::command]
pub async fn set_sleep_timer(seconds: u64) -> Result<(), String> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(seconds);
    let gen = { let mut g = SLEEP_TIMER_GEN.lock().unwrap(); *g += 1; *g };
    *SLEEP_TIMER.lock().unwrap() = Some((deadline, gen));
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(seconds)).await;
        let cur_gen = *SLEEP_TIMER_GEN.lock().unwrap();
        let fire = SLEEP_TIMER.lock().unwrap()
            .map(|(d, g)| g == gen && g == cur_gen && d <= std::time::Instant::now())
            .unwrap_or(false);
        if fire {
            let _ = tokio::task::spawn_blocking(|| {
                send_ipc_command_with_retry(r#"{"command": ["set_property", "pause", true]}"#, 2)
            }).await;
            *SLEEP_TIMER.lock().unwrap() = None;
        }
    });
    Ok(())
}

#[tauri::command]
pub async fn cancel_sleep_timer() -> Result<(), String> {
    *SLEEP_TIMER_GEN.lock().unwrap() += 1;
    *SLEEP_TIMER.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn get_sleep_timer_remaining() -> Result<i64, String> {
    let remaining = SLEEP_TIMER.lock().unwrap().map(|(deadline, _)| {
        let now = std::time::Instant::now();
        if deadline > now { (deadline - now).as_secs() as i64 } else { 0 }
    }).unwrap_or(-1);
    Ok(remaining)
}

fn wait_for_socket(timeout_ms: u64) -> bool {
    let deadline = std::time::Instant::now() + std::time::Duration::from_millis(timeout_ms);

    #[cfg(unix)]
    {
        while std::time::Instant::now() < deadline {
            if std::path::Path::new(SOCKET_PATH).exists() {
                if UnixStream::connect(SOCKET_PATH).is_ok() { return true; }
            }
            std::thread::sleep(std::time::Duration::from_millis(15));
        }
        false
    }

    #[cfg(windows)]
    {
        while std::time::Instant::now() < deadline {
            if OpenOptions::new().read(true).write(true).open(SOCKET_PATH).is_ok() {
                return true;
            }
            std::thread::sleep(std::time::Duration::from_millis(15));
        }
        false
    }
}

pub fn send_ipc_batch(cmds: &[&str]) -> Vec<Result<String, String>> {
    let n = cmds.len();

    #[cfg(unix)]
    {
        let stream = match UnixStream::connect(SOCKET_PATH) {
            Ok(s) => s,
            Err(e) => return vec![Err(format!("IPC connect failed: {}", e)); n],
        };
        stream.set_read_timeout(Some(std::time::Duration::from_millis(800))).ok();
        stream.set_write_timeout(Some(std::time::Duration::from_millis(400))).ok();

        if let Ok(mut w) = stream.try_clone() {
            for cmd in cmds {
                let _ = w.write_all(cmd.as_bytes());
                let _ = w.write_all(b"\n");
            }
        } else {
            return vec![Err("UnixStream clone failed".to_string()); n];
        }

        let mut reader = BufReader::new(stream);
        let mut results: Vec<String> = Vec::with_capacity(n);
        let mut lines_read = 0usize;
        while results.len() < n && lines_read < n * 12 {
            let mut line = String::new();
            if reader.read_line(&mut line).is_err() || line.is_empty() { break; }
            lines_read += 1;
            let trimmed = line.trim();
            if let Ok(v) = serde_json::from_str::<Value>(trimmed) {
                if !v["error"].is_null() { results.push(trimmed.to_string()); }
            }
        }

        let mut out: Vec<Result<String, String>> = results.into_iter().map(Ok).collect();
        while out.len() < n { out.push(Err("No response from mpv".to_string())); }
        out
    }

    #[cfg(not(unix))]
    {
        let file = match OpenOptions::new().read(true).write(true).open(SOCKET_PATH) {
            Ok(f) => f,
            Err(e) => return vec![Err(format!("IPC connect failed: {}", e)); n],
        };

        let mut reader  = BufReader::new(&file);
        let mut results = Vec::with_capacity(n);
        let deadline    = std::time::Instant::now() + std::time::Duration::from_millis(800);

        for cmd in cmds {
            {
                let mut w = &file;
                if w.write_all(cmd.as_bytes()).is_err() || w.write_all(b"\n").is_err() { break; }
            }
            let mut found = false;
            for _ in 0..12 {
                if std::time::Instant::now() > deadline { break; }
                let mut line = String::new();
                if reader.read_line(&mut line).is_err() || line.is_empty() { break; }
                let trimmed = line.trim();
                if let Ok(v) = serde_json::from_str::<Value>(trimmed) {
                    if !v["error"].is_null() {
                        results.push(trimmed.to_string());
                        found = true;
                        break;
                    }
                }
            }
            if !found { break; }
        }

        let mut out: Vec<Result<String, String>> = results.into_iter().map(Ok).collect();
        while out.len() < n { out.push(Err("No response from mpv".to_string())); }
        out
    }
}

pub fn send_ipc_command_with_retry(cmd: &str, retries: u8) -> Result<String, String> {
    let mut last_err = String::new();
    for attempt in 0..=retries {
        match send_ipc_command(cmd) {
            Ok(r) => return Ok(r),
            Err(e) => {
                last_err = e;
                if attempt < retries {
                    let delay = 50u64 * (1u64 << attempt.min(4));
                    std::thread::sleep(std::time::Duration::from_millis(delay));
                }
            }
        }
    }
    Err(last_err)
}

pub fn send_ipc_command(cmd: &str) -> Result<String, String> {
    fn is_cmd_response(line: &str) -> bool {
        let v: Value = serde_json::from_str(line).unwrap_or(Value::Null);
        !v.is_null() && !v["error"].is_null()
    }

    #[cfg(unix)]
    {
        let mut stream = UnixStream::connect(SOCKET_PATH)
            .map_err(|e| format!("IPC connect failed: {}", e))?;
        stream.set_read_timeout(Some(std::time::Duration::from_millis(500))).map_err(|e| e.to_string())?;
        stream.set_write_timeout(Some(std::time::Duration::from_millis(200))).map_err(|e| e.to_string())?;
        stream.write_all(cmd.as_bytes()).map_err(|e| e.to_string())?;
        stream.write_all(b"\n").map_err(|e| e.to_string())?;
        let mut reader = BufReader::new(stream);
        for _ in 0..24 {
            let mut line = String::new();
            if reader.read_line(&mut line).is_err() || line.is_empty() { break; }
            if is_cmd_response(line.trim()) { return Ok(line); }
        }
        Err("No response from mpv".to_string())
    }

    #[cfg(windows)]
    {
        let file = OpenOptions::new().read(true).write(true)
            .open(SOCKET_PATH)
            .map_err(|e| format!("IPC connect failed: {}", e))?;
        {
            let mut f = &file;
            f.write_all(cmd.as_bytes()).map_err(|e| e.to_string())?;
            f.write_all(b"\n").map_err(|e| e.to_string())?;
        }
        let mut reader = BufReader::new(&file);
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(600);
        for _ in 0..24 {
            if std::time::Instant::now() > deadline { break; }
            let mut line = String::new();
            if reader.read_line(&mut line).is_err() || line.is_empty() { break; }
            if is_cmd_response(line.trim()) { return Ok(line); }
        }
        Err("No response from mpv".to_string())
    }
}

pub fn parse_f64_from_response(response: &str) -> Result<f64, String> {
    let json: Value = serde_json::from_str(response).map_err(|e| e.to_string())?;
    if json["data"].is_null() { return Ok(0.0); }
    json["data"].as_f64().ok_or_else(|| format!("Unexpected data type: {}", response))
}

#[tauri::command]
pub async fn fetch_lyrics(title: String, artist: String, duration: f64) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("veluna/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!(
        "https://lrclib.net/api/get?track_name={}&artist_name={}&duration={}",
        title.replace(' ', "+").replace('&', "%26"),
        artist.replace(' ', "+").replace('&', "%26"),
        duration as u64,
    );

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("lrclib: {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if let Some(synced) = json["syncedLyrics"].as_str().filter(|s| !s.is_empty()) {
        let mut lines: Vec<serde_json::Value> = Vec::new();
        for line in synced.lines() {
            let line = line.trim();
            if line.is_empty() { continue; }
            if let Some(rest) = line.strip_prefix('[') {
                if let Some(end) = rest.find(']') {
                    let ts = &rest[..end];
                    let text = rest[end+1..].trim();
                    
                    let secs: f64 = if let Some(colon) = ts.find(':') {
                        let mins: f64 = ts[..colon].parse().unwrap_or(0.0);
                        let s: f64 = ts[colon+1..].parse().unwrap_or(0.0);
                        mins * 60.0 + s
                    } else { continue; };
                    lines.push(serde_json::json!({"time": secs, "text": text}));
                }
            }
        }
        if !lines.is_empty() {
            return Ok(serde_json::to_string(&lines).unwrap_or_default());
        }
    }

    if let Some(plain) = json["plainLyrics"].as_str().filter(|s| !s.is_empty()) {
        let lines: Vec<&str> = plain.lines().filter(|l| !l.trim().is_empty()).collect();
        let total = duration.max(1.0);
        let step = total / lines.len().max(1) as f64;
        let arr: Vec<serde_json::Value> = lines.iter().enumerate()
            .map(|(i, l)| serde_json::json!({"time": i as f64 * step, "text": l.trim()}))
            .collect();
        return Ok(serde_json::to_string(&arr).unwrap_or_default());
    }

    Err("No lyrics found".to_string())
}
