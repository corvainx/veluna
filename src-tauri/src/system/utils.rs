use std::process::Command;
use std::sync::OnceLock;
use std::path::{Path, PathBuf};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub trait NoWindow {
    fn no_window(&mut self) -> &mut Self;
}

impl NoWindow for Command {
    #[cfg(windows)]
    fn no_window(&mut self) -> &mut Self {
        self.creation_flags(0x08000000)
    }
    #[cfg(not(windows))]
    fn no_window(&mut self) -> &mut Self {
        self
    }
}

impl NoWindow for tokio::process::Command {
    #[cfg(windows)]
    fn no_window(&mut self) -> &mut Self {
        self.creation_flags(0x08000000)
    }
    #[cfg(not(windows))]
    fn no_window(&mut self) -> &mut Self {
        self
    }
}

static BIN_MPV:     OnceLock<String> = OnceLock::new();
static BIN_YTDLP:   OnceLock<String> = OnceLock::new();
static BIN_FFPROBE: OnceLock<String> = OnceLock::new();
static BIN_FFMPEG:  OnceLock<String> = OnceLock::new();

fn resolve_bin(name: &str, search_paths: &[String]) -> String {
    for dir in search_paths {
        #[cfg(target_os = "windows")]
        let full = format!("{}\\{}.exe", dir, name);
        #[cfg(not(target_os = "windows"))]
        let full = format!("{}/{}", dir, name);

        let p = Path::new(&full);
        if p.is_file() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(meta) = p.metadata() {
                    if meta.permissions().mode() & 0o111 != 0 {
                        return full;
                    }
                }
            }
            #[cfg(windows)]
            return full;
        }
    }
    name.to_string()
}

pub fn init_bin_paths() {
    let home = std::env::var("HOME").unwrap_or_default();
    let mut paths: Vec<String> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let user_profile   = std::env::var("USERPROFILE").unwrap_or_default();
        
        paths.push(format!("{}\\Programs\\veluna-deps\\mpv",    local_app_data));
        paths.push(format!("{}\\Programs\\veluna-deps\\ffmpeg",  local_app_data));
        paths.push(format!("{}\\Programs\\veluna-deps",          local_app_data));
        
        paths.push(format!("{}\\Programs\\mpv",    local_app_data));
        paths.push("C:\\Program Files\\mpv".into());
        paths.push("C:\\Program Files (x86)\\mpv".into());
        paths.push("C:\\ProgramData\\chocolatey\\bin".into());
        paths.push(format!("{}\\scoop\\shims", user_profile));
        paths.push(format!("{}\\AppData\\Local\\Microsoft\\WindowsApps", user_profile));
    }

    #[cfg(not(target_os = "windows"))]
    {
        let appimage = std::env::var("APPIMAGE").is_ok();
        let host = if appimage { "/proc/1/root" } else { "" };

        for p in &[
            format!("{}/.local/bin", home),
            format!("{}/.cargo/bin", home),
            "/usr/local/bin".to_string(),
            "/usr/bin".to_string(),
            "/bin".to_string(),
            "/snap/bin".to_string(),
            "/var/lib/flatpak/exports/bin".to_string(),
            "/usr/games".to_string(),
        ] {
            if !host.is_empty() { paths.push(format!("{}{}", host, p)); }
            paths.push(p.clone());
        }
    }

    if let Ok(env_path) = std::env::var("PATH") {
        #[cfg(target_os = "windows")]
        let sep = ';';
        #[cfg(not(target_os = "windows"))]
        let sep = ':';
        for p in env_path.split(sep) {
            let s = p.to_string();
            if !paths.contains(&s) { paths.push(s); }
        }
    }

    #[cfg(target_os = "windows")]
    let sep = ";";
    #[cfg(not(target_os = "windows"))]
    let sep = ":";

    let clean: Vec<&str> = paths.iter()
        .filter(|p| !p.starts_with("/proc/1/root"))
        .map(|s| s.as_str())
        .collect();
    std::env::set_var("PATH", clean.join(sep));

    let mpv     = resolve_bin("mpv",     &paths);
    let ytdlp   = resolve_bin("yt-dlp",  &paths);
    let ffprobe = resolve_bin("ffprobe", &paths);
    let ffmpeg  = resolve_bin("ffmpeg",  &paths);

    eprintln!("[veluna] mpv     -> {}", mpv);
    eprintln!("[veluna] yt-dlp  -> {}", ytdlp);
    eprintln!("[veluna] ffprobe -> {}", ffprobe);
    eprintln!("[veluna] ffmpeg  -> {}", ffmpeg);

    fn set_or_update(lock: &OnceLock<String>, val: String) {
        if lock.get().is_none() {
            let _ = lock.set(val);
        }
    }
    set_or_update(&BIN_MPV,     mpv);
    set_or_update(&BIN_YTDLP,   ytdlp);
    set_or_update(&BIN_FFPROBE, ffprobe);
    set_or_update(&BIN_FFMPEG,  ffmpeg);
}

