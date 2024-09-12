import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';
import { decodeToJSON } from "./lib/marshalUtils.js";

// List of all files to download
const files = [
  "abilities.dat",
  // "attacksRS.dat",
  // "berry_plants.dat",
  // "connections.dat",
  // "encounters.dat",
  // "encounters_modern.dat",
  // "encounters_randomized.dat",
  "items.dat",
  
  // "map_connections.dat",
  // "map_metadata.dat",
  // "messages.dat",
  // "messages_fr.dat",
  // "metadata.dat",
  // "metrics.dat",
  // "move2anim.dat",
  "moves.dat",
  // "phone.dat",
  // "regionals.dat",
  // "regional_dexes.dat",
  // "ribbons.dat",
  // "shadowmoves.dat",
  // "shadow_movesets.dat",
  "species.dat",
  // "townmap.dat",
  // "town_map.dat",
  // "trainerlists.dat",
  // "trainers.dat",
  // "trainers_modern.dat",
  // "trainertypes.dat",
  // "trainer_lists.dat",
  // "trainer_types.dat",
  "types.dat"
];

const copyFiles = [
  "https://github.com/infinitefusion/infinitefusion-e18/blob/main/Data/dex.json",
  "https://github.com/infinitefusion/infinitefusion-e18/blob/main/Data/Scripts/048_Fusion/FusedSpecies.rb",
  "https://github.com/infinitefusion/infinitefusion-e18/blob/main/Data/Scripts/048_Fusion/SplitNames.rb"

] 

// Base URL for the files in the GitHub repository
const baseUrl = 'https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/Data/';

// Directory where the downloaded files will be saved
const outputDir = path.join('lib', 'data');

// Directory where the JSON files will be saved
const jsonOutputDir = path.join('lib', 'data', 'json');

// Ensure the output directories exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(jsonOutputDir)) {
  fs.mkdirSync(jsonOutputDir, { recursive: true });
}

// Function to download a single file
async function downloadFile(fileName) {
    const url = `${baseUrl}${fileName}`;
    const outputPath = path.join(outputDir, fileName);
    try {
      console.log(`Downloading ${fileName}...`);
     
      const response = await fetch(url);
     
      if (!response.ok) {
        console.error(`Failed to download ${fileName}: ${response.statusText}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Write the downloaded file to the output directory
      fs.writeFileSync(outputPath, buffer);
      console.log(`${fileName} has been saved to ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`Error downloading ${fileName}:`, error);
      return null;
    }
  }
  

  
  // Function to download all files and decode them
  async function downloadAndDecodeAllFiles() {
    for (const file of files) {
      const filePath = await downloadFile(file);
      if (filePath) {
        decodeToJSON(`./lib/data/${file}`);
      } else {
        console.log(`Skipping decoding for ${file} due to download failure.`);
      }
    }
    console.log('All files processed.');
  }
  
  // Start downloading and decoding all files
  downloadAndDecodeAllFiles();