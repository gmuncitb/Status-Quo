const fs = require('fs');
const topojson = require('topojson-client');

// Read a local version or fetch it.
// Let's fetch it using standard https
const https = require('https');

const url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const world = JSON.parse(data);
    const countries = topojson.feature(world, world.objects.countries);
    
    // Find Australia and New Zealand
    const aus = countries.features.find(f => f.properties.name === 'Australia');
    const nzl = countries.features.find(f => f.properties.name === 'New Zealand');
    const png = countries.features.find(f => f.properties.name === 'Papua New Guinea');

    console.log('Australia Feature ID:', aus ? aus.id : 'not found', typeof (aus ? aus.id : ''));
    console.log('New Zealand Feature ID:', nzl ? nzl.id : 'not found', typeof (nzl ? nzl.id : ''));
    console.log('Papua New Guinea Feature ID:', png ? png.id : 'not found', typeof (png ? png.id : ''));
    
    // List some other feature names and IDs
    console.log('First 5 countries in topojson:');
    countries.features.slice(0, 5).forEach(f => {
      console.log(`- ${f.properties.name}: ID=${f.id} (${typeof f.id})`);
    });
  });
});
