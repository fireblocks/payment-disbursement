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

// Read the CSV file containing IDs
//REPLACE WITH INPUT
const inputCsv = "./external-wallets2.csv";

//REPLACE WITH OUTPUT CSV FILE
const outputCsv = "updated-result.csv";

async function parseRows(inputCsv) {
  console.log('Reading CSV...');
fs.createReadStream(inputCsv)
    .pipe(csv())
    .on('data', (row) => {
        disburseArray.push({
            "payeeAccount": {
                "accountId": row.ID,
                "accountType": "EXTERNAL_WALLET"
            },
            "assetId": "ETH_TEST5",
            "amount": "0.01"
        });
    })
    .on('end', async () => {
        console.log('CSV data read successfully.');
        console.log('Disburse Array:', disburseArray);

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

        console.log('Config Operations:', configOperations);
        return configOperations;
    })
    .on('error', (error) => {
        console.error('Error reading CSV:', error);
    });
}
      
async function output_csv(jsonData) {
  // console.log(jsonData.configOperations[0].params.instructionSet);
  const instructionSet = jsonData.configOperations[0].params.instructionSet;
  const csvRows = [];

  // Add header row
  csvRows.push('Address,Tag,Asset ID,Amount');

  // Extract data from JSON and add rows
  instructionSet.map(instruction => {
      const address = instruction.payeeAccount.oneTimeAddress || 'N/A';
      const tag = instruction.payeeAccount.tag || 'N/A';
      const assetId = instruction.assetId || 'N/A';
      const amount = instruction.amount || 'N/A';

      const row = `${address},${tag},${assetId},${amount}`;
      csvRows.push(row);
  });

  // Join rows with newline character to form CSV string
  const csvData = csvRows.join('\n');
  
  return csvData;
}

async function createPaymentWorkflow(inputCsv, outputCsv, configName){
    const configOperations = parseRows(inputCsv);
    // console.log(configOperations);
    console.log("creating workflow: ", configName);
    const workflow = await fireblocks.createWorkflowConfig(configName, configOperations);
    console.log(JSON.stringify(workflow, null, 2));
    console.log("Your config id has been successfully created: ", JSON.stringify(workflow.configId));
    output_csv(workflow)
        .then(csvString => {
            fs.writeFileSync(outputCsv, csvString);
            console.log('CSV data has been written to', outputCsv);
        })
        .catch(error => console.error('Error:', error));
}

createPaymentWorkflow(inputCsv, outputCsv, "eric-signed");