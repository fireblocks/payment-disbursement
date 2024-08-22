import fs from 'fs';                         // Built-in Node.js module
import path from 'path';                     // Built-in Node.js module
import { FireblocksSDK } from 'fireblocks-sdk'; // Named import from 'fireblocks-sdk'
import pLimit from 'p-limit';                // Default import from 'p-limit'
import { exit } from 'process';              // Built-in Node.js module
import { inspect } from 'util';              // Built-in Node.js module
import csv from 'csv-parser';   

const apiSecret = fs.readFileSync(path.resolve("../fireblocks-secret-key.key"), "utf8");
const apiKey = process.env.API_KEY

// Choose the right api url for your workspace type 
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(apiSecret, apiKey, baseUrl);

//IMPORTANT: CHANGE THESE VALUES TO THE RELEVANT NEW FILES
const outputCsv = './invictus-preview.csv';
const inputCsv = './iba-small.csv';

// Write the header once
const header = 'id,address,name,uuid,amount\n';
fs.writeFileSync(outputCsv, header, 'utf8');

const rateLimit = 120; // Number of requests per second
const cooldownTime = 5000; // Cooldown time in milliseconds (5 seconds)
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
        const externalWallet = await withExponentialBackoff(() => fireblocks.createExternalWallet(name+"1", uuid));
        console.log("External wallet ID:", externalWallet.id);

        const workflow = [{ id: externalWallet.id, address, name, uuid, amount }];
        console.log("Amount is", amount);
        
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

        const externalWalletId = await createExternalWallet(name, address, uuid, amount);
        console.log("Adding asset to external wallet:", externalWalletId, asset_type, address);
        sleep(5000);
        await createExternalWalletAsset(externalWalletId, asset_type, address, name);

        processedRows++;

        // Introduce a cooldown period after every 55 requests
        if (processedRows % 55 === 0) {
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