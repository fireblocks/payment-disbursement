# Payment Scripts Automation Guide
This guide details the steps to automate payment disbursement using Node.js and JavaScript, specifically with the Fireblocks API. The process involves generating external wallets, adding assets to these wallets, and creating a payment workflow.

## Prerequisites
- Ensure Node.js and JavaScript are installed on your machine.
- Install necessary dependencies (e.g., axios for API requests).
- Configuration Steps:
     - API CoSigner configured to auto approve whitelisting.
     - API CoSigner configured to sign all transfers to external wallets.
     - Block everything else. (optional, recommended)
     - Freeze incoming assets (optional).

## Steps to Automate Payment Disbursements
### Step 0: Prepare Disbursement Recipient List
Prepare a CSV file (disbursement_list.csv) with the recipient information. The CSV should have the following format.
```
DisplayName | uuid | asset | deposit_address | amount
-------------------------------------------------------
hedgefund  cbc5bebf-2d63-4d99-ba7e-0c6ad6116e0e  ETH 0x0000000001 0.01          
```

Set up API Cosigner, with TAP rule in place to authorize signing and initiating a tx. 
Set up Admin Quorum with rules in place to approve whitelisting wallets. Fix the quorum to be 1 so that we can approve without manually signing, as there are a ton of wallets to whitelist

### Step 1: Whitelist External Wallets
Fireblocks PS runs “Create User Wallets” scripts which calls Create External Wallet API to *whitelist* wallets by
looping thru csv 

Be sure the input/output csvs are updated accordingly
```
//IMPORTANT: CHANGE THESE VALUES TO THE RELEVANT NEW FILES
const outputCsv = './external-matic-addresses.csv';
const inputCsv = '../random_eth.csv';
```

usage:
`node customer-scripts/external_wallets.js`

Result will be an output CSV with the following format: in invictus-addresses.csv
```
id,address,name,uuid,amount
4a625b91-0a49-4931-8607-7c67d8fddc58,0x0a1bd3c44800b838a1cbe44703f222564ec2cd14,Jovial_Hedgehog_819.7581218219924,f3d1c5ca-3c4f-436b-88d0-84d5166ce55b,0.001
d63dbaf6-0e9f-41b2-af7c-b81ef38e47a9,0x3dd2adf5e9c42cfbd8e295648d4ee1b16b74e2ee,Daring_Platypus_776.3620025456147,346f467e-955e-4fde-b0d5-8c4e692d0e36,0.001
```

### Step 2: Create Payment Workflow with wallet IDs
Use the previous CSV to create a payment workflow. It'll create workflow instruction sets, in batches of 200. (calls /workflow-config API under the hood).
_Note:_ we can review the output csv to make sure that all external wallets have been successfully created, by ensuring there's no N/A entries. Also, larger csv files may result in the admin approval process taking a bit longer. One way to check this is to ensure that the prompts from the mobile console disappear.


### Create Workflow Execution
Usage: 

`node customer-scripts/create_payments_workflow.js`


- Calls /workflow-config API
- Inputs are workflow ‘id’ from previous step. 
- Converts output JSON to CSV format.
- Client reviews the Workflow CSV and confirms its accuracy.
- Client executes the Workflow manually through the Fireblocks console.  

Output/Result: 
- Can view config ID 
- output CSV is in format:

```
Address,Wallet ID,Asset ID,Amount,Workflow Name
0x0a1bd3c44800b838a1cbe44703f222564ec2cd14,4a625b91-0a49-4931-8607-7c67d8fddc58,USDC_TEST,0.001,disbursement-1
```

This is the final CSV we will review before executing the payment disbursement.
### Step 3. Create and Execute Flow Execution

Take Workflow Config ID in Postman Collection:

1. POST /payments/workflow-execution

Note the execution ID, and pass into:

2. POST /payments/workflow-execution/{execution-id}/actions/execute

Should execute and launch workflow.
