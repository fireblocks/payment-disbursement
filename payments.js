POST /workflow-config
{
  “configName”: “my-config”,
  “configOperations”: [
    {
      “type”: “DISBURSEMENT”,
      “params”: {
        “paymentAccount”: {
          “accountId”: “ab12-cd34”,
          “accountType”: “EXCHANGE_ACCOUNT”
        },
        “instructionSet”: [
          {
            “payeeAccount”: {
              “accountId”: “cc33-11aa”,
              “accountType”: “VAULT_ACCOUNT”
            },
            “assetId”: “USDC”,
            “amount”: “130000”
          },
          {
            “payeeAccount”: {
              “accountId”: “2ba-1cd”,
              “accountType”: “EXCHANGE_ACCOUNT”
            },
            “assetId”: “USDC”,
            “amount”: “90000"
          }
        ]
      }
    }
  ],
}