const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = path.join(__dirname, '..', 'images');
const outputFile = path.join(__dirname, '..', 'photos.json');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Optimised for a photography portfolio:
// 2000px is enough for large desktop displays while keeping downloads reasonable.
const MAX_WIDTH = 2000;
const WEBP_QUALITY = 86;

function titleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function optimiseImage(categoryDir, filename) {
  const extension = path.extname(filename).toLowerCase();

  if (extension === '.webp') {
    return filename;
  }

  const inputPath = path.join(categoryDir, filename);
  const outputFilename = `${path.basename(filename, path.extname(filename))}.webp`;
  const outputPath = path.join(categoryDir, outputFilename);

  // Skip conversion when an optimised version already exists.
  if (fs.existsSync(outputPath)) {
    return outputFilename;
  }

  await sharp(inputPath)
    .rotate()
    .resize({
      width: MAX_WIDTH,
      height: MAX_WIDTH,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 5
    })
    .toFile(outputPath);

  console.log(`Optimised: ${filename} → ${outputFilename}`);
  return outputFilename;
}

async function optimiseImages() {
  if (!fs.existsSync(imagesDir)) {
    throw new Error('images folder not found');
  }

  const categories = fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const category of categories) {
    const categoryDir = path.join(imagesDir, category);

    const files = fs.readdirSync(categoryDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(filename => {
        const ext = path.extname(filename).toLowerCase();
        return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
      });

    for (const filename of files) {
      await optimiseImage(categoryDir, filename);
    }
  }
}

function scanImages() {
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
      .filter(filename => path.extname(filename).toLowerCase() === '.webp')
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

async function main() {
  await optimiseImages();

  const photos = scanImages();

  fs.writeFileSync(
    outputFile,
    JSON.stringify({ photos }, null, 2) + '\n',
    'utf8'
  );

  console.log(`Generated photos.json with ${photos.length} optimised photos.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
