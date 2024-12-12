// Import required modules
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { FireblocksSDK } = require('fireblocks-sdk');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();

// Set up your API keys and base URL
const privateKey = fs.readFileSync('./fireblocks-hash-3.key'); // Replace with your private key path
const apiKey = process.env.API_KEY; // Ensure your .env file contains your API_KEY
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(privateKey, apiKey, baseUrl);

// Define file paths and other constants
const workflowCsv = "./eric_Workflows.csv"; // Path to your input CSV file
const preScreening = { enabled: false };
const outputFailedCsv = "./failed_txs.csv"; // Path to your failed transactions CSV
const logFilePath = path.join(__dirname, 'launched_flow_log.txt'); // Log file path

// Logging utility function
function logMessage(message, level = 'INFO', executionId = '') {
  const timestamp = new Date().toISOString();
  const executionInfo = executionId ? ` [Execution ID: ${executionId}]` : '';
  const logEntry = `[${timestamp}] [${level}]${executionInfo} - ${message}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}

// Function to check status and launch flow execution
const checkStatusAndLaunch = async (executionId) => {
  return new Promise((resolve, reject) => {
    const baseInterval = 5000; // Interval between status checks in milliseconds

    const intervalFunction = async () => {
      try {
        const flowExecution = await fireblocks.getFlowExecution(executionId);
        const { status, configSnapshot: { configName: name } } = flowExecution;

        if (status === 'READY_FOR_LAUNCH') {
          await fireblocks.launchFlowExecution(executionId);
          console.log(`Flow execution ${executionId} launched.`);
          logMessage(`SUCCESSFUL LAUNCH - ${name}`, 'INFO', executionId);
        } else if (status === 'EXECUTION_COMPLETED') {
          console.log(`Flow execution ${executionId} completed.`);
          logMessage(`Flow execution completed - ${name}`, 'INFO', executionId);
          clearInterval(interval);
          resolve();
        } else if (status === 'EXECUTION_FAILED') {
          console.log(`Flow execution ${executionId} failed.`);
          const failureReason = flowExecution.executionOperations[0]?.execution.failure?.reason || 'Unknown reason';
          logMessage(`ERROR IN LAUNCH - ${failureReason} - ${name}`, 'ERROR', executionId);
          clearInterval(interval);
          resolve();
        } else {
          console.log(`Current status of ${executionId}: ${status}. Checking again...`);
          // No maxAttempts, continue checking indefinitely
        }
      } catch (error) {
        console.error(`Error fetching execution status for ${executionId}:`, error);
        logMessage(`Error fetching execution status: ${error.message}`, 'ERROR', executionId);
        clearInterval(interval);
        reject(error);
      }
    };

    const interval = setInterval(intervalFunction, baseInterval);
  });
};


// Function to check for failed transactions
const checkFailedTransactions = async () => {
  try {
    console.log("Checking API for failed transactions...");
    logMessage("Checking API for failed transactions...");

    const from = Date.now() - (60 * 30 * 1000); // Transactions from the last 30 min
    const transactions = await fireblocks.getTransactions({
      status: ["FAILED", "REJECTED"],
      after: from
    });

    if (transactions.length > 0) {
      const csvWriter = createCsvWriter({
        path: outputFailedCsv,
        append: true,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'status', title: 'Status' },
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'sourceType', title: 'Source Type' },
          { id: 'sourceId', title: 'Source ID' },
          { id: 'destinationType', title: 'Destination Type' },
          { id: 'destinationId', title: 'Destination ID' },
          { id: 'amount', title: 'Amount' },
          { id: 'assetId', title: 'Asset ID' }
        ]
      });

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
      logMessage(`${transactions.length} failed transactions written to CSV.`);
    } else {
      console.log('No failed transactions found.');
      logMessage('No failed transactions found.');
    }
  } catch (error) {
    console.error('Error checking failed transactions:', error);
    logMessage(`Error checking failed transactions: ${error.message}`, 'ERROR');
  }
};

// Function to process each row from the CSV
async function processRow(row) {
  let executionId = '';
  try {
    const flowExecution = await fireblocks.createFlowExecution(row.workflowId, preScreening, []);
    executionId = flowExecution.executionId;
    console.log(`Execution ID: ${executionId}`);
    // fs.appendFileSync('execution-id.txt', `${executionId}\n`);

    // Log the execution ID
    logMessage(`Execution ID ${executionId} created for workflow ID ${row.workflowId}`, 'INFO', executionId);

    await checkStatusAndLaunch(executionId);
    await checkFailedTransactions();
  } catch (error) {
    console.error('Error creating or launching flow execution:', error);
    logMessage(`Error in processRow: ${error.message}`, 'ERROR', executionId);
  }
}

// Main execution function
(async () => {
  const stream = fs.createReadStream(workflowCsv).pipe(csv());

  stream.on('data', async (row) => {
    stream.pause();
    try {
      await processRow(row);
    } catch (error) {
      console.error('Error processing row:', error);
      logMessage(`Error processing row: ${error.message}`, 'ERROR');
    } finally {
      stream.resume();
    }
  });

  stream.on('end', () => {
    console.log('All flow executions processed.');
    logMessage('All flow executions processed.');
  });

  stream.on('error', (error) => {
    console.error('Error reading CSV file:', error);
    logMessage(`Error reading CSV file: ${error.message}`, 'ERROR');
  });
})();
