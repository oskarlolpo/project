# Bedrock Integration for Modrinth App

## Overview

This integration adds Minecraft Bedrock Edition support to the Modrinth App, allowing users to:

- Install and manage Bedrock versions
- Create Bedrock instances
- Launch Bedrock games
- Inject DLLs into Bedrock processes (Windows only)

## Implementation Details

### 1. Rust Backend (`modrinth-app/apps/app/src/api/bedrock_loader.rs`)

The main integration module includes:

- **BedrockVersion**: Represents a Bedrock version with metadata
- **BedrockInstance**: Represents a Bedrock game instance
- **BedrockDownloader**: Handles downloading Bedrock versions
- **BedrockVersionManager**: Manages available Bedrock versions
- **BedrockInstaller**: Handles installation of Bedrock versions
- **BedrockLauncher**: Launches Bedrock games
- **DLL Injection**: Windows-specific DLL injection capabilities

### 2. Tauri Commands

The following Tauri commands are exposed to the frontend:

- `get_bedrock_versions()`: Get available Bedrock versions
- `install_bedrock_version(version, instance_name)`: Install a Bedrock version
- `launch_bedrock_instance(instance)`: Launch a Bedrock instance
- `get_bedrock_instances()`: Get all Bedrock instances
- `update_last_played(instance_name)`: Update last played timestamp
- `inject_dll_into_bedrock(process_name, dll_path)`: Inject DLL into Bedrock process

### 3. Vue Frontend Integration

#### Updated Components

- **InstanceCreationModal.vue**: Added Bedrock loader support
- **bedrock.js helper**: New helper functions for Bedrock operations

#### New Features

- Bedrock loader option in instance creation
- Bedrock version selection
- Instance management for Bedrock games

### 4. File Structure

```
modrinth-app/
├── apps/app/src/api/
│   ├── bedrock_loader.rs          # Main Bedrock integration module
│   └── mod.rs                     # Updated to include bedrock_loader
├── apps/app/src/main.rs           # Updated to include bedrock plugin
├── apps/app/Cargo.toml            # Updated with Windows dependencies
└── apps/app-frontend/src/
    ├── components/ui/
    │   └── InstanceCreationModal.vue  # Updated with Bedrock support
    └── helpers/
        └── bedrock.js             # New Bedrock helper functions
```

### 5. Dependencies Added

#### Windows-specific dependencies:
- `windows` crate with Win32 API features
- `anyhow` for error handling
- `xmltree` for XML manifest parsing
- `futures-util` and `tokio-stream` for async operations

### 6. Instance Storage

Bedrock instances are stored in:
- `{instances_dir}/bedrock/{instance_name}/instance.json` - Instance metadata
- `{instances_dir}/bedrock/{instance_name}.json` - Instance metadata copy

### 7. Windows UWP Support

The integration supports:
- UWP app detection and launching
- Manifest patching for multi-instance support
- DLL injection into running Bedrock processes

### 8. Usage

#### Creating a Bedrock Instance

1. Open the instance creation modal
2. Select "bedrock" as the loader
3. Choose a Bedrock version from the dropdown
4. Enter instance name and create

#### Launching Bedrock

1. Select a Bedrock instance
2. Click launch
3. The game will start using UWP activation

#### DLL Injection (Windows only)

```rust
// Inject a DLL into a running Bedrock process
inject_dll_into_bedrock("Minecraft.Windows.exe", "path/to/mod.dll").await?;
```

### 9. Error Handling

The integration includes comprehensive error handling:
- Network errors during downloads
- File system errors during installation
- UWP activation errors
- DLL injection errors

### 10. Platform Support

- **Windows**: Full support including UWP launching and DLL injection
- **Linux/macOS**: Basic support (no UWP or DLL injection)

## Testing

To test the integration:

1. Build the project: `cargo build --package theseus_gui`
2. Run the app: `cargo run --package theseus_gui`
3. Create a Bedrock instance through the UI
4. Test launching the instance

## Future Enhancements

- Support for custom Bedrock versions
- Resource pack management
- World management
- Mod support through DLL injection
- Cross-platform Bedrock launching

## Notes

- DLL injection requires administrator privileges on Windows
- UWP apps must be installed through Microsoft Store
- Manifest patching is required for multi-instance support
- The integration follows the existing Modrinth App architecture patterns