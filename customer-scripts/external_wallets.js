const fs = require('fs');
const path = require('path');
const { FireblocksSDK } = require('fireblocks-sdk');
const { exit } = require('process');
const { inspect } = require('util');
const csv = require('csv-parser');

const apiSecret = fs.readFileSync(path.resolve("../../fireblocks-secret-key.key"), "utf8");
const apiKey = "b4ea3e01-bbdc-4c6b-a4bc-dd2143ded3ab"

// Choose the right api url for your workspace type 
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(apiSecret, apiKey, baseUrl);

//IMPORTANT: CHANGE THESE VALUES TO THE RELEVANT NEW FILES
const outputCsv = './external-matic-addresses.csv';
const inputCsv = '../random_eth.csv';

// Write the header once
const header = 'id,address,name,uuid,amount\n';
fs.writeFileSync(outputCsv, header, 'utf8');

(async () => {
    fs.createReadStream(inputCsv)
    .pipe(csv())
    .on('data', async (row) => {
        try {
            const { name, uuid, asset_type, address, amount } = row;
            console.log("creating external wallet");
            console.log(name);
            const externalWalletId = await createExternalWallet(name, address, uuid, amount);

            console.log("adding asset to external wallet: ");
            console.log(externalWalletId, asset_type, address);
            const addAsset = await createExternalWalletAsset(externalWalletId, asset_type, address);
            console.log(addAsset);

        } catch (error) {
            console.error('Error processing row:', error);
        }
    })
    .on('end', () => {
        console.log('CSV file processed successfully');
    });

})().catch((e)=>{
    console.error(`Failed: ${e}`);
    exit(-1);
})

async function createExternalWallet(name, address, uuid, amount) {
    try {
        const externalWallet = await fireblocks.createExternalWallet(name, uuid);
        console.log("external wallet id: ", externalWallet.id);

        const workflow = [{ id: externalWallet.id, address, name, uuid, amount }];
        console.log("amount is", amount)
        await output_csv(workflow, outputCsv); // Call output_csv with the outputCsv parameter
        console.log('CSV data has been written to', outputCsv);
        return externalWallet.id;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to output CSV string
async function output_csv(workflow, outputCsv) {
    // Assuming `workflow` is an array of objects containing id, address, name, uuid, and amount properties
    const csvString = workflow.map(item => `${item.id},${item.address},${item.name},${item.uuid},${item.amount}`).join('\n');

    try {
        await fs.promises.appendFile(outputCsv, `${csvString}\n`, 'utf8'); // Append to existing file
        console.log('CSV data has been appended to', outputCsv);
    } catch (error) {
        console.error('Error writing to CSV:', error);
    }
}

async function createExternalWalletAsset(walletId, assetId, address){
    const externalWalletAsset = await fireblocks.createExternalWalletAsset(walletId, assetId, address);
    console.log(JSON.stringify(externalWalletAsset, null, 2));
}