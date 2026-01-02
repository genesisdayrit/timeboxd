mod commands;
mod database;
mod models;
mod state;

#[cfg(test)]
mod database_tests;

use tauri::Manager;
use commands::{
    cancel_session, cancel_timebox, create_timebox, delete_timebox, get_active_session_for_timebox,
    get_active_timeboxes, get_sessions_for_timebox, get_timebox_change_log, get_today_timeboxes,
    pause_timebox, start_timebox, stop_session, stop_timebox, stop_timebox_after_time, update_timebox,
};
use database::initialize_database;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db = initialize_database(app.handle())
                .expect("Failed to initialize database");
            app.manage(AppState::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_timebox,
            update_timebox,
            start_timebox,
            stop_timebox,
            stop_timebox_after_time,
            pause_timebox,
            cancel_timebox,
            delete_timebox,
            get_today_timeboxes,
            get_active_timeboxes,
            get_timebox_change_log,
            get_sessions_for_timebox,
            stop_session,
            cancel_session,
            get_active_session_for_timebox,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
