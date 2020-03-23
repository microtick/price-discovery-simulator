const Microtick = require('./microtick')

const state = {}
const mtm = new Microtick(state)

const acct1 = '0x1234512345123451234512345123451234512345'
const acct2 = '0x6789067980679806798067980679806798067980'

mtm.createAccount(acct1)
mtm.createAccount(acct2)

mtm.depositAccount(acct1, 10000)
mtm.depositAccount(acct2, 10000)

mtm.createMarket("ETHUSD")

const q1 = mtm.createQuote(0, acct1, "ETHUSD", 300, 100.5, 1, 20)
const q2 = mtm.createQuote(0, acct1, "ETHUSD", 300, 101, 0.5, 10)
mtm.createQuote(0, acct1, "ETHUSD", 300, 101, 1.1, 1000)
const q3 = mtm.createQuote(0, acct2, "ETHUSD", 900, 99, 3, 10)

mtm.createTrade(1, acct2, "ETHUSD", 300, 0, 5)
//mtm.limitTrade(1, acct2, "ETHUSD", 300, 0, .1, 2)

//mtm.updateBlock(100)
//mtm.settleTrades(400)

console.log(JSON.stringify(state, null, 2))
console.log("consensus=" + state.markets.ETHUSD.consensus)

