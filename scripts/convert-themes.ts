import ThemeConverter from '../src/theme-converter';

async function main() {
  console.log('Starting ES-DE theme conversion...');
  
  const converter = new ThemeConverter();
  await converter.convertAllThemes();
  
  console.log('Conversion completed!');
}

main().catch(console.error);
