/**
 * Bedrock Edition API calls for Modrinth Launcher
 * Integrates with the Tauri Bedrock plugin to manage Bedrock instances
 */
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

/**
 * Get available Bedrock versions from OnixClient repository
 * @returns {Promise<Object>} Object containing versions array
 */
export async function get_bedrock_versions() {
  return await invoke('plugin:bedrock|bedrock_get_versions')
}

/**
 * Download a specific Bedrock version
 * @param {string} version - The version to download (e.g., "1.21.94")
 * @param {Function} onProgress - Callback for download progress updates
 * @returns {Promise<string>} Path to downloaded .appx file
 */
export async function download_bedrock_version(version, onProgress = null) {
  // Set up progress listeners if callback provided
  let unlistenProgress = null
  let unlistenError = null

  if (onProgress) {
    unlistenProgress = await listen('bedrock-download-progress', (event) => {
      onProgress({ type: 'progress', data: event.payload })
    })

    unlistenError = await listen('bedrock-download-error', (event) => {
      onProgress({ type: 'error', data: event.payload })
    })
  }

  try {
    const result = await invoke('plugin:bedrock|bedrock_download_version', { 
      version 
    })
    
    return result
  } finally {
    // Clean up listeners
    if (unlistenProgress) unlistenProgress()
    if (unlistenError) unlistenError()
  }
}

/**
 * Install a downloaded Bedrock .appx file
 * @param {string} appxPath - Path to the .appx file (empty string for latest)
 * @param {Function} onProgress - Callback for installation progress updates
 * @returns {Promise<void>}
 */
export async function install_bedrock_version(appxPath = '', onProgress = null) {
  // Set up progress listeners if callback provided
  let unlistenProgress = null
  let unlistenError = null

  if (onProgress) {
    unlistenProgress = await listen('bedrock-install-progress', (event) => {
      onProgress({ type: 'progress', data: event.payload })
    })

    unlistenError = await listen('bedrock-install-error', (event) => {
      onProgress({ type: 'error', data: event.payload })
    })
  }

  try {
    await invoke('plugin:bedrock|bedrock_install_version', { 
      appxPath 
    })
  } finally {
    // Clean up listeners
    if (unlistenProgress) unlistenProgress()
    if (unlistenError) unlistenError()
  }
}

/**
 * Create a new Bedrock instance
 * @param {string} name - Instance name
 * @param {string} version - Bedrock version to use
 * @param {string|null} icon - Optional icon path
 * @param {Function} onStatus - Callback for status updates
 * @returns {Promise<Object>} Created instance object
 */
export async function create_bedrock_instance(name, version, icon = null, onStatus = null) {
  // Set up status listener if callback provided
  let unlistenStatus = null

  if (onStatus) {
    unlistenStatus = await listen('bedrock-creation-status', (event) => {
      onStatus(event.payload)
    })
  }

  try {
    const instance = await invoke('plugin:bedrock|bedrock_create_instance', {
      name,
      version,
      icon
    })
    
    return instance
  } finally {
    // Clean up listener
    if (unlistenStatus) unlistenStatus()
  }
}

/**
 * Run a Bedrock instance
 * @param {string} instancePath - Path/ID of the instance to run
 * @returns {Promise<void>}
 */
export async function run_bedrock_instance(instancePath) {
  return await invoke('plugin:bedrock|bedrock_run_instance', { 
    instancePath 
  })
}

/**
 * Get list of all Bedrock instances
 * @returns {Promise<Array>} Array of Bedrock instances
 */
export async function list_bedrock_instances() {
  return await invoke('plugin:bedrock|bedrock_list_instances')
}

/**
 * Remove a Bedrock instance
 * @param {string} instancePath - Path/ID of the instance to remove
 * @returns {Promise<void>}
 */
export async function remove_bedrock_instance(instancePath) {
  return await invoke('plugin:bedrock|bedrock_remove_instance', { 
    instancePath 
  })
}

/**
 * Check if Bedrock is supported on this system
 * @returns {boolean} True if Bedrock is supported (Windows only)
 */
export function is_bedrock_supported() {
  // Bedrock is only supported on Windows
  return window.__TAURI_INTERNALS__.metadata.target === 'windows'
}