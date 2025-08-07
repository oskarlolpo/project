# Bedrock Edition Integration for Modrinth Launcher

## Overview

This integration adds support for Minecraft Bedrock Edition to the Modrinth Launcher, allowing users to download, install, and manage Bedrock instances alongside existing Java Edition instances.

## Features

- ✅ **Bedrock Version Management**: Automatically fetch latest Bedrock versions from OnixClient repository
- ✅ **Automated Download**: Multi-threaded download of .appx packages with progress tracking
- ✅ **PowerShell Installation**: Automated installation via Windows PowerShell
- ✅ **Instance Management**: Create, run, and delete Bedrock instances
- ✅ **Unified Interface**: Seamless integration with existing launcher UI

## Architecture

### Backend (Rust/Tauri)
- **Module**: `apps/app/src/api/bedrock.rs`
- **Plugin**: Tauri plugin system with dedicated Bedrock API
- **Scripts Integration**: Leverages existing Node.js scripts for version management
- **Storage**: JSON-based instance configuration in app data directory

### Frontend (Vue.js)
- **Helper**: `apps/app-frontend/src/helpers/bedrock.js`
- **UI Integration**: Modified `InstanceCreationModal.vue` for Bedrock support
- **Display**: Updated instance grid to show and manage Bedrock instances

### Scripts
- **generate_version_json.js**: Fetches versions from OnixClient/Mojang APIs
- **download_bedrock_appx.js**: Downloads .appx packages with multi-part support
- **install_bedrock_appx.js**: Installs .appx via PowerShell
- **fetch_bedrock_versions.js**: CLI utility for version management

## Usage

### Creating a Bedrock Instance

1. Click "Create new instance" in the launcher
2. Select "bedrock" from the loader dropdown
3. Choose a Bedrock version from the list
4. Enter instance name and optional icon
5. Click "Create" to download and install

### Running Bedrock Instances

- Bedrock instances appear alongside Java instances in the library
- Click the play button to launch Minecraft Bedrock Edition
- The launcher will attempt to start the installed .appx application

### Managing Bedrock Instances

- **View**: Bedrock instances are marked with "bedrock" loader type
- **Delete**: Right-click and select delete to remove instance
- **Run**: Single-click play button to launch

## System Requirements

- **Platform**: Windows only (Bedrock Edition limitation)
- **Permissions**: Administrator privileges required for .appx installation
- **Dependencies**: Node.js for script execution
- **Network**: Internet connection for version fetching and downloads

## API Reference

### Tauri Commands

```rust
// Get available Bedrock versions
bedrock_get_versions() -> BedrockVersionsResponse

// Download specific version
bedrock_download_version(version: String) -> String

// Install downloaded .appx
bedrock_install_version(appx_path: String) -> ()

// Create new Bedrock instance
bedrock_create_instance(name: String, version: String, icon: Option<String>) -> BedrockInstance

// Run Bedrock instance
bedrock_run_instance(instance_path: String) -> ()

// List all Bedrock instances
bedrock_list_instances() -> Vec<BedrockInstance>

// Remove Bedrock instance
bedrock_remove_instance(instance_path: String) -> ()
```

### Data Structures

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BedrockVersion {
    pub id: String,        // Version ID (e.g., "1.21.94")
    pub url: String,       // Download URL for .appx
    pub sha256: Option<String>, // File hash (optional)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BedrockInstance {
    pub name: String,      // User-defined instance name
    pub version: String,   // Bedrock version
    pub path: String,      // Unique instance identifier
    pub installed: bool,   // Installation status
    pub appx_path: Option<String>, // Path to downloaded .appx
}
```

### Frontend Helpers

```javascript
// Get available versions
const versions = await get_bedrock_versions()

// Create instance with progress callbacks
const instance = await create_bedrock_instance(
  name, 
  version, 
  icon, 
  (status) => console.log(status)
)

// Run instance
await run_bedrock_instance(instancePath)

// List all instances
const instances = await list_bedrock_instances()
```

## Implementation Details

### Version Management
- Versions are fetched from OnixClient GitHub repository
- JSON metadata is cached locally for offline access
- Automatic updates on launcher startup (with fallback)

### Download Process
1. Script generates/updates version.json from GitHub API
2. User selects version from UI dropdown
3. Multi-part download with progress tracking
4. File verification (SHA256 when available)

### Installation Process
1. PowerShell script executes `Add-AppxPackage` command
2. Requires administrator privileges
3. Installs to Windows Store app location
4. Registered as UWP application

### Launch Process
1. Attempts `minecraft:` protocol launch
2. Fallback to PowerShell `Get-AppxPackage` invocation
3. Launches installed Bedrock Edition

## Configuration

### Script Locations
- **Development**: `../../../ß¬α¿»Γδ/scripts`
- **Bundled**: `scripts/` (relative to app executable)
- **App Data**: `%APPDATA%/com.modrinth.app/scripts`

### Instance Storage
- **Location**: `%APPDATA%/com.modrinth.app/bedrock_instances/`
- **Format**: JSON files named `{instance_path}.json`
- **Content**: BedrockInstance serialized data

## Error Handling

### Common Issues
1. **Node.js Missing**: Scripts require Node.js runtime
2. **Permission Denied**: .appx installation needs admin rights
3. **Network Errors**: Version fetching/downloading failures
4. **PowerShell Restricted**: Execution policy may block scripts

### Troubleshooting
- Check Windows execution policy: `Get-ExecutionPolicy`
- Verify Node.js installation: `node --version`
- Run launcher as administrator for .appx installation
- Check network connectivity for downloads

## Future Enhancements

### Planned Features
- [ ] **Mod Support**: Integration with Bedrock addon ecosystem
- [ ] **World Management**: Import/export Bedrock worlds
- [ ] **Multiplayer**: Server browser for Bedrock servers
- [ ] **Resource Packs**: Bedrock resource pack management
- [ ] **Backup System**: Automated world/settings backup

### Technical Improvements
- [ ] **Progress Streaming**: Real-time download progress
- [ ] **Retry Logic**: Automatic retry for failed downloads
- [ ] **Checksums**: Enhanced file integrity verification
- [ ] **Cleanup**: Automatic cleanup of temporary files
- [ ] **Logging**: Enhanced logging for debugging

## Contributing

When contributing to Bedrock integration:

1. Test on Windows systems only
2. Ensure administrator privileges for testing
3. Verify Node.js script compatibility
4. Test with multiple Bedrock versions
5. Check PowerShell execution policies

## License

This integration follows the same license as the main Modrinth project. The OnixClient scripts maintain their original licensing.