const fs = require('fs');

// Function to read JSON file
function readJsonFile(filename) {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

// Function to convert JSON to CSV format
function jsonToCsv(jsonData) {
    const csvData = jsonData.map(item => item.id).join('\n');
    return csvData;
}

// Write the IDs to a new CSV file
function writeIdsToCsv(jsonData, filename) {
    const csvData = jsonToCsv(jsonData);
    fs.writeFileSync(filename, csvData);
    console.log(`IDs have been written to "${filename}".`);
}

// Usage: Provide the filename of the JSON file and the filename for the new CSV file
const jsonData = readJsonFile('response.json');
writeIdsToCsv(jsonData, 'ids.csv');
