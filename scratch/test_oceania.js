const d3 = require('d3');

// Projection parameters
const rotation = [-135, 25, 0];
const scale = 220 * 1.8; // 396
const internalWidth = 800;
const internalHeight = 800;

const projection = d3
  .geoOrthographic()
  .scale(scale)
  .translate([internalWidth / 2, internalHeight / 2])
  .clipAngle(90)
  .rotate(rotation);

// Centroids for Australia and New Zealand
// Australia approx: 133 E, 25 S
// New Zealand approx: 172 E, 41 S
const ausCentroid = [133, -25];
const nzlCentroid = [172, -41];

const ausProjected = projection(ausCentroid);
const nzlProjected = projection(nzlCentroid);

console.log('Australia Projected:', ausProjected);
console.log('New Zealand Projected:', nzlProjected);

// Calculate D3 distance from center of projection
const center = projection.invert([internalWidth / 2, internalHeight / 2]);
console.log('Center of Projection:', center);

const ausDist = d3.geoDistance(ausCentroid, center);
const nzlDist = d3.geoDistance(nzlCentroid, center);

console.log('Australia Distance (rad):', ausDist, 'Visible:', ausDist < Math.PI / 2);
console.log('New Zealand Distance (rad):', nzlDist, 'Visible:', nzlDist < Math.PI / 2);
