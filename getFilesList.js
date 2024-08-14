const fs = require('fs');
const path = require('path');

// List of directories to scan
const directories = [
  'graphics/custom-sprites/CustomBattlers',
  'graphics/custom-sprites/Other/BaseSprites',
  'graphics/custom-sprites/Other/Triples'
  // Add paths to other folders here
];

const getFilesFromDirectory = (dir) => {
  let results = [];

  const listFiles = (currentPath) => {
    const items = fs.readdirSync(currentPath);

    items.forEach((item) => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        listFiles(fullPath); // Recursively search in subdirectories
      } else if (stat.isFile()) {
        const relativePath = path.relative(dir, fullPath); // Get relative path
        results.push(relativePath); // Collect relative file paths
      }
    });
  };

  listFiles(dir);
  return results;
};

const filesData = directories.reduce((acc, dir) => {
  acc[dir] = getFilesFromDirectory(dir);
  return acc;
}, {});

const outputFilePath = 'filesData.json';

// Write the collected file data to a JSON file
fs.writeFileSync(outputFilePath, JSON.stringify(filesData, null, 2), 'utf8');
console.log(`Files data saved to ${outputFilePath}`);
