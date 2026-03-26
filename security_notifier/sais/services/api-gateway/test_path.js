const path = require('path');
const p = path.resolve(__dirname, '../shared/config');
console.log('Resolving to:', p);
const { loadSharedConfig } = require(p);
console.log('Loaded config!');
const cfg = loadSharedConfig(process.env);
console.log('Parsed config:', cfg.SERVICE_NAME);
