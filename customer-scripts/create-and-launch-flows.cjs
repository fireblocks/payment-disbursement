const fs = require('fs');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');

const logFilePath = path.join(__dirname, 'launched_flow_log.txt');


// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
const { FireblocksSDK } = require('fireblocks-sdk');

// Load your private key from a file
// REPLACE KEYS WITH YOURS BELOW
const privateKey = fs.readFileSync('../fireblocks-secret-key.key');
require('dotenv').config();

const apiKey = process.env.API_KEY;
const baseUrl = "https://api.fireblocks.io";
const fireblocks = new FireblocksSDK(privateKey, apiKey, baseUrl);

const workflowCsv = "./workflows.csv";
const preScreening = { enabled: false };

const checkStatusAndLaunch = async (executionId) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const flowExecution = await fireblocks.getFlowExecution(executionId);
        const status = flowExecution.status;
        const name = flowExecution.configSnapshot.configName;

        if (status === 'READY_FOR_LAUNCH' || status === 'VALIDATION_COMPLETED') {
          clearInterval(interval);
          if (status === 'READY_FOR_LAUNCH') {
            await fireblocks.launchFlowExecution(executionId);
            console.log(`Flow execution ${executionId} launched.`);
             // Append the message to the log file with a timestamp
            fs.appendFile(logFilePath, `[${new Date().toISOString()}] - SUCCESSFUL LAUNCH - ${name} \n`, (err) => {
              if (err) {
                console.error('Failed to write to log file:', err);
              }
            });
          } else {
            console.log(`Flow execution ${executionId} is already validated.`);
          }
          resolve();
        } else {
          console.log(`Current status of ${executionId}: ${status}. Checking again...`);
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 3000); // Check every 5 seconds
  });
};

(async () => { fs.createReadStream(workflowCsv)
  .pipe(csv())
  .on('data', async (row) => {
    try {
      const flowExecution = await fireblocks.createFlowExecution(row.workflowId, preScreening, []);
      console.log('Flow execution response:', flowExecution);
      const executionId = flowExecution.executionId;
      console.log(`Execution ID: ${executionId}`);
      fs.writeFileSync('execution-id.txt', executionId);

      await checkStatusAndLaunch(executionId);
    } catch (error) {
      console.error('Error creating or launching flow execution:', error);
    }
  })
  .on('end', () => {
    console.log('CSV file processing completed.');
  });
})();
