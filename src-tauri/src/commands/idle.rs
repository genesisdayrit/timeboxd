#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(
        stateID: i32,
        eventType: u32,
    ) -> f64;
}

/// Returns the number of seconds since the last user input (keyboard/mouse) on macOS.
/// Uses Core Graphics API for accurate system-wide idle detection.
#[tauri::command]
pub fn get_system_idle_time() -> Result<u64, String> {
    #[cfg(target_os = "macos")]
    {
        // kCGEventSourceStateHIDSystemState = 1
        // kCGAnyInputEventType = 0xFFFFFFFF - detects ANY input event (keyboard, mouse, trackpad)
        const K_CG_ANY_INPUT_EVENT_TYPE: u32 = 0xFFFFFFFF;
        let idle_seconds = unsafe {
            CGEventSourceSecondsSinceLastEventType(1, K_CG_ANY_INPUT_EVENT_TYPE)
        };
        Ok(idle_seconds as u64)
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, return 0 (never idle) for now
        Ok(0)
    }
}
