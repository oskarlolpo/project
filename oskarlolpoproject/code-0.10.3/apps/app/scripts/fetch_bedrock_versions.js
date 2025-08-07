const fs = require('fs');
const path = require('path');
const got = require('got').default;

const BEDROCK_VERSION_URL = 'https://api.minecraftservices.com/minecraft/version/bedrock';
const VERSION_JSON_PATH = path.join(__dirname, '../bedrock_versions.json');

async function fetchBedrockVersions() {
  try {
    console.log('Fetching Bedrock versions from Mojang API...');
    
    const response = await got(BEDROCK_VERSION_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      timeout: {
        request: 30000,
        connect: 10000,
        response: 30000
      }
    });

    const data = JSON.parse(response.body);
    
    // Transform the data to match our expected format
    const transformedVersions = data.versions.map(version => ({
      id: version.id,
      type: version.type,
      release_time: version.release_time,
      url: version.url,
      platform: version.platform || 'windows',
      architecture: version.architecture || 'x64',
      sha1: version.sha1,
      compliance_level: version.compliance_level || 0
    }));

    const result = {
      latest: data.latest,
      versions: transformedVersions,
      fetched_at: new Date().toISOString()
    };

    // Save to file
    fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(result, null, 2));
    
    console.log(`Successfully fetched ${transformedVersions.length} Bedrock versions`);
    console.log(`Latest release: ${data.latest.release}`);
    console.log(`Latest beta: ${data.latest.beta}`);
    console.log(`Latest alpha: ${data.latest.alpha}`);
    
    return result;
  } catch (error) {
    console.error('Error fetching Bedrock versions:', error.message);
    
    // If API fails, try to load from cache
    if (fs.existsSync(VERSION_JSON_PATH)) {
      console.log('Loading cached Bedrock versions...');
      const cached = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf-8'));
      return cached;
    }
    
    throw error;
  }
}

async function getBedrockVersionsByType(versionType = 'release') {
  const versions = await fetchBedrockVersions();
  
  return versions.versions.filter(version => version.type === versionType);
}

async function getLatestBedrockVersion(versionType = 'release') {
  const versions = await fetchBedrockVersions();
  
  const latestId = versions.latest[versionType];
  return versions.versions.find(version => version.id === latestId);
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'fetch':
      fetchBedrockVersions()
        .then(() => process.exit(0))
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
      break;
      
    case 'latest':
      const type = process.argv[3] || 'release';
      getLatestBedrockVersion(type)
        .then(version => {
          console.log(JSON.stringify(version, null, 2));
          process.exit(0);
        })
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
      break;
      
    case 'list':
      const filterType = process.argv[3];
      if (filterType) {
        getBedrockVersionsByType(filterType)
          .then(versions => {
            console.log(JSON.stringify(versions, null, 2));
            process.exit(0);
          })
          .catch(err => {
            console.error(err);
            process.exit(1);
          });
      } else {
        fetchBedrockVersions()
          .then(versions => {
            console.log(JSON.stringify(versions, null, 2));
            process.exit(0);
          })
          .catch(err => {
            console.error(err);
            process.exit(1);
          });
      }
      break;
      
    default:
      console.log('Usage:');
      console.log('  node fetch_bedrock_versions.js fetch          - Fetch all versions');
      console.log('  node fetch_bedrock_versions.js latest [type]  - Get latest version (release/beta/alpha)');
      console.log('  node fetch_bedrock_versions.js list [type]    - List all versions (optionally filtered by type)');
      process.exit(1);
  }
}

module.exports = {
  fetchBedrockVersions,
  getBedrockVersionsByType,
  getLatestBedrockVersion
}; 