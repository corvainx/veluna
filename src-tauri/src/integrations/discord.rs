use std::sync::Mutex;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

static DISCORD_CLIENT: std::sync::OnceLock<Mutex<Option<DiscordIpcClient>>> = std::sync::OnceLock::new();

fn get_discord_client() -> &'static Mutex<Option<DiscordIpcClient>> {
    DISCORD_CLIENT.get_or_init(|| Mutex::new(None))
}

#[tauri::command]
pub fn update_discord_rpc(title: String, artist: Option<String>, cover_url: Option<String>) {
    std::thread::spawn(move || {
        let mut client_lock = get_discord_client().lock().unwrap();
        if client_lock.is_none() {
            let mut client = DiscordIpcClient::new("1517835351044001953");
            if client.connect().is_ok() {
                *client_lock = Some(client);
            }
        }
        if let Some(ref mut client) = *client_lock {
            let mut act = activity::Activity::new()
                .details(&title)
                .activity_type(activity::ActivityType::Listening);
            let clean_artist = artist.as_deref().unwrap_or("").trim();
            if !clean_artist.is_empty() {
                act = act.state(clean_artist);
            }
            let mut assets = activity::Assets::new()
                .small_image("icon")
                .small_text("Veluna");
            if let Some(ref url) = cover_url {
                if !url.trim().is_empty() {
                    assets = assets.large_image(url);
                }
            }
            act = act.assets(assets);
            if client.set_activity(act).is_err() {
                let _ = client.close();
                *client_lock = None;
            }
        }
    });
}

#[tauri::command]
pub fn clear_discord_rpc() {
    std::thread::spawn(|| {
        let mut client_lock = get_discord_client().lock().unwrap();
        if let Some(ref mut client) = *client_lock {
            if client.clear_activity().is_err() {
                let _ = client.close();
                *client_lock = None;
            }
        }
    });
}
