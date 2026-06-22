mod services;
mod integrations;
mod system;

use tauri::Manager;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    system::utils::init_bin_paths();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

            let handle = app.handle().clone();

            app.manage(system::tray::init());

            integrations::mpris::start_mpris_server(handle.clone());

            std::thread::spawn(|| { services::mpv_player::ensure_mpv_running(); });

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_icon(tauri::include_image!("icons/128x128.png"));
            }

            let shortcuts = [
                ("MediaPlayPause", "mpris_play_pause"),
                ("MediaNextTrack",  "mpris_next"),
                ("MediaPrevTrack",  "mpris_prev"),
            ];

            for (key, event) in shortcuts {
                if let Ok(shortcut) = key.parse::<Shortcut>() {
                    let h = handle.clone();
                    let ev = event.to_string();
                    let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                        if event.state == ShortcutState::Pressed {
                            let _ = h.emit(&ev, ());
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            system::utils::ping,
            system::utils::check_for_update,
            system::utils::open_url_in_browser,
            system::utils::write_text_file,
            integrations::mpris::set_mpris_metadata,
            integrations::mpris::update_mpris_playback,
            services::downloader::search_youtube,
            services::downloader::prefetch_track,
            services::downloader::import_csv_playlist,
            services::downloader::import_youtube_playlist,
            services::downloader::download_song,
            services::downloader::batch_download,
            services::downloader::search_yt_music,
            services::mpv_player::set_loudnorm_enabled,
            services::mpv_player::set_skip_silence,
            services::mpv_player::get_loudnorm_enabled,
            services::mpv_player::play_audio,
            services::mpv_player::play_local_file,
            services::mpv_player::pause_audio,
            services::mpv_player::seek_audio,
            services::mpv_player::seek_relative,
            services::mpv_player::seek_to_start,
            services::mpv_player::set_volume,
            services::mpv_player::get_progress,
            services::mpv_player::get_duration,
            services::mpv_player::is_paused,
            services::mpv_player::get_playback_state,
            services::mpv_player::set_playback_speed,
            services::mpv_player::get_playback_speed,
            services::mpv_player::get_audio_info,
            services::mpv_player::set_equalizer,
            services::mpv_player::set_sleep_timer,
            services::mpv_player::cancel_sleep_timer,
            services::mpv_player::get_sleep_timer_remaining,
            services::mpv_player::fetch_lyrics,
            services::metadata::scan_downloads,
            services::metadata::delete_local_file,
            services::metadata::rename_local_file,
            services::metadata::open_in_file_manager,
            services::metadata::get_audio_metadata,
            services::metadata::write_audio_metadata,
            services::metadata::get_audio_cover,
            services::metadata::get_waveform_thumbnail,
            services::metadata::get_disk_usage,
            services::metadata::export_playlist_m3u,
            services::metadata::import_playlist_m3u,
            services::metadata::normalize_file,
            system::tray::tray_set,
            services::audio_device::get_audio_device,
            services::audio_device::list_audio_devices,
            services::audio_device::set_audio_device,
            integrations::discord::update_discord_rpc,
            integrations::discord::clear_discord_rpc,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::WindowEvent {
                    label,
                    event: tauri::WindowEvent::CloseRequested { api, .. },
                    ..
                } if label == "main" => {
                    let flag = app_handle.state::<system::tray::TrayFlag>();
                    if system::tray::handle_close_requested(app_handle, &flag) {
                        api.prevent_close();
                    }
                }
                tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                    if let Some(mut child) = services::mpv_player::mpv_process().lock().unwrap().take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                    #[cfg(unix)]
                    { let _ = std::fs::remove_file(services::mpv_player::SOCKET_PATH); }
                }
                _ => {}
            }
        });
}