pub fn bin_mpv()     -> &'static str { BIN_MPV.get().map(|s| s.as_str()).unwrap_or("mpv") }
pub fn bin_ytdlp()   -> &'static str { BIN_YTDLP.get().map(|s| s.as_str()).unwrap_or("yt-dlp") }
pub fn bin_ffprobe() -> &'static str { BIN_FFPROBE.get().map(|s| s.as_str()).unwrap_or("ffprobe") }
pub fn bin_ffmpeg()  -> &'static str { BIN_FFMPEG.get().map(|s| s.as_str()).unwrap_or("ffmpeg") }

pub fn expand_tilde(path: &str) -> String {
    if path == "~" || path.starts_with("~/") || path.starts_with("~\\") {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        return path.replacen('~', &home, 1);
    }
    path.to_string()
}

pub fn sanitize_stream_url(url: &str) -> Result<String, String> {
    let u = url.trim();
    if u.starts_with("https://") || u.starts_with("http://") {
        Ok(u.to_string())
    } else {
        Err(format!("Rejected URL with unsafe scheme: {}", &u[..u.len().min(80)]))
    }
}

pub fn sanitize_file_path(path: &str) -> Result<PathBuf, String> {
    let expanded = expand_tilde(path.trim_start_matches("local://").trim());
    let p = Path::new(&expanded);
    if !p.is_absolute() {
        return Err(format!("Path must be absolute: {}", &expanded[..expanded.len().min(200)]));
    }
    match p.canonicalize() {
        Ok(canon) => Ok(canon),
        Err(_) => {
            if expanded.contains("..") {
                return Err("Path traversal not allowed".to_string());
            }
            Ok(p.to_path_buf())
        }
    }
}

pub fn safe_f64(v: f64) -> f64 {
    if v.is_finite() { v } else { 0.0 }
}

#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Cannot create directory: {}", e))?;
    }
    std::fs::write(&path, content.as_bytes()).map_err(|e| format!("Write failed: {}", e))
}

#[tauri::command]
pub async fn open_url_in_browser(url: String) -> Result<(), String> {
    let sanitized = url.trim().to_string();
    if !sanitized.starts_with("https://") && !sanitized.starts_with("http://") {
        return Err("Only http/https URLs are allowed".to_string());
    }
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "linux")]
        { Command::new("xdg-open").arg(&sanitized).no_window().spawn().map_err(|e| e.to_string())?; }
        #[cfg(target_os = "macos")]
        { Command::new("open").arg(&sanitized).no_window().spawn().map_err(|e| e.to_string())?; }
        #[cfg(target_os = "windows")]
        { Command::new("cmd").args(["/c", "start", "", &sanitized]).no_window().spawn().map_err(|e| e.to_string())?; }
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn check_for_update() -> Result<Option<String>, String> {
    let current = env!("CARGO_PKG_VERSION");
    let client = reqwest::Client::builder()
        .user_agent("veluna")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("https://api.github.com/repos/ishmweet/veluna/releases/latest")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let latest = json["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v');

    if latest.is_empty() || latest == current {
        Ok(None)
    } else {
        Ok(Some(latest.to_string()))
    }
}
