use crate::api::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::process::Stdio;
use tokio::fs;

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("bedrock")
        .invoke_handler(tauri::generate_handler![
            bedrock_get_versions,
            bedrock_download_version,
            bedrock_install_version,
            bedrock_create_instance,
            bedrock_run_instance,
            bedrock_list_instances,
            bedrock_remove_instance,
        ])
        .build()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BedrockVersion {
    pub id: String,
    pub url: String,
    pub sha256: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BedrockVersionsResponse {
    pub versions: Vec<BedrockVersion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BedrockInstance {
    pub name: String,
    pub version: String,
    pub path: String,
    pub installed: bool,
    pub appx_path: Option<String>,
}

/// Get available Bedrock versions from the generated version.json
/// Uses the generate_version_json.js script to fetch latest versions
#[tauri::command]
pub async fn bedrock_get_versions() -> Result<BedrockVersionsResponse> {
    // First, try to update versions using the Node.js script
    let script_path = get_script_path("generate_version_json.js").await?;
    
    // Run the Node.js script to update version.json
    let output = Command::new("node")
        .arg(&script_path)
        .current_dir(get_scripts_dir().await?)
        .output();

    match output {
        Ok(output) => {
            if !output.status.success() {
                eprintln!("Warning: Failed to update Bedrock versions: {}", 
                    String::from_utf8_lossy(&output.stderr));
            }
        }
        Err(e) => {
            eprintln!("Warning: Could not run version update script: {}", e);
        }
    }

    // Read the version.json file
    let version_file_path = get_scripts_dir().await?.join("../version.json");
    match fs::read_to_string(&version_file_path).await {
        Ok(content) => {
            let versions: BedrockVersionsResponse = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse version.json: {}", e))?;
            Ok(versions)
        }
        Err(_) => {
            // Return empty list if file doesn't exist
            Ok(BedrockVersionsResponse {
                versions: Vec::new(),
            })
        }
    }
}

/// Download a specific Bedrock version using download_bedrock_appx.js
#[tauri::command]
pub async fn bedrock_download_version(
    version: String,
    window: tauri::Window,
) -> Result<String> {
    let script_path = get_script_path("download_bedrock_appx.js").await?;
    let scripts_dir = get_scripts_dir().await?;
    
    // Create downloads directory if it doesn't exist
    let downloads_dir = scripts_dir.join("../downloads");
    fs::create_dir_all(&downloads_dir).await
        .map_err(|e| format!("Failed to create downloads directory: {}", e))?;

    // Run the download script with the specified version
    let mut child = Command::new("node")
        .arg(&script_path)
        .current_dir(&scripts_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start download script: {}", e))?;

    // Send version to stdin
    if let Some(stdin) = child.stdin.as_mut() {
        use std::io::Write;
        stdin.write_all(format!("{}\n", version).as_bytes())
            .map_err(|e| format!("Failed to send version to script: {}", e))?;
    }

    // Wait for completion and get output
    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait for download script: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Download script failed: {}", stderr).into());
    }
    
    // Emit completion event
    let stdout = String::from_utf8_lossy(&output.stdout);
    let _ = window.emit("bedrock-download-progress", "Download completed successfully!");

    // Return path to downloaded file
    let appx_file = downloads_dir.join(format!("{}.Appx", version));
    Ok(appx_file.to_string_lossy().to_string())
}

/// Install a downloaded Bedrock .appx file using install_bedrock_appx.js
#[tauri::command]
pub async fn bedrock_install_version(
    appx_path: String,
    window: tauri::Window,
) -> Result<()> {
    let script_path = get_script_path("install_bedrock_appx.js").await?;
    let scripts_dir = get_scripts_dir().await?;

    // Run the install script
    let mut child = Command::new("node")
        .arg(&script_path)
        .current_dir(&scripts_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start install script: {}", e))?;

    // Send appx path to stdin (empty string means use latest downloaded)
    if let Some(stdin) = child.stdin.as_mut() {
        use std::io::Write;
        stdin.write_all(format!("{}\n", if appx_path.is_empty() { "" } else { &appx_path }).as_bytes())
            .map_err(|e| format!("Failed to send path to script: {}", e))?;
    }

    // Wait for completion
    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait for install script: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Install script failed: {}", stderr).into());
    }
    
    let _ = window.emit("bedrock-install-progress", "Installation completed successfully!");

    Ok(())
}

/// Create a new Bedrock instance
#[tauri::command]
pub async fn bedrock_create_instance(
    name: String,
    version: String,
    icon: Option<String>,
    window: tauri::Window,
) -> Result<BedrockInstance> {
    // Download the version
    let _ = window.emit("bedrock-creation-status", "Downloading Bedrock version...");
    let appx_path = bedrock_download_version(version.clone(), window.clone()).await?;
    
    // Install the version
    let _ = window.emit("bedrock-creation-status", "Installing Bedrock version...");
    bedrock_install_version(appx_path.clone(), window.clone()).await?;
    
    // Create instance metadata
    let instance = BedrockInstance {
        name: name.clone(),
        version: version.clone(),
        path: format!("bedrock_{}", name.replace(" ", "_").to_lowercase()),
        installed: true,
        appx_path: Some(appx_path),
    };

    // Save instance to configuration
    save_bedrock_instance(&instance).await?;
    
    let _ = window.emit("bedrock-creation-status", "Bedrock instance created successfully!");
    Ok(instance)
}

/// Run a Bedrock instance by launching the installed .appx application
#[tauri::command]
pub async fn bedrock_run_instance(instance_path: String) -> Result<()> {
    // Get the instance
    let instance = load_bedrock_instance(&instance_path).await?;
    
    // Launch Minecraft Bedrock Edition using Windows shell
    // The .appx should be installed as "Microsoft.MinecraftUWP_8wekyb3d8bbwe!App"
    let output = Command::new("cmd")
        .args(&["/C", "start", "minecraft:"])
        .output();

    match output {
        Ok(output) => {
            if !output.status.success() {
                // Fallback: try launching via PowerShell
                let ps_output = Command::new("powershell")
                    .args(&[
                        "-Command",
                        "Get-AppxPackage -Name 'Microsoft.MinecraftUWP' | Invoke-Item"
                    ])
                    .output();
                
                if let Err(e) = ps_output {
                    return Err(format!("Failed to launch Bedrock Edition: {}", e).into());
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to launch Bedrock Edition: {}", e).into());
        }
    }

    Ok(())
}

/// Helper function to get the scripts directory path
async fn get_scripts_dir() -> Result<PathBuf> {
    // Try bundled scripts first (in app directory)
    let bundled_scripts = PathBuf::from("scripts");
    if bundled_scripts.exists() {
        return Ok(bundled_scripts);
    }
    
    // In development, try relative path to original scripts
    let dev_scripts = PathBuf::from("../../../ß¬α¿»Γδ/scripts");
    if dev_scripts.exists() {
        return Ok(dev_scripts);
    }
    
    // Fallback: try in app data directory
    let app_dir = dirs::data_dir()
        .ok_or("Failed to get app data directory")?
        .join("com.modrinth.app");
    
    let app_data_scripts = app_dir.join("scripts");
    Ok(app_data_scripts)
}

/// Helper function to get a specific script path
async fn get_script_path(script_name: &str) -> Result<PathBuf> {
    let scripts_dir = get_scripts_dir().await?;
    Ok(scripts_dir.join(script_name))
}

/// Save Bedrock instance configuration
async fn save_bedrock_instance(instance: &BedrockInstance) -> Result<()> {
    let app_dir = dirs::data_dir()
        .ok_or("Failed to get app data directory")?
        .join("com.modrinth.app");
    
    let bedrock_dir = app_dir.join("bedrock_instances");
    fs::create_dir_all(&bedrock_dir).await
        .map_err(|e| format!("Failed to create bedrock instances directory: {}", e))?;
    
    let instance_file = bedrock_dir.join(format!("{}.json", instance.path));
    let json_content = serde_json::to_string_pretty(instance)
        .map_err(|e| format!("Failed to serialize instance: {}", e))?;
    
    fs::write(&instance_file, json_content).await
        .map_err(|e| format!("Failed to save instance: {}", e))?;
    
    Ok(())
}

/// Load Bedrock instance configuration
async fn load_bedrock_instance(instance_path: &str) -> Result<BedrockInstance> {
    let app_dir = dirs::data_dir()
        .ok_or("Failed to get app data directory")?
        .join("com.modrinth.app");
    
    let instance_file = app_dir.join("bedrock_instances").join(format!("{}.json", instance_path));
    let content = fs::read_to_string(&instance_file).await
        .map_err(|e| format!("Failed to load instance: {}", e))?;
    
    let instance: BedrockInstance = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse instance: {}", e))?;
    
    Ok(instance)
}

/// List all Bedrock instances
#[tauri::command]
pub async fn bedrock_list_instances() -> Result<Vec<BedrockInstance>> {
    let app_dir = dirs::data_dir()
        .ok_or("Failed to get app data directory")?
        .join("com.modrinth.app");
    
    let bedrock_dir = app_dir.join("bedrock_instances");
    
    if !bedrock_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut instances = Vec::new();
    let mut entries = fs::read_dir(&bedrock_dir).await
        .map_err(|e| format!("Failed to read bedrock instances directory: {}", e))?;
    
    while let Some(entry) = entries.next_entry().await
        .map_err(|e| format!("Failed to read directory entry: {}", e))? {
        
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            match fs::read_to_string(&path).await {
                Ok(content) => {
                    if let Ok(instance) = serde_json::from_str::<BedrockInstance>(&content) {
                        instances.push(instance);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to read instance file {:?}: {}", path, e);
                }
            }
        }
    }
    
    Ok(instances)
}

/// Remove a Bedrock instance
#[tauri::command]
pub async fn bedrock_remove_instance(instance_path: String) -> Result<()> {
    let app_dir = dirs::data_dir()
        .ok_or("Failed to get app data directory")?
        .join("com.modrinth.app");
    
    let instance_file = app_dir.join("bedrock_instances").join(format!("{}.json", instance_path));
    
    if instance_file.exists() {
        fs::remove_file(&instance_file).await
            .map_err(|e| format!("Failed to remove instance file: {}", e))?;
    }
    
    Ok(())
}