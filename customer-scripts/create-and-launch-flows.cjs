const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
const path = require('path');
const logFilePath = path.join(__dirname, 'launched_flow_log.txt');

const { FireblocksSDK } = require('fireblocks-sdk');

// REPLACE KEYS WITH YOURS BELOW
const privateKey = fs.readFileSync('../fireblocks-test-secret.key');
require('dotenv').config();

const apiKey = process.env.API_KEY;
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(privateKey, apiKey, baseUrl);

const workflowCsv = "./workflows.csv";
const preScreening = { enabled: false };
const outputFailedCsv = "./failed_txs.csv"

const checkStatusAndLaunch = async (executionId) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const flowExecution = await fireblocks.getFlowExecution(executionId);
        const { status, configSnapshot: { configName: name } } = flowExecution;

        if (status === 'READY_FOR_LAUNCH') {
          await fireblocks.launchFlowExecution(executionId);
          console.log(`Flow execution ${executionId} launched.`);
          // Append the message to the log file with a timestamp
          fs.appendFile(logFilePath, `[${new Date().toISOString()}] - SUCCESSFUL LAUNCH - ${name} \n`, (err) => {
            if (err) {
              console.error('Failed to write to log file:', err);
            }
          });
        } else if (status === 'EXECUTION_COMPLETED') {
          clearInterval(interval);
          console.log(`Flow execution ${executionId} completed.`);
          
          // Check and log failed transactions
          // await checkFailedTransactions();
          
          resolve();
        } else if (status === "EXECUTION_FAILED") {
          console.log(`Failed, moving onto the next.`);
          clearInterval(interval);
          console.log(flowExecution.executionOperations[0].execution.failure.reason);

          const failureReason = flowExecution.executionOperations[0]?.execution.failure?.reason || 'Unknown reason';
          
          fs.appendFile(logFilePath, `[${new Date().toISOString()}] - ERROR IN LAUNCH - ${failureReason} - ${name} \n`, (err) => {
            if (err) {
              console.error('Failed to write to log file:', err);
            }
          });
          resolve();
        } else {
          console.log(`Current status of ${executionId}: ${status}. Checking again...`);
        }
      } catch (error) {
        clearInterval(interval);
        console.error(error);
        reject(error);
      }
    }, 4000); // Check every 3 seconds
  });
};

const checkFailedTransactions = async () => {
  try {
    console.log("checking api for failed txs...");

    const from = Date.now() - 60 * 60 * 1000; //last hour
    const transactions = await fireblocks.getTransactions({
      status: ["FAILED", "REJECTED"],
      after: from
    });

    if (transactions.length > 0) {
      const csvWriter = createCsvWriter({
        path: outputFailedCsv,
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

// Don't forget to import createCsvWriter at the top of your file
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

(async () => {
  const rows = [];
  
  // Read all rows from the CSV
  fs.createReadStream(workflowCsv)
    .pipe(csv())
    .on('data', (row) => {
      rows.push(row);
    })
    .on('end', async () => {
      console.log('CSV file processing completed.');

      // Process each row sequentially
      for (const row of rows) {
        try {
          // const flowExecution = await fireblocks.createFlowExecution(row.workflowId, preScreening, []);
          // console.log('Flow execution response:', flowExecution);
          // const executionId = flowExecution.executionId;
          // console.log(`Execution ID: ${executionId}`);
          // fs.writeFileSync('execution-id.txt', executionId);

          // await checkStatusAndLaunch(executionId);
          await checkFailedTransactions();
        } catch (error) {
          console.error('Error creating or launching flow execution:', error);
        }
      }

      console.log('All flow executions processed.');
    });
})();