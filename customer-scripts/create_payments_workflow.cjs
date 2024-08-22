const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
const { FireblocksSDK } = require('fireblocks-sdk');
require('dotenv').config();

// Load your private key from a file
// REPLACE KEYS WITH YOURS BELOW
const privateKey = fs.readFileSync('../fireblocks-secret-key.key');
const apiKey = process.env.API_KEY;

const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(privateKey, apiKey, baseUrl, undefined, { timeoutInMs: 30000} );
const sourceVaultId = "9";

const addresses = [];

// UPDATE TO A UNIQUE NAME
const configName = "invictus-giga-test";

// Read the CSV file containing IDs
//REPLACE WITH INPUT
const inputCsv = "./invictus-addresses.csv";

//REPLACE WITH OUTPUT CSV FILE
const outputInstructionSetCsv = "output-test-matic.csv";
const outputWorkflowsCsv = "workflows.csv"

const batchSize = 200; // Number of rows per batch
let configCounter = 1; // Counter to increment config name
const addressMap = {};  // New variable to store address and name by accountId

let disburseArray = [];
const writeStream = fs.createWriteStream(outputInstructionSetCsv, { flags: 'a' });
const writeWorkflowStream = fs.createWriteStream(outputWorkflowsCsv, { flags: 'a'});

// Write header to CSV file once
writeStream.write('Address,Wallet ID, Name, Asset ID,Amount, Workflow\n');
writeWorkflowStream.write('workflowId,name\n');

const processBatchQueue = [];

// Ensure the method exists
if (typeof fireblocks.createWorkflowConfig !== 'function') {
  console.error('createWorkflowConfig is not defined in FireblocksSDK');
}

(async () => {
  fs.createReadStream(inputCsv)
    .pipe(csv())
    .on('data', (row) => {
      // Store address and name in addressMap
      addressMap[row.id] = {
        address: row.address,
        name: row.name
      };

      disburseArray.push({
        "payeeAccount": {
          "accountId": row.id,
          "accountType": "UNMANAGED_WALLET",
        },
        "assetId": "USDC_AMOY_POLYGON_TEST_7WWV",
        "amount": row.amount,
      });

      if (disburseArray.length === batchSize) {
        processBatchQueue.push(disburseArray.splice(0, batchSize)); // Push a copy of the batch to the queue
      }
    })
    .on('end', async () => {
      if (disburseArray.length > 0) {
        processBatchQueue.push(disburseArray);
      }

      console.log('All data read. Processing batches...');
      
      await Promise.all(processBatchQueue.map(batch => processBatch(batch)));

      console.log('All batches processed.');
      writeStream.end();
      writeWorkflowStream.end();
    });
})();

async function processBatch(batch) {
  const workflowName = `${configName}-${configCounter++}`;
  console.log(`Processing batch ${workflowName} with ${batch.length} rows.`);
  const configOperations = [
    {
      "type": "DISBURSEMENT",
      "params": {
        "paymentAccount": {
          "accountType": "VAULT_ACCOUNT",
          "accountId": sourceVaultId
        },
        "instructionSet": batch
      }
    }
  ];

  try {
    const workflow = await fireblocks.createWorkflowConfig(workflowName, configOperations);
    writeWorkflowStream.write(`${workflow.configId},${workflowName}\n`);

    const csvString = await output_csv(workflow, workflowName);
    writeStream.write(csvString + '\n'); // Stream to file incrementally
    console.log(`Batch ${workflowName} processed and written to CSV.`);
  } catch (error) {
    console.error(`Error processing batch ${workflowName}:`, error);
  }
}

async function output_csv(jsonData, workflowName) {
  const instructionSet = jsonData.configOperations[0].params.instructionSet;
  
  const csvRows = await Promise.all(instructionSet.map(async (instruction) => {
    const walletId = instruction.payeeAccount.accountId || 'N/A';
    const assetId = instruction.assetId || 'N/A';
    const address = addressMap[walletId]?.address || 'N/A';
    const tag = addressMap[walletId]?.name || 'N/A';
    const amount = instruction.amount || 'N/A';
    
    return `${address},${walletId},${tag},${assetId},${amount},${workflowName}`;
    
  }));

  return csvRows.join("\n");
}
