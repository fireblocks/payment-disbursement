const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
const { FireblocksSDK } = require('fireblocks-sdk');

// Load your private key from a file
// REPLACE KEYS WITH YOURS BELOW
const privateKey = fs.readFileSync('../../fireblocks-secret-key.key');
const apiKey = "b4ea3e01-bbdc-4c6b-a4bc-dd2143ded3ab";
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(privateKey, apiKey, baseUrl);
const disburseArray = [];
const addresses = [];

// UPDATE TO A UNIQUE NAME
const configName = "payments-testing";

// Read the CSV file containing IDs
//REPLACE WITH INPUT
const inputCsv = "./external-matic-addresses.csv";

//REPLACE WITH OUTPUT CSV FILE
const outputCsv = "output-check.csv";

(async () => {
  fs.createReadStream(inputCsv)
    .pipe(csv())
    .on('data', (row) => {
      disburseArray.push({
        "payeeAccount": {
          "accountId": row.id,
          "accountType": "UNMANAGED_WALLET",
        },
        "assetId": "AMOY_POLYGON_TEST",
        "amount": row.amount
      });
      // addresses.push(row.Address);
    })
    .on('end', async () => {
      // Once all data is read, proceed with creating configOperations
      const configOperations = [
        {
          "type": "DISBURSEMENT",
          "params": {
            "paymentAccount": {
              "accountType": "VAULT_ACCOUNT",
              "accountId": "9"
            },
            "instructionSet": disburseArray
          }
        }
      ];

      // Convert configOperations to JSON string
      // const configJson = JSON.stringify(configOperations, null, 2);
      //console.log(configJson); // or do whatever you want with the JSON blob
      
      // console.log(configOperations);
      console.log("creating workflow: ", configName);
      const workflow = await fireblocks.createWorkflowConfig(configName, configOperations);

      // Log the type of the workflow object
      // console.log("Type of 'workflow' object:", typeof workflow);

      // Log the workflow object itself
      // console.log("Workflow object:", workflow);

      console.log(JSON.stringify(workflow, null, 2));
      console.log("Your config id has been successfully created: ", JSON.stringify(workflow.configId));
      // workflow = {};
      output_csv(workflow)
        .then(csvString => {
          fs.writeFileSync(outputCsv, csvString);
          console.log('CSV data has been written to', outputCsv);
        })
        .catch(error => console.error('Error:', error));
      
    });
})();


async function output_csv(jsonData) {
  // console.log(jsonData.configOperations[0].params.instructionSet);
  const instructionSet = jsonData.configOperations[0].params.instructionSet;
  
  const csvRows = [];

  // Add header row
  csvRows.push('Address,Wallet ID,Asset ID,Amount');

  // Extract data from JSON and add rows
  for (const instruction of instructionSet) {
    const walletId = instruction.payeeAccount.accountId || 'N/A';;
    const assetId = instruction.assetId || 'N/A';
    
    // Fetching address asynchronously
    try {
      const result = await fireblocks.getExternalWalletAsset(walletId, assetId);
      const address = result.address;
      
      // const tag = instruction.payeeAccount.tag || 'N/A';
      const amount = instruction.amount || 'N/A';

      const row = `${address},${walletId},${assetId},${amount}`;
      csvRows.push(row);
    } catch (error) {
      console.error('Error fetching address:', error);
      // If there's an error, you can decide how to handle it. For example, you can skip this instruction or set address as 'N/A'.
    }
  }

  // Join rows with newline character to form CSV string
  const csvData = csvRows.join('\n');
  
  return csvData;
}