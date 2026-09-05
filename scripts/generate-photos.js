const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', 'images');
const outputFile = path.join(__dirname, '..', 'photos.json');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function titleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scanImages() {
  if (!fs.existsSync(imagesDir)) {
    throw new Error('images folder not found');
  }

  const categories = fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const photos = [];

  for (const category of categories) {
    const categoryDir = path.join(imagesDir, category);

    const files = fs.readdirSync(categoryDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(filename => imageExtensions.has(path.extname(filename).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const filename of files) {
      photos.push({
        id: photos.length + 1,
        category,
        path: `images/${category}/${filename}`,
        title: titleFromFilename(filename)
      });
    }
  }

  return photos;
}

const photos = scanImages();

fs.writeFileSync(
  outputFile,
  JSON.stringify({ photos }, null, 2) + '\n',
  'utf8'
);

console.log(`Generated photos.json with ${photos.length} photos.`);
