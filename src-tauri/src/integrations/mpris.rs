use std::sync::Mutex;
use std::collections::HashMap;
use tauri::Emitter;


#[derive(Clone, Default)]
struct MprisMetadata {
    title: String,
    artist: String,
    cover_url: String,
    duration_us: i64,
    playing: bool,
}

static MPRIS_META: std::sync::OnceLock<Mutex<MprisMetadata>> = std::sync::OnceLock::new();

fn mpris_meta() -> &'static Mutex<MprisMetadata> {
    MPRIS_META.get_or_init(|| Mutex::new(MprisMetadata::default()))
}

#[cfg(target_os = "linux")]
static MPRIS_TX: std::sync::OnceLock<tokio::sync::watch::Sender<()>> = std::sync::OnceLock::new();

#[cfg(target_os = "linux")]
pub fn mpris_notify() {
    if let Some(tx) = MPRIS_TX.get() { let _ = tx.send(()); }
}

#[cfg(not(target_os = "linux"))]
pub fn mpris_notify() {}

#[tauri::command]
pub async fn set_mpris_metadata(
    title: String,
    artist: String,
    cover_url: String,
    duration_secs: f64,
    playing: bool,
) -> Result<(), String> {
    {
        let mut meta = mpris_meta().lock().unwrap();
        meta.title = title;
        meta.artist = artist;
        meta.cover_url = cover_url;
        meta.duration_us = (duration_secs * 1_000_000.0) as i64;
        meta.playing = playing;
    }
    mpris_notify();
    Ok(())
}

#[tauri::command]
pub async fn update_mpris_playback(playing: bool) -> Result<(), String> {
    mpris_meta().lock().unwrap().playing = playing;
    mpris_notify();
    Ok(())
}

#[cfg(target_os = "linux")]
pub fn start_mpris_server(app_handle: tauri::AppHandle) {
    let (tx, rx) = tokio::sync::watch::channel(());
    let _ = MPRIS_TX.set(tx);
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("tokio rt");
        rt.block_on(async move {
            if let Err(e) = run_mpris_server(app_handle, rx).await {
                eprintln!("[veluna] MPRIS server error: {}", e);
            }
        });
    });
}

#[cfg(not(target_os = "linux"))]
pub fn start_mpris_server(_app_handle: tauri::AppHandle) {}

