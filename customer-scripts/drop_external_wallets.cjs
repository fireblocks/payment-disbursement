const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
const pLimit = require('p-limit');
const path = require('path');
const { FireblocksSDK } = require('fireblocks-sdk');
require('dotenv').config();

const apiSecret = fs.readFileSync(path.resolve("./fireblocks-priv.key"), "utf8");
const apiKey = process.env.API_KEY;

// Choose the correct API URL for your workspace type
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(apiSecret, apiKey, baseUrl);

// Update the input CSV file path
const inputCsv = './external-wallets-converted.csv';

const rateLimit = 30; // Number of requests per second
const cooldownTime = 60000; // Cooldown time in milliseconds (50 seconds)
const maxRetries = 5; // Maximum number of retries

// Limit the number of concurrent requests
const limit = pLimit(rateLimit);

async function withExponentialBackoff(fn, retries = 0) {
    try {
        return await fn();
    } catch (error) {
        console.log(error);
        if (retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000; // Exponential backoff
            console.log(`Retrying in ${delay / 1000} seconds... (Retry ${retries + 1})`);
            await new Promise(res => setTimeout(res, delay));
            return withExponentialBackoff(fn, retries + 1);
        } else {
            console.error('Max retries reached:', error);
            throw error;
        }
    }
}

async function deleteExternalWallet(walletId) {
    try {
        await withExponentialBackoff(() => fireblocks.deleteExternalWallet(walletId));
        console.log("External wallet deleted successfully:", walletId);
    } catch (error) {
        console.error('Error deleting external wallet:', error);
    }
}

(async () => {
    let processedRows = 0;

    const processRow = async (row) => {
        const { id } = row;

        if (!id) {
            console.warn("Row skipped due to missing ID:", row);
            return;
        }

        console.log("Deleting external wallet ID:", id);
        await deleteExternalWallet(id);

        processedRows++;

        // Introduce a cooldown period after every 50 requests
        if (processedRows % 50 === 0) {
            console.log(`Cooldown period for ${cooldownTime / 1000} seconds...`);
            await new Promise(res => setTimeout(res, cooldownTime));
        }
    };

    fs.createReadStream(inputCsv)
        .pipe(csv())
        .on('data', (row) => limit(() => processRow(row)))
        .on('end', () => {
            console.log('CSV file processed successfully');
        });
})();
