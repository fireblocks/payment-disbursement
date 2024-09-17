const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
const pLimit = require('p-limit');
const path = require('path');
const { FireblocksSDK } = require('fireblocks-sdk');

const apiSecret = fs.readFileSync(path.resolve("../fireblocks-test-secret.key"), "utf8");
require('dotenv').config();
const apiKey = process.env.API_KEY

// Choose the right api url for your workspace type 
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(apiSecret, apiKey, baseUrl);

//IMPORTANT: CHANGE THESE VALUES TO THE RELEVANT NEW FILES
const outputCsv = './invictus-subset-small.csv';
const inputCsv = './iba-subset.csv';

// Write the header once
const header = 'id,address,name,uuid,amount\n';
fs.writeFileSync(outputCsv, header, 'utf8');

const rateLimit = 70; // Number of requests per second
const cooldownTime = 8000; // Cooldown time in milliseconds (8 seconds)
const maxRetries = 5; // Maximum number of retries

// Limit the number of concurrent requests
const limit = pLimit(rateLimit);

async function withExponentialBackoff(fn, retries = 0) {
    try {
        return await fn();
    } catch (error) {
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

async function createExternalWallet(name, address, uuid, amount) {
    try {
        const externalWallet = await withExponentialBackoff(() => fireblocks.createExternalWallet(name, uuid));
        console.log("External wallet ID:", externalWallet.id);

        const workflow = [{ id: externalWallet.id, address, name, uuid, amount }];
        // console.log("Amount is", amount);
        
        await withExponentialBackoff(() => output_csv(workflow, outputCsv));
        console.log('CSV data has been written to', outputCsv);
        
        return externalWallet.id;
    } catch (error) {
        console.error('Error creating external wallet:', error);
        throw error;
    }
}

async function output_csv(workflow, outputCsv) {
    const csvString = workflow.map(item => `${item.id},${item.address},${item.name},${item.uuid},${item.amount}`).join('\n');

    try {
        await fs.promises.appendFile(outputCsv, `${csvString}\n`, 'utf8');
        console.log('CSV data has been appended to', outputCsv);
    } catch (error) {
        console.error('Error writing to CSV:', error);
        throw error;
    }
}

async function createExternalWalletAsset(walletId, assetId, address, tag) {
    try {
        const externalWalletAsset = await withExponentialBackoff(() =>
            fireblocks.createExternalWalletAsset(walletId, assetId, address, tag)
        );
        console.log(JSON.stringify(externalWalletAsset, null, 2));
    } catch (error) {
        console.error('Error creating external wallet asset:', error);
        throw error;
    }
}

(async () => {
    let processedRows = 0;

    const processRow = async (row) => {
        const { name, uuid, asset_type, address, amount } = row;
        console.log("Creating external wallet:", name);

        const externalWalletId = await createExternalWallet(name+"0", address, uuid, amount);
        console.log("Adding asset to external wallet:", externalWalletId, asset_type, address);
        sleep(9000);
        await createExternalWalletAsset(externalWalletId, asset_type, address, name);

        processedRows++;

        // Introduce a cooldown period after every 55 requests
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


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}