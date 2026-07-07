const fs = require('fs');
const topojson = require('topojson-client');

async function main() {
  const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  console.log('Fetching topojson from:', url);
  const response = await fetch(url);
  const world = await response.json();
  
  // Extract features
  const countries = topojson.feature(world, world.objects.countries);
  
  const map = {};
  countries.features.forEach(f => {
    map[f.id] = f.properties.name;
  });
  
  console.log('Actual TopoJSON countries (ID -> Name):');
  console.log(JSON.stringify(map, null, 2));
}

main().catch(console.error);
