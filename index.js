let axios = require("axios")
let hive = require("@hiveio/hive-js")

let rpcAPI = "https://api.hive-engine.com/rpc/contracts"
let notToDump = ["GIFT", "STARBITS", "LEO"]
let username = ""
let privateActiveKey = ""


/**
 * Gets balances
 */
async function getBalances() {
  let getBalancesQuery = { id: 0, jsonrpc: "2.0", method: "find", params: { contract: "tokens", table: "balances", query: { account: username, $expr: { $gt: [{ $toDouble: "$balance" }, 0] } }, limit: 1000, offset: 0, indexes: [] } }
  let result = await axios.post(rpcAPI, getBalancesQuery)
  let balances = result.data.result
  console.log(result.data)
  let validBalances = {}
  for (let i in balances) {
    let balance = balances[i]
    if (parseFloat(balance.balance) !== 0 && !notToDump.includes(balance.symbol)) {
      validBalances[balance.symbol] = parseFloat(balance.balance)
    }
  }
  delete validBalances["SWAP.HIVE"]
  return validBalances
}

/**
 * Places orders
 */
async function placeOrders() {
  let balances = await getBalances()
  if (balances.length === 0) {
    console.log(`Nothing to sell. Ending`)
    return
  }
  let sellJSON = []
  for (let i in balances) {
    sellJSON.push({ "contractName": "market", "contractAction": "marketSell", "contractPayload": { "symbol": i, "quantity": balances[i].toString() } })
    if (sellJSON.length >= 50) {
      break
    }
  }
  hive.broadcast.customJson(privateActiveKey, [username], null, "ssc-mainnet-hive", JSON.stringify(sellJSON), (err, result) => {
    if (err) {
      console.log(`Error with reason : ${err}`)
    } else {
      console.log(`Listed for sale. If there is more going for a second round in 30 seconds, otherwise ending.`)
      if (sellJSON.length === 50) {
        setTimeout(() => {
          placeOrders()
        }, 1000 * 10)
      }
    }
  })
}

placeOrders()