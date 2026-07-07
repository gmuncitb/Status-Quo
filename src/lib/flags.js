/**
 * Country flag utilities for GMUNC's Status Quo.
 *
 * Uses flagcdn.com for high-quality flag images.
 * Maps ISO alpha-3 codes (used in our app) to ISO alpha-2 codes (used by flagcdn).
 */

const ALPHA3_TO_ALPHA2 = {
  AFG: 'af', ALB: 'al', DZA: 'dz', AGO: 'ao', ARG: 'ar', ARM: 'am',
  AUS: 'au', AUT: 'at', AZE: 'az', BHS: 'bs', BHR: 'bh', BGD: 'bd',
  BLR: 'by', BEL: 'be', BOL: 'bo', BIH: 'ba', BWA: 'bw', BRA: 'br',
  BRN: 'bn', BGR: 'bg', BFA: 'bf', BDI: 'bi', KHM: 'kh', CMR: 'cm',
  CAN: 'ca', CAF: 'cf', TCD: 'td', CHL: 'cl', CHN: 'cn', COL: 'co',
  COG: 'cg', COD: 'cd', CRI: 'cr', CIV: 'ci', HRV: 'hr', CUB: 'cu',
  CYP: 'cy', CZE: 'cz', DNK: 'dk', DJI: 'dj', DOM: 'do', ECU: 'ec',
  EGY: 'eg', SLV: 'sv', GNQ: 'gq', ERI: 'er', EST: 'ee', ETH: 'et',
  FJI: 'fj', FIN: 'fi', FRA: 'fr', GAB: 'ga', GMB: 'gm', GEO: 'ge',
  DEU: 'de', GHA: 'gh', GRC: 'gr', GTM: 'gt', GIN: 'gn', GNB: 'gw',
  GUY: 'gy', HTI: 'ht', HND: 'hn', HUN: 'hu', ISL: 'is', IND: 'in',
  IDN: 'id', IRN: 'ir', IRQ: 'iq', IRL: 'ie', ISR: 'il', ITA: 'it',
  JAM: 'jm', JPN: 'jp', JOR: 'jo', KAZ: 'kz', KEN: 'ke', PRK: 'kp',
  KOR: 'kr', KWT: 'kw', KGZ: 'kg', LAO: 'la', LVA: 'lv', LBN: 'lb',
  LSO: 'ls', LBR: 'lr', LBY: 'ly', LTU: 'lt', LUX: 'lu', MKD: 'mk',
  MDG: 'mg', MWI: 'mw', MYS: 'my', MDV: 'mv', MLI: 'ml', MRT: 'mr',
  MUS: 'mu', MEX: 'mx', MDA: 'md', MNG: 'mn', MNE: 'me', MAR: 'ma',
  MOZ: 'mz', MMR: 'mm', NAM: 'na', NPL: 'np', NLD: 'nl', NZL: 'nz',
  NIC: 'ni', NER: 'ne', NGA: 'ng', NOR: 'no', OMN: 'om', PAK: 'pk',
  PSE: 'ps', PAN: 'pa', PNG: 'pg', PRY: 'py', PER: 'pe', PHL: 'ph',
  POL: 'pl', PRT: 'pt', QAT: 'qa', ROU: 'ro', RUS: 'ru', RWA: 'rw',
  SAU: 'sa', SEN: 'sn', SRB: 'rs', SGP: 'sg', SVK: 'sk', SVN: 'si',
  SLB: 'sb', SOM: 'so', ZAF: 'za', SSD: 'ss', ESP: 'es', LKA: 'lk',
  SDN: 'sd', SUR: 'sr', SWZ: 'sz', SWE: 'se', CHE: 'ch', SYR: 'sy',
  TWN: 'tw', TJK: 'tj', TZA: 'tz', THA: 'th', TLS: 'tl', TGO: 'tg',
  TON: 'to', TTO: 'tt', TUN: 'tn', TUR: 'tr', TKM: 'tm', UGA: 'ug',
  UKR: 'ua', ARE: 'ae', GBR: 'gb', USA: 'us', URY: 'uy', UZB: 'uz',
  VUT: 'vu', VEN: 've', VNM: 'vn', YEM: 'ye', ZMB: 'zm', ZWE: 'zw',
  WSM: 'ws', SLE: 'sl', STP: 'st',
};

/**
 * Get the alpha-2 code for a given alpha-3 country code.
 */
export function getAlpha2(alpha3) {
  return ALPHA3_TO_ALPHA2[alpha3] || null;
}

/**
 * Get flag image URL for a country (by alpha-3 code).
 * @param {string} alpha3 - ISO alpha-3 country code (e.g. 'USA')
 * @param {'svg'|'png'} format - Image format
 * @param {number} pngWidth - Width for PNG format (16, 20, 24, 32, 40, 48, 64, 80, 160, 256)
 * @returns {string|null} Flag image URL or null
 */
export function getFlagUrl(alpha3, format = 'svg', pngWidth = 40) {
  const a2 = ALPHA3_TO_ALPHA2[alpha3];
  if (!a2) return null;

  if (format === 'svg') {
    return `https://flagcdn.com/${a2}.svg`;
  }
  return `https://flagcdn.com/w${pngWidth}/${a2}.png`;
}

export default ALPHA3_TO_ALPHA2;
