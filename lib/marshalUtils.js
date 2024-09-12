import fs from 'fs';
import { load } from '@hyrious/marshal';
import path from 'path';

/**
 * Recursively convert Ruby Marshal symbols and Uint8Array objects into readable JSON format.
 * @param {any} item - The item to process.
 * @returns {any} - The processed item.
 */
function processItem(item) {
  if (typeof item === 'symbol') {
    return item.toString().replace(/^Symbol\((.*)\)$/, '$1');
  } else if (item instanceof Uint8Array) {
    return new TextDecoder().decode(item);
  } else if (Array.isArray(item)) {
    return item.map(processItem);
  } else if (typeof item === 'object' && item !== null) {
    const result = {};
    Object.getOwnPropertyNames(item).forEach(key => {
      result[key] = processItem(item[key]);
    });
    Object.getOwnPropertySymbols(item).forEach(symbol => {
      const symbolKey = symbol.toString().replace(/^Symbol\((.*)\)$/, '$1');
      result[symbolKey] = processItem(item[symbol]);
    });
    delete result['class'];
    return result;
  }
  return item;
}

/**
 * Decode a Ruby Marshal file and convert it to a JSON array.
 * @param {string} filePath - The path to the Ruby Marshal file.
 * @returns {void}
 */
function decodeToJSON(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const decodedData = load(buffer);
    const processedData = processItem(decodedData);

    const dataArray = Object.values(processedData);
    const newArr = [];

    dataArray.forEach((obj) => {
      const newObj = {};
      Object.keys(obj).forEach((key) => {
        newObj[key.slice(1)] = obj[key];
      });
      newArr.push(newObj);
    });

    // Deduplicate objects in newArr
    const uniqueObjects = new Set();
    const deduplicatedArr = newArr.filter(obj => {
      const objString = JSON.stringify(obj);
      if (uniqueObjects.has(objString)) {
        return false; // Duplicate found
      }
      uniqueObjects.add(objString);
      return true; // Unique object
    });

    const jsonData = JSON.stringify(deduplicatedArr, null, 2);

    const outputDirectory = 'lib/data/json';
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory);
    }

    const outputFilePath = path.join(outputDirectory, `${path.basename(filePath, '.dat')}.json`);
    fs.writeFileSync(outputFilePath, jsonData);

    console.log(`File ${filePath} has been decoded and saved as ${outputFilePath}`);
  } catch (error) {
    console.error(`Error decoding file ${filePath}:`, error);
  }
}

// Usage: Pass the file path as an argument to this function
// decodeToJSON('lib/marshal_files/abilities.dat');
// Export the function for reuse
export { decodeToJSON };
