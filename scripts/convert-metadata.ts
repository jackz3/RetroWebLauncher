import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

// List of systems to process (corrected filenames)
const systems: string[] = [
  'cps', 'cps1', 'cps2', 'cps3', 'famicom', 'fba', 'sfc', 'megadrive',
  'gamegear', 'genesis', 'sega32x', 'psx', 'colecovision', 'pc88', 'c64',
  'snes', 'nes', 'gba', 'gb', 'gbc', 'genesis', 'neogeo', 'atarilynx', 'ngp', 'pcengine', 'virtualboy', 'wonderswan', 'mame', 'arcade', 'dos',
  'arduboy', 'chailove', 'gameandwatch', 'lowresnx', 'lutro', 'macintosh', 'palm', '3do', 'doom', 'pico8', 'scummvm', 'j2me', 'tic80', 'quake', 'uzebox', 'vectrex', 'wasm4', 'x1'
];

// Define the metadata structure
interface SystemMetadata {
  systemName: string;
  systemDescription: string;
  systemManufacturer: string;
  systemReleaseYear: string;
  systemReleaseDate: string;
  systemReleaseDateFormated: string;
  systemHardwareType: string;
  systemCoverSize: string;
  systemCoverSizeType: string;
  systemColor: string;
  systemCartSize: string;
}

interface Metadata {
  [key: string]: SystemMetadata;
}

// Function to parse XML file and extract metadata
async function parseXmlFile(filePath: string): Promise<{ [key: string]: SystemMetadata } | null> {
  try {
    const xmlData: string = fs.readFileSync(filePath, 'utf8');
    const result: any = await xml2js.parseStringPromise(xmlData, { explicitArray: false });
    
    // Extract system name from filename
    const systemName: string = path.basename(filePath, '.xml');
    
    // Extract variables from the default language section (not in <language> tags)
    const variables: any = result.theme.variables || {};
    
    // Create a clean metadata object with only the essential fields
    const metadata: SystemMetadata = {
      systemName: variables.systemName || systemName,
      systemDescription: variables.systemDescription || '',
      systemManufacturer: variables.systemManufacturer || '',
      systemReleaseYear: variables.systemReleaseYear || '',
      systemReleaseDate: variables.systemReleaseDate || '',
      systemReleaseDateFormated: variables.systemReleaseDateFormated || '',
      systemHardwareType: variables.systemHardwareType || '',
      systemCoverSize: variables.systemCoverSize || '',
      systemCoverSizeType: variables.systemCoverSizeType || '',
      systemColor: variables.systemColor || '',
      systemCartSize: variables.systemCartSize || ''
    };
    
    return { [systemName]: metadata };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

// Main function to process all systems
async function main(): Promise<void> {
  const metadata: Metadata = {};
  
  for (const system of systems) {
    const filePath: string = path.join('es-de_repo', 'system-metadata', `${system}.xml`);
    
    if (fs.existsSync(filePath)) {
      console.log(`Processing ${system}...`);
      const systemMetadata = await parseXmlFile(filePath);
      if (systemMetadata) {
        Object.assign(metadata, systemMetadata);
      }
    } else {
      console.warn(`File not found: ${filePath}`);
    }
  }
  
  // Write the combined metadata to a JSON file
  const outputPath: string = path.join('src', 'metadata.json');
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  console.log(`Metadata successfully written to ${outputPath}`);
}

main().catch(console.error);