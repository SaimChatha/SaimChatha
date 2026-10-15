const fs=require('fs'),path=require('path');
const files={"cases.js": "cases.js", "icon.svg": "icon.svg", "index.html": "index.html", "styles.css": "styles.css", "app.js": "app.js", "data.js": "atlas/data.js", "atlas-index.html": "atlas/index.html", "atlas.css": "atlas/atlas.css", "atlas.js": "atlas/atlas.js"};
for(const [source,target] of Object.entries(files)){const dest=path.join(__dirname,'dist',target);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(__dirname,source),dest);if(!fs.statSync(dest).size)throw Error(target)}
console.log('Built trainer and atlas');
