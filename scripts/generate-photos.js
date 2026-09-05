const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = path.join(__dirname, '..', 'images');
const originalsDir = path.join(imagesDir, 'originals');
const optimizedDir = path.join(imagesDir, 'optimized');
const outputFile = path.join(__dirname, '..', 'photos.json');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);

// Optimised for a photography portfolio:
// 2000px is enough for large desktop displays while keeping downloads reasonable.
const MAX_SIZE = 2000;
const WEBP_QUALITY = 86;

function titleFromFilename(filename) {
    return path
        .basename(filename, path.extname(filename))
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function optimiseImage(category, filename) {
    const inputPath = path.join(originalsDir, category, filename);
    const outputCategoryDir = path.join(optimizedDir, category);
    const outputFilename = `${path.basename(filename, path.extname(filename))}.webp`;
    const outputPath = path.join(outputCategoryDir, outputFilename);

    fs.mkdirSync(outputCategoryDir, { recursive: true });

    // Reuse an existing optimised file when it is already present.
    if (fs.existsSync(outputPath)) {
        return outputFilename;
    }

    await sharp(inputPath)
        .rotate()
        .resize({
            width: MAX_SIZE,
            height: MAX_SIZE,
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({
            quality: WEBP_QUALITY,
            effort: 5
        })
        .toFile(outputPath);

    console.log(`Optimised: ${category}/${filename} → ${category}/${outputFilename}`);
    return outputFilename;
}

async function optimiseImages() {
    if (!fs.existsSync(originalsDir)) {
        throw new Error('images/originals folder not found');
    }

    const categories = fs.readdirSync(originalsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

    for (const category of categories) {
        const categoryDir = path.join(originalsDir, category);

        const files = fs.readdirSync(categoryDir, { withFileTypes: true })
            .filter(entry => entry.isFile())
            .map(entry => entry.name)
            .filter(filename => imageExtensions.has(path.extname(filename).toLowerCase()));

        for (const filename of files) {
            await optimiseImage(category, filename);
        }
    }
}

async function scanOptimizedImages() {
    if (!fs.existsSync(optimizedDir)) {
        return [];
    }

    const categories = fs.readdirSync(optimizedDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

    const photos = [];

    for (const category of categories) {
        const categoryDir = path.join(optimizedDir, category);

        const files = fs.readdirSync(categoryDir, { withFileTypes: true })
            .filter(entry => entry.isFile())
            .map(entry => entry.name)
            .filter(filename => path.extname(filename).toLowerCase() === '.webp')
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        for (const filename of files) {
            const filePath = path.join(categoryDir, filename);
            const metadata = await sharp(filePath).metadata();

            photos.push({
                id: photos.length + 1,
                category,
                path: `images/optimized/${category}/${filename}`,
                title: titleFromFilename(filename),
                width: metadata.width,
                height: metadata.height
            });
        }
    }

    return photos;
}

async function main() {
    await optimiseImages();

    const photos = await scanOptimizedImages();

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
