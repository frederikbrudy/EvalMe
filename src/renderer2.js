// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

require('./assets/imports')
require('./assets/ex-links')
require('./assets/nav')
require('./assets/demo-btns')
// require('./assets/code-blocks')
require('./assets/normalize-shortcuts')
require('./js/chartjs/Chart.bundle.min')
require('./evalme-module')