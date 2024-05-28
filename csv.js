const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Function to generate random display name
function generateRandomName() {
    const adjectives = [
        'Ambitious', 'Bright', 'Curious', 'Daring', 'Elegant', 'Fierce', 
        'Gentle', 'Hilarious', 'Imaginative', 'Jovial', 'Marvelous', 
        'Noble', 'Optimistic', 'Patient', 'Radiant', 'Spirited', 
        'Tenacious', 'Unique', 'Vivacious', 'Wise'
    ];
    
    const nouns = [
        'Fox', 'Owl', 'Raccoon', 'Beaver', 'Falcon', 'Chameleon', 
        'Hedgehog', 'Meerkat', 'Platypus', 'Squirrel', 'Wolf', 
        'Zebra', 'Phoenix', 'Griffin', 'Lemur', 'Armadillo'
    ];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    // return `${randomAdjective}_${randomNoun}`; 
    // uncomment if you need to scramble more
    const randomNumber = Math.random() * 1001;
    return `${randomAdjective}_${randomNoun}_${randomNumber}`;
}

// Function to generate random UUID
function generateUUID() {
    return uuidv4();
}

// Function to generate random Ethereum address
function generateEthAddress() {
    const characters = 'abcdef0123456789';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
        address += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return address;
}

// Generate CSV data
function generateCSVData(numRecords) {
    const data = [];
    data.push(["name", "uuid", "asset_type", "address", "amount"]);
    for (let i = 0; i < numRecords; i++) {
        const displayName = generateRandomName();
        const uuid = generateUUID();
        const asset = 'AMOY_POLYGON_TEST';
        const ethAddress = generateEthAddress();
        const amount = 0.001;
        data.push([displayName, uuid, asset, ethAddress, amount]);
    }
    return data;
}

// Write data to CSV file
function writeCSV(filename, data) {
    const csvContent = data.map(row => row.join(',')).join('\n');
    fs.writeFileSync(filename, csvContent);
}

// Number of records to generate
const numRecords = 150;

// Generate CSV data
const csvData = generateCSVData(numRecords);

// Write data to CSV file
writeCSV('random_eth.csv', csvData);

console.log('CSV file generated successfully.');
