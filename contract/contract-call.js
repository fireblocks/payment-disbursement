const { FireblocksWeb3Provider, ChainId, ApiBaseUrl } = require("@fireblocks/fireblocks-web3-provider")
const Web3 = require("web3");

// Import the Goerli USDC ABI
const ABI = require("../contract/abi.json");

// Goerli USDC Contract Address
const CONTRACT_ADDRESS = "0x014497a2aef847c7021b17bff70a68221d22aa63"

const eip1193Provider = new FireblocksWeb3Provider({
    privateKey: process.env.FIREBLOCKS_API_PRIVATE_KEY_PATH,
    apiKey: process.env.FIREBLOCKS_API_KEY,
    vaultAccountIds: process.env.FIREBLOCKS_VAULT_ACCOUNT_IDS,
    chainId: ChainId.POLYGON,
 // apiBaseUrl: ApiBaseUrl.Sandbox // If using a sandbox workspace
});


(async() => {
  
  	const web3 = new Web3(eip1193Provider);
  	const myAddr = await web3.eth.getAccounts()
  	const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
  	const spenderAddr = "<spender_address>"

    // 1 USDC to approve 
    const amount = 1e6

    // Invoke approve method
    console.log(
        await contract.methods.approve(spenderAddr, amount).send({
            from: myAddr[0]
        })
    )

})().catch(error => {
    console.log(error)
});