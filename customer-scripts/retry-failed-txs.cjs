const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
const path = require('path');
// const logFilePath = path.join(__dirname, 'launched_flow_log.txt');

const { FireblocksSDK } = require('fireblocks-sdk');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
// REPLACE KEYS WITH YOURS BELOW
const privateKey = fs.readFileSync('../fireblocks-test-secret.key');
require('dotenv').config();

const apiKey = process.env.API_KEY;
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(privateKey, apiKey, baseUrl);

const preScreening = { enabled: false };

// Path to your CSV file
const CSV_FILE_PATH = "./failed_txs.csv";

(async () => {
    fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({ headers: false }))
    .on('data', async (row) => {
        const [
            id,
            status,
            timestamp,
            sourceType,
            sourceVault,
            destType,
            destinationId,
            amount,
            assetID
        ] = Object.values(row);

        console.log(`Transaction ID: ${id}, Status: ${status}`);

      // Only retry if status is FAILED
      if (status !== 'FAILED') {
        console.log(`Skipping transaction ${id} with status ${status}`);
      } else {
        console.log(`Retrying transaction ${id} with status ${status}`);
        
        try {
          // Prepare transaction parameters
          const transactionParams = {
            assetId: assetID,
            source: {
              type: 'VAULT_ACCOUNT',
              id: sourceVault,
            },
            destination: {
              type: 'EXTERNAL_WALLET',
              id: destinationId,
            },
            amount: amount,
            note: `Retrying failed transaction ${id}`,
          };

          // Create transaction
          const newTransaction = await fireblocks.createTransaction(
            transactionParams
          );

          console.log(
            `Transaction ${id} retried successfully. New transaction ID: ${newTransaction.id}`
          );
        } catch (error) {
          console.error(`Error retrying transaction ${id}:`, error.message);
        }
      }
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
      console.log('All transactions processed.');
      checkFailedTx();
    });
})();


const checkFailedTx = async () => {
    try {
      console.log("checking api for failed txs...");
  
      const from = Date.now() - 60 * 60 * 1000; //last hour
      const transactions = await fireblocks.getTransactions({
        status: ["FAILED", "REJECTED"],
        after: from
      });
  
      if (transactions.length > 0) {
        const csvWriter = createCsvWriter({
          path: "./failed_tx_again.csv",
          append: true,
          header: [
            {id: 'id', title: 'ID'},
            {id: 'status', title: 'Status'},
            {id: 'timestamp', title: 'Timestamp'},
            {id: 'sourceType', title: 'Source Type'},
            {id: 'sourceId', title: 'Source ID'},
            {id: 'destinationType', title: 'Destination Type'},
            {id: 'destinationId', title: 'Destination Id'},
            {id: 'amount', title: 'Amount'},
            {id: 'assetId', title: 'Asset ID'}
          ]
        });
  
        console.log(transactions[0]);
  
        await csvWriter.writeRecords(transactions.map(tx => ({
          id: tx.id,
          status: tx.status,
          timestamp: new Date(parseInt(tx.lastUpdated)).toLocaleString(),
          sourceType: tx.source.type,
          sourceId: tx.source.id,
          destinationType: tx.destination.type,
          destinationId: tx.destination.id,
          amount: tx.amount,
          assetId: tx.assetId,
        })));
  
        console.log(`${transactions.length} failed transactions written to CSV.`);
      } else {
        console.log('No failed transactions found.');
      }
    } catch (error) {
      console.error('Error checking failed transactions:', error);
    }
  };