#[cfg(target_os = "linux")]
async fn run_mpris_server(
    app_handle: tauri::AppHandle,
    mut rx: tokio::sync::watch::Receiver<()>,
) -> Result<(), Box<dyn std::error::Error>> {
    use zbus::{ConnectionBuilder, dbus_interface, InterfaceRef};
    use zbus::zvariant::{Value as ZValue, OwnedValue, ObjectPath};
    use crate::services::mpv_player::{send_ipc_command_with_retry, parse_f64_from_response};

    struct MediaPlayer2;

    #[dbus_interface(name = "org.mpris.MediaPlayer2")]
    impl MediaPlayer2 {
        #[dbus_interface(property)]
        fn can_quit(&self) -> bool { true }
        #[dbus_interface(property)]
        fn can_raise(&self) -> bool { false }
        #[dbus_interface(property)]
        fn has_track_list(&self) -> bool { false }
        #[dbus_interface(property)]
        fn identity(&self) -> &str { "Veluna" }
        #[dbus_interface(property)]
        fn desktop_entry(&self) -> &str { "veluna" }
        #[dbus_interface(property)]
        fn supported_uri_schemes(&self) -> Vec<String> { vec![] }
        #[dbus_interface(property)]
        fn supported_mime_types(&self) -> Vec<String> { vec![] }
        fn quit(&self) {}
        fn raise(&self) {}
    }

    let app_next = app_handle.clone();
    let app_prev = app_handle.clone();
    let app_pp   = app_handle.clone();
    let app_stop = app_handle.clone();

    struct Player {
        app_next: tauri::AppHandle,
        app_prev: tauri::AppHandle,
        app_pp:   tauri::AppHandle,
        app_stop: tauri::AppHandle,
    }

    #[dbus_interface(name = "org.mpris.MediaPlayer2.Player")]
    impl Player {
        #[dbus_interface(property)]
        fn playback_status(&self) -> String {
            if mpris_meta().lock().unwrap().playing { "Playing".into() } else { "Paused".into() }
        }
        #[dbus_interface(property)]
        fn loop_status(&self) -> String { "None".into() }
        #[dbus_interface(property)]
        fn rate(&self) -> f64 { 1.0 }
        #[dbus_interface(property)]
        fn shuffle(&self) -> bool { false }

        #[dbus_interface(property)]
        fn metadata(&self) -> HashMap<String, OwnedValue> {
            let (title, artist, cover_url, duration_us) = {
                let m = mpris_meta().lock().unwrap();
                (m.title.clone(), m.artist.clone(), m.cover_url.clone(), m.duration_us)
            };
            let mut map: HashMap<String, OwnedValue> = HashMap::new();
            map.insert("mpris:trackid".into(),
                OwnedValue::try_from(ZValue::new(ObjectPath::try_from("/org/veluna/track/1").unwrap())).unwrap());
            map.insert("xesam:title".into(),
                OwnedValue::try_from(ZValue::new(title.as_str())).unwrap());
            map.insert("xesam:artist".into(),
                OwnedValue::try_from(ZValue::new(vec![artist.as_str()])).unwrap());
            if !cover_url.is_empty() {
                map.insert("mpris:artUrl".into(),
                    OwnedValue::try_from(ZValue::new(cover_url.as_str())).unwrap());
            }
            if duration_us > 0 {
                map.insert("mpris:length".into(),
                    OwnedValue::try_from(ZValue::new(duration_us)).unwrap());
            }
            map
        }

        #[dbus_interface(property)]
        fn volume(&self) -> f64 { 1.0 }
        #[dbus_interface(property)]
        fn position(&self) -> i64 {
            send_ipc_command_with_retry(r#"{"command": ["get_property", "time-pos"]}"#, 1)
                .ok()
                .and_then(|r| parse_f64_from_response(&r).ok())
                .map(|s| (s * 1_000_000.0) as i64)
                .unwrap_or(0)
        }
        #[dbus_interface(property)]
        fn minimum_rate(&self) -> f64 { 0.5 }
        #[dbus_interface(property)]
        fn maximum_rate(&self) -> f64 { 2.0 }
        #[dbus_interface(property)]
        fn can_go_next(&self) -> bool { true }
        #[dbus_interface(property)]
        fn can_go_previous(&self) -> bool { true }
        #[dbus_interface(property)]
        fn can_play(&self) -> bool { true }
        #[dbus_interface(property)]
        fn can_pause(&self) -> bool { true }
        #[dbus_interface(property)]
        fn can_seek(&self) -> bool { true }
        #[dbus_interface(property)]
        fn can_control(&self) -> bool { true }

        fn next(&self)       { let _ = self.app_next.emit("mpris_next", ()); }
        fn previous(&self)   { let _ = self.app_prev.emit("mpris_prev", ()); }
        fn play_pause(&self) { let _ = self.app_pp.emit("mpris_play_pause", ()); }
        fn play(&self)       { let _ = self.app_pp.emit("mpris_play_pause", ()); }
        fn pause(&self)      { let _ = self.app_pp.emit("mpris_play_pause", ()); }
        fn stop(&self)       { let _ = self.app_stop.emit("mpris_play_pause", ()); }

        fn seek(&self, offset_us: i64) {
            let cmd = format!(r#"{{"command": ["seek", {}, "relative"]}}"#, offset_us as f64 / 1_000_000.0);
            let _ = send_ipc_command_with_retry(&cmd, 1);
        }
        fn set_position(&self, _track_id: ObjectPath<'_>, position_us: i64) {
            let cmd = format!(r#"{{"command": ["seek", {}, "absolute"]}}"#, position_us as f64 / 1_000_000.0);
            let _ = send_ipc_command_with_retry(&cmd, 1);
        }
        fn open_uri(&self, _uri: String) {}
    }

    let conn = ConnectionBuilder::session()?
        .name("org.mpris.MediaPlayer2.veluna")?
        .serve_at("/org/mpris/MediaPlayer2", MediaPlayer2)?
        .serve_at("/org/mpris/MediaPlayer2", Player { app_next, app_prev, app_pp, app_stop })?
        .build()
        .await?;

    let player_iface: InterfaceRef<Player> = conn
        .object_server()
        .interface("/org/mpris/MediaPlayer2")
        .await?;

    loop {
        let _ = rx.changed().await;
        let iface = player_iface.get().await;
        let ctxt  = player_iface.signal_context();
        let _ = iface.playback_status_changed(ctxt).await;
        let _ = iface.metadata_changed(ctxt).await;
    }
}
