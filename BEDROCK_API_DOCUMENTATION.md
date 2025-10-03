# Bedrock API Documentation

## Overview

This document provides comprehensive documentation for the Bedrock Edition integration API in Modrinth App. The API is organized into several modules, each handling specific aspects of Bedrock functionality.

## Table of Contents

1. [Core Modules](#core-modules)
2. [API Reference](#api-reference)
3. [Data Structures](#data-structures)
4. [Error Handling](#error-handling)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Best Practices](#best-practices)

## Core Modules

### 1. bedrock_loader.rs
Main module for Bedrock version management, installation, and launching.

**Key Components:**
- `BedrockVersion`: Version information structure
- `BedrockInstance`: Instance configuration structure
- `BedrockDownloader`: Download management
- `BedrockVersionManager`: Version detection and management
- `BedrockInstaller`: Installation management
- `BedrockLauncher`: Game launching

### 2. bedrock_resources.rs
Resource and world management for Bedrock instances.

**Key Components:**
- `ResourcePack`: Resource pack information
- `BedrockWorld`: World information
- `BedrockSettings`: Instance settings
- `BedrockResourceManager`: Resource pack management
- `BedrockWorldManager`: World management

### 3. bedrock_logging.rs
Comprehensive logging and error handling system.

**Key Components:**
- `BedrockLogEntry`: Log entry structure
- `LogLevel`: Log level enumeration
- `BedrockOperationResult`: Operation result wrapper
- `BedrockError`: Detailed error information
- `BedrockLogger`: Instance-specific logging
- `BedrockErrorHandler`: Error handling and categorization

### 4. bedrock_tests.rs
Comprehensive test suite for all Bedrock functionality.

## API Reference

### Bedrock Loader API

#### `get_bedrock_versions() -> Result<Vec<BedrockVersion>>`
Retrieves all available Bedrock versions.

**Returns:**
- `Vec<BedrockVersion>`: List of available versions

**Example:**
```rust
let versions = get_bedrock_versions().await?;
for version in versions {
    println!("Version: {} {}", version.name, version.version);
}
```

#### `install_bedrock_version(version: BedrockVersion, instance_name: String) -> Result<BedrockOperationResult<BedrockInstance>>`
Installs a Bedrock version as a new instance.

**Parameters:**
- `version`: The Bedrock version to install
- `instance_name`: Name for the new instance

**Returns:**
- `BedrockOperationResult<BedrockInstance>`: Installation result with detailed error handling

**Example:**
```rust
let version = BedrockVersion {
    name: "Microsoft.MinecraftUWP".to_string(),
    version: "1.20.0.0".to_string(),
    edition: "Microsoft.MinecraftUWP".to_string(),
    path: None,
};

let result = install_bedrock_version(version, "My Bedrock Instance".to_string()).await?;
if result.success {
    println!("Instance created: {:?}", result.data);
} else {
    println!("Error: {:?}", result.error);
}
```

#### `launch_bedrock_instance(instance: BedrockInstance) -> Result<Option<u32>>`
Launches a Bedrock instance.

**Parameters:**
- `instance`: The instance to launch

**Returns:**
- `Option<u32>`: Process ID if successful, None otherwise

**Example:**
```rust
let pid = launch_bedrock_instance(instance).await?;
if let Some(process_id) = pid {
    println!("Launched with PID: {}", process_id);
}
```

#### `get_bedrock_instances() -> Result<Vec<BedrockInstance>>`
Retrieves all Bedrock instances.

**Returns:**
- `Vec<BedrockInstance>`: List of all instances

#### `update_last_played(instance_name: &str) -> Result<()>`
Updates the last played timestamp for an instance.

#### `inject_dll_into_bedrock(process_name: &str, dll_path: String) -> Result<()>`
Injects a DLL into a running Bedrock process (Windows only).

### Bedrock Resources API

#### `get_bedrock_resource_packs(instance_name: &str) -> Result<Vec<ResourcePack>>`
Gets all resource packs for an instance.

#### `set_bedrock_resource_pack_enabled(instance_name: &str, pack_name: &str, enabled: bool) -> Result<()>`
Enables or disables a resource pack.

#### `set_bedrock_resource_pack_priority(instance_name: &str, pack_name: &str, priority: i32) -> Result<()>`
Sets the priority of a resource pack.

#### `get_bedrock_worlds(instance_name: &str) -> Result<Vec<BedrockWorld>>`
Gets all worlds for an instance.

#### `create_bedrock_world(instance_name: &str, world_name: &str, game_mode: &str, difficulty: &str) -> Result<BedrockWorld>`
Creates a new world.

#### `delete_bedrock_world(instance_name: &str, world_id: &str) -> Result<()>`
Deletes a world.

#### `get_bedrock_settings(instance_name: &str) -> Result<BedrockSettings>`
Gets instance settings.

#### `save_bedrock_settings(instance_name: &str, settings: BedrockSettings) -> Result<()>`
Saves instance settings.

### Bedrock Logging API

#### `get_bedrock_logs(instance_name: &str, limit: Option<usize>) -> Result<Vec<BedrockLogEntry>>`
Gets recent log entries for an instance.

#### `clear_bedrock_logs(instance_name: &str) -> Result<()>`
Clears log entries for an instance.

#### `get_bedrock_log_file_path(instance_name: &str) -> Result<String>`
Gets the path to the log file for an instance.

## Data Structures

### BedrockVersion
```rust
pub struct BedrockVersion {
    pub name: String,           // Version name (e.g., "Microsoft.MinecraftUWP")
    pub version: String,        // Version number (e.g., "1.20.0.0")
    pub edition: String,        // Edition type
    pub path: Option<String>,   // Optional path for custom versions
}
```

### BedrockInstance
```rust
pub struct BedrockInstance {
    pub name: String,                                    // Instance name
    pub version: BedrockVersion,                        // Version information
    pub game_directory: PathBuf,                         // Game directory path
    pub created_at: chrono::DateTime<chrono::Utc>,     // Creation timestamp
    pub last_played: Option<chrono::DateTime<chrono::Utc>>, // Last played timestamp
}
```

### ResourcePack
```rust
pub struct ResourcePack {
    pub name: String,                    // Pack name
    pub description: Option<String>,     // Pack description
    pub version: String,                 // Pack version
    pub uuid: String,                    // Pack UUID
    pub path: PathBuf,                   // Pack directory path
    pub enabled: bool,                   // Whether pack is enabled
    pub priority: i32,                   // Load priority (higher = loaded first)
}
```

### BedrockWorld
```rust
pub struct BedrockWorld {
    pub name: String,                                    // World name
    pub world_id: String,                                // Unique world identifier
    pub path: PathBuf,                                   // World directory path
    pub last_played: Option<chrono::DateTime<chrono::Utc>>, // Last played timestamp
    pub size_bytes: u64,                                 // World size in bytes
    pub game_mode: String,                               // Game mode (Survival, Creative, etc.)
    pub difficulty: String,                              // Difficulty level
    pub spawn_x: f64,                                    // Spawn X coordinate
    pub spawn_y: f64,                                    // Spawn Y coordinate
    pub spawn_z: f64,                                    // Spawn Z coordinate
}
```

### BedrockSettings
```rust
pub struct BedrockSettings {
    pub instance_name: String,           // Instance name
    pub game_directory: PathBuf,         // Game directory
    pub java_executable: Option<PathBuf>, // Java executable path
    pub jvm_args: Vec<String>,          // JVM arguments
    pub game_args: Vec<String>,         // Game arguments
    pub memory: u64,                     // Memory allocation in MB
    pub width: u32,                      // Window width
    pub height: u32,                     // Window height
    pub fullscreen: bool,                // Fullscreen mode
    pub quick_play_path: Option<String>, // Quick play path
    pub quick_play_singleplayer: Option<String>, // Quick play singleplayer
    pub quick_play_multiplayer: Option<String>,  // Quick play multiplayer
    pub quick_play_realms: Option<String>,       // Quick play realms
}
```

### BedrockOperationResult
```rust
pub struct BedrockOperationResult<T> {
    pub success: bool,                   // Whether operation succeeded
    pub data: Option<T>,                 // Result data if successful
    pub error: Option<BedrockError>,    // Error information if failed
    pub timestamp: chrono::DateTime<chrono::Utc>, // Operation timestamp
    pub operation: String,               // Operation name
    pub instance_name: Option<String>,   // Associated instance name
}
```

### BedrockError
```rust
pub struct BedrockError {
    pub code: String,                    // Error code
    pub message: String,                 // Error message
    pub details: Option<String>,         // Additional details
    pub suggestion: Option<String>,       // Suggested resolution
    pub context: Option<serde_json::Value>, // Additional context
}
```

## Error Handling

The Bedrock API uses a comprehensive error handling system with the following features:

### Error Categories
- `NOT_FOUND`: Resource not found
- `PERMISSION_DENIED`: Access denied
- `NETWORK_ERROR`: Network-related errors
- `DISK_FULL`: Insufficient disk space
- `CORRUPT_DATA`: Corrupted files
- `TIMEOUT`: Operation timeout
- `UNKNOWN_ERROR`: Unexpected errors

### Error Handling Flow
1. **Error Detection**: Errors are caught at the operation level
2. **Error Categorization**: Errors are automatically categorized
3. **Error Logging**: All errors are logged with context
4. **User-Friendly Messages**: Errors include suggestions for resolution
5. **Detailed Context**: Additional context is provided for debugging

### Example Error Handling
```rust
let result = install_bedrock_version(version, instance_name).await?;
if !result.success {
    if let Some(error) = result.error {
        match error.code.as_str() {
            "PERMISSION_DENIED" => {
                println!("Permission denied: {}", error.message);
                if let Some(suggestion) = error.suggestion {
                    println!("Suggestion: {}", suggestion);
                }
            }
            "DISK_FULL" => {
                println!("Insufficient disk space: {}", error.message);
            }
            _ => {
                println!("Unexpected error: {}", error.message);
            }
        }
    }
}
```

## Usage Examples

### Creating and Managing Instances

```rust
// Get available versions
let versions = get_bedrock_versions().await?;

// Install a version
let version = versions.first().unwrap().clone();
let result = install_bedrock_version(version, "My Instance".to_string()).await?;

if result.success {
    let instance = result.data.unwrap();
    
    // Launch the instance
    let pid = launch_bedrock_instance(instance.clone()).await?;
    
    // Update last played time
    update_last_played(&instance.name).await?;
}
```

### Managing Resource Packs

```rust
// Get resource packs
let packs = get_bedrock_resource_packs("My Instance").await?;

// Enable/disable packs
for pack in &packs {
    set_bedrock_resource_pack_enabled("My Instance", &pack.name, true).await?;
    set_bedrock_resource_pack_priority("My Instance", &pack.name, 10).await?;
}
```

### Managing Worlds

```rust
// Get worlds
let worlds = get_bedrock_worlds("My Instance").await?;

// Create a new world
let new_world = create_bedrock_world(
    "My Instance",
    "My New World",
    "Survival",
    "Normal"
).await?;

// Delete a world
delete_bedrock_world("My Instance", &new_world.world_id).await?;
```

### Managing Settings

```rust
// Get current settings
let mut settings = get_bedrock_settings("My Instance").await?;

// Modify settings
settings.memory = 4096;
settings.fullscreen = true;
settings.jvm_args = vec!["-Xmx4G".to_string()];

// Save settings
save_bedrock_settings("My Instance", settings).await?;
```

### Logging and Error Handling

```rust
// Get recent logs
let logs = get_bedrock_logs("My Instance", Some(50)).await?;

for log in logs {
    println!("[{}] {}: {}", log.timestamp, log.level, log.message);
}

// Clear logs
clear_bedrock_logs("My Instance").await?;
```

## Testing

The API includes comprehensive tests covering:

### Unit Tests
- Data structure creation and validation
- JSON serialization/deserialization
- Error handling and categorization
- Log level formatting
- Operation result creation

### Integration Tests
- Resource pack management workflow
- World management workflow
- Logging workflow
- Error handling workflow

### Running Tests
```bash
# Run all Bedrock tests
cargo test bedrock

# Run specific test module
cargo test bedrock_tests

# Run with output
cargo test bedrock -- --nocapture
```

## Best Practices

### 1. Error Handling
- Always check operation results for success/failure
- Use error suggestions to provide user guidance
- Log errors with appropriate context
- Handle different error categories appropriately

### 2. Resource Management
- Always clean up resources after operations
- Use proper file permissions
- Handle concurrent access to resources
- Validate input parameters

### 3. Performance
- Use async operations for I/O
- Implement proper caching for frequently accessed data
- Batch operations when possible
- Monitor memory usage for large operations

### 4. Security
- Validate all input parameters
- Use proper file path handling
- Implement access controls for sensitive operations
- Log security-relevant events

### 5. Logging
- Use appropriate log levels
- Include relevant context in log messages
- Implement log rotation for long-running applications
- Monitor log file sizes

## Frontend Integration

### JavaScript/Vue.js Integration

The API is designed to work seamlessly with the Vue.js frontend:

```javascript
// Get Bedrock instances
const instances = await invoke('plugin:bedrock_loader|get_bedrock_instances');

// Install a version
const result = await invoke('plugin:bedrock_loader|install_bedrock_version', {
    version: selectedVersion,
    instance_name: 'My Instance'
});

// Handle result
if (result.success) {
    console.log('Instance created:', result.data);
} else {
    console.error('Error:', result.error);
}
```

### Helper Functions

The frontend includes helper functions for common operations:

```javascript
import { 
    get_bedrock_instances,
    create_bedrock_instance,
    formatFileSize,
    formatRelativeTime 
} from '@/helpers/bedrock';

// Use helper functions
const instances = await get_bedrock_instances();
const size = formatFileSize(1024 * 1024); // "1.0 MB"
const time = formatRelativeTime(new Date()); // "Just now"
```

## Conclusion

The Bedrock API provides a comprehensive solution for managing Minecraft Bedrock Edition instances within Modrinth App. With robust error handling, detailed logging, and extensive testing, it offers a reliable foundation for Bedrock Edition integration.

For additional support or questions, refer to the main integration documentation or the test suite for usage examples.