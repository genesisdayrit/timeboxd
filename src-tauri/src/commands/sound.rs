use std::process::Command;

/// Plays a macOS system sound using afplay.
/// This works even when the app is in the background and doesn't require user interaction.
#[tauri::command]
pub fn play_system_sound(sound_name: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let sound = sound_name.unwrap_or_else(|| "Glass".to_string());
        let sound_path = format!("/System/Library/Sounds/{}.aiff", sound);

        Command::new("afplay")
            .arg(&sound_path)
            .spawn()
            .map_err(|e| format!("Failed to play sound: {}", e))?;

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, silently succeed
        Ok(())
    }
}
