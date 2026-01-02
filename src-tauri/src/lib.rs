mod commands;
mod database;
mod models;
mod state;

#[cfg(test)]
mod database_tests;

use tauri::Manager;
use commands::{
    archive_timebox, cancel_session, cancel_timebox, create_timebox, delete_timebox,
    finish_timebox, get_active_session_for_timebox, get_active_timeboxes, get_archived_timeboxes,
    get_sessions_for_timebox, get_timebox_change_log, get_today_timeboxes, pause_timebox,
    reorder_timeboxes, start_timebox, stop_session, stop_timebox, stop_timebox_after_time,
    unarchive_timebox, update_timebox,
    // Integration commands
    create_integration, delete_integration, get_integration_by_type, get_integrations,
    test_linear_connection, test_todoist_connection,
    // Linear project commands
    get_linear_teams, get_linear_team_projects, save_linear_project, toggle_linear_project_active,
    get_linear_projects, get_active_timebox_projects, archive_linear_project, delete_linear_project,
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
            finish_timebox,
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
            reorder_timeboxes,
            archive_timebox,
            unarchive_timebox,
            get_archived_timeboxes,
            // Integration commands
            create_integration,
            get_integrations,
            get_integration_by_type,
            delete_integration,
            test_linear_connection,
            test_todoist_connection,
            // Linear project commands
            get_linear_teams,
            get_linear_team_projects,
            save_linear_project,
            toggle_linear_project_active,
            get_linear_projects,
            get_active_timebox_projects,
            archive_linear_project,
            delete_linear_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
