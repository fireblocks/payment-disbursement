// 1. Client prepares a disbursement recipient list, in CSV format
// Recipient Display name, UUID (optional), blockchain asset, deposit address, amount (to payout).

CSV1:

DisplayName | uuid | asset | deposit_address | amount
--------------------------------------------------------
e
// 2. Fireblocks PS runs “Create User Wallets” scripts - 
// Calls Create External Wallet API (script 1)
loop thru csv 
async function createExternalWallet(name){
    const externalWallet = await fireblocks.createExternalWallet(name);
    console.log(JSON.stringify(externalWallet, null, 2));
}

createExternalWallet("Counter-Party Wallet #1");

// Inputs are from the CSV file provided by the client -  Display Name, Customer Ref ID (UUID if provided).
// Script stores wallet ‘id’ returned.
write to csv 


// Calls Add Asset to External Wallet API (script 2)
// Inputs are wallet ‘id’ from above step, and then asset Id (blockchain asset) and deposit address from the client’s initial CSV file.
async function createExternalWalletAsset(walletContainerId, assetId, address, tag){
    const externalWalletAsset = await fireblocks.createExternalWalletAsset(walletContainerId, assetId, address, tag);
    console.log(JSON.stringify(externalWalletAsset, null, 2));
}

createExternalWalletAsset("d01b9b9f-4c3b-425c-8f8b-78b3f5734549", "ETH_TEST5", "0xEA6A3E367e96521fD9E8296425a44EFa6aee82da", "test");

// Fireblocks PS runs a Create Workflow script (script 3) - 
// Calls /workflow-config API
// Inputs are Payee Id, which is wallet ‘Id’ from the first script, Payee Type is constant at ‘EXTERNAL_WALLET’, asset ‘id’ from script 2 becomes ‘assetId’, wallet display ‘name’ becomes ‘Payee Name’, amount from client CSV becomes payment ‘amount’.  
// Fireblocks PS calls Get workflow (script 4).

1. create configuration (one time)

2. checking config is valid using workflow-config

3. USDC => account A to account B => C 
phase 


1. create workflow execution
POST workflow-execution ID to initiate TransformStream


// Calls /workflow-config API
// Inputs are workflow ‘id’ from previous step. 


// Converts output JSON to CSV format.
// Client reviews the Workflow CSV and confirms its accuracy.
// Client executes the Workflow manually through the Fireblocks console.  
// Transactions are signed automatically with the API Co-Signer.
