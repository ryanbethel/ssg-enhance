import tiny from 'tiny-json-http'
import fs from 'fs'
import path from 'path'
import sandbox from '@architect/sandbox'

let manifestFile = './manifest.mjs'
let outputPath = './dist'
let baseURL = 'http://localhost:3333'
let overwrite = true
let assetsDir = './public'
let projectDir = '.'

let manifest;
try {
  if (projectDir === '.') {
    await sandbox.start()
  } else {
    await sandbox.start({ cwd: projectDir })
  }
  manifest = (await import(path.resolve(manifestFile))).default;
  for (const item of manifest.paths) {
    console.log('Processing', item);
    await processManifestItem(item)
  }
  await sandbox.end()
} catch (error) {
  console.error('Failed to load manifest:', error);
}

if (fs.existsSync(outputPath)) {
  if (fs.readdirSync(outputPath).length !== 0 && !overwrite) {
    console.error(`Error: Output directory "${outputPath}" is not empty. Use --overwrite to allow overwriting.`);
    process.exit(1);
  }
} else {
  try {
    fs.mkdirSync(outputPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating output directory "${outputPath}":`, error.message);
    process.exit(1);
  }
}

function copyAssets(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  let entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(srcDir, entry.name);
    let destPath = path.join(destDir, entry.name);

    entry.isDirectory() ? copyAssets(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
  }
}

const assetsOutputDir = path.join(outputPath, '_public');
try {
  copyAssets(assetsDir, assetsOutputDir);
  console.log(`Assets copied from ${assetsDir} to ${assetsOutputDir}`);
} catch (error) {
  console.error('Failed to copy assets:', error);
}




async function fetchAndSave(urlPath) {
  try {
    const result = await tiny.get({ url: urlPath })
    const fixPath = urlPath.replace(baseURL, '')
    const filePath = path.join(outputPath, fixPath, 'index.html');
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, result.body);
    console.log(`Saved ${urlPath} to ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${urlPath}`);
  }
}

async function processDynamicPath({ template, values, currentPath, keys = Object.keys(values), index = 0 }) {
  if (!currentPath) currentPath = template
  console.log('Processing dynamic path', template, values, currentPath, keys, index);
  if (index < keys.length) {
    const key = keys[index];
    const replacements = values[key];
    console.log('replacements', key, replacements);
    for (const replacement of replacements) {
      const newPath = currentPath.replace(new RegExp(`{${key}}`, 'g'), replacement);
      await processDynamicPath({ template, values, currentPath: newPath, keys, index: index + 1 });
    }
  } else {
    await fetchAndSave(`${baseURL}${currentPath}`);
  }
}

async function processManifestItem(item) {
  if (typeof item === 'string') {
    await fetchAndSave(`${baseURL}${item}`);
  } else if (item.path && item.values) {
    await processDynamicPath({ template: item.path, values: item.values });
  }
}

