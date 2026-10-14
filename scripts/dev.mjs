import webpack from 'webpack';
import config from '../webpack.config.js';
// Watch local sources with Webpack; refresh the browser after a successful rebuild.
const compiler = webpack({ ...config, mode: 'development' });
let serving = false;
compiler.watch({}, async (error, stats) => {
    if (error || stats?.hasErrors()) { console.error(error ?? stats.toString({ all: false, errors: true })); return; }
    console.log('Development build ready at http://127.0.0.1:8080');
    if (!serving) { serving = true; await import('./serve.mjs'); }
});
const close = () => compiler.close(() => process.exit());
process.on('SIGINT', close);
process.on('SIGTERM', close);
