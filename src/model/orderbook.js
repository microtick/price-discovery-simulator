const BN = require('bignumber.js')
const seedrandom = require('seedrandom')
const rng = seedrandom()

// Logging
const log_orders = false

// Order book depth
const K = 9
const default_maxDepth = 20
const default_maxMarketOrderTicks = 4

const tscale = 1

// order arrival rates
const default_l_M = 0.1237 / tscale
const default_buy_prob = 50
const default_l_L = [ 
  0.2842 / tscale,
  0.5255 / tscale,
  0.2971 / tscale,
  0.2307 / tscale,
  0.0826 / tscale,
  0.0682 / tscale,
  0.0631 / tscale,
  0.0481 / tscale,
  0.0462 / tscale,
  0.0321 / tscale,
  0.0178 / tscale,
  0.0015 / tscale,
  0.0001 / tscale
]
const default_l_C = [ 
  0.8636 / tscale,
  0.4635 / tscale,
  0.1487 / tscale,
  0.1096 / tscale,
  0.0402 / tscale,
  0.0341 / tscale,
  0.0311 / tscale,
  0.0237 / tscale,
  0.0233 / tscale,
  0.0178 / tscale,
  0.0127 / tscale,
  0.0012 / tscale,
  0.0001 / tscale
]

// order sizes
const default_v_M = 4.00
const default_s_M = 1.19
const default_v_L = 4.47
const default_s_L = 0.83
const default_v_C = 4.48
const default_s_C = 0.82

// Boundary condition = quantity as bid / ask depth -> infinity
const default_inf = 1000

// order types
const TYPE_BUY_MARKET = 0
const TYPE_SELL_MARKET = 1
const TYPE_BUY_LIMIT = 2
const TYPE_SELL_LIMIT = 3
const TYPE_CANCEL_ASK = 4
const TYPE_CANCEL_BID = 5

const state = {
  rates: {
    market: default_l_M,
    buy_prob: default_buy_prob,
    limit: default_l_L,
    cancel: default_l_C
  },
  sizes: {
    market: {
      v: default_v_M,
      s: default_s_M
    },
    limit: {
      v: default_v_L,
      s: default_s_L
    },
    cancel: {
      v: default_v_C,
      s: default_s_C
    },
    infinity: default_inf
  },
  max: {
    depth: default_maxDepth,
    marketTicks: default_maxMarketOrderTicks
  }
}

const getModelState = () => {
  return {
    rates: {
      market: state.rates.market,
      buy_prob: state.rates.buy_prob,
      limit: state.rates.limit.slice(),
      cancel: state.rates.cancel.slice()
    },
    sizes: {
      market: {
        v: state.sizes.market.v,
        s: state.sizes.market.s
      },
      limit: {
        v: state.sizes.limit.v,
        s: state.sizes.limit.s
      },
      cancel: {
        v: state.sizes.cancel.v,
        s: state.sizes.cancel.s
      },
      infinity: state.sizes.infinity
    },
    max: {
      depth: state.max.depth,
      marketTicks: state.max.marketTicks
    }
  }
}

const setModelState = newState => {
  state.rates.market = parseFloat(newState.market_rate)
  state.rates.buy_prob = parseFloat(newState.buy_prob)
  state.sizes.market.v = parseFloat(newState.market_v)
  state.sizes.market.s = parseFloat(newState.market_s)
  state.rates.limit = newState.limit_rates.map(r => parseFloat(r))
  state.sizes.limit.v = parseFloat(newState.limit_v)
  state.sizes.limit.s = parseFloat(newState.limit_s)
  state.rates.cancel = newState.cancel_rates.map(r => parseFloat(r))
  state.sizes.cancel.v = parseFloat(newState.cancel_v)
  state.sizes.cancel.s = parseFloat(newState.cancel_s)
  state.sizes.infinity = parseFloat(newState.boundary)
  state.max.depth = parseFloat(newState.max_depth)
  state.max.marketTicks = parseFloat(newState.max_ticks)
}

const normal = () => {
  var u = 0, v = 0
  while (u === 0) u = rng() // Converting [0,1) to (0,1)
  while (v === 0) v = rng()
  return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )
}

const exp = lambda => {
  const r = rng()
  const v = new BN(-Math.log(r)/lambda)
  return v
}

const lognormal = (mu, sigma) => {
  return new BN(Math.exp(mu + normal() * sigma))
}

const fill = (n, val) => {
  const arr = Array(n)
  for (var i=0; i<n; i++) {
    arr[i] = new BN(val)
  }
  return arr
}

const sum = (arr) => {
  return arr.reduce((acc, el) => {
    return acc.plus(el)
  }, new BN(0))
}

const pickBucket = arr => {
  const s = sum(arr)
  const r = s.multipliedBy(rng())
  const draw = arr.reduce((acc, el) => {
    acc[1] = acc[1].plus(el)
    if (acc[1].isLessThan(r)) {
      acc[0]++
    }
    return acc
  }, [0, new BN(0)])
  return [r, draw[0], s]
}

// Initial spread = 1
const basePrice = 10
const ticksPerUnit = 100
var pa = 1
var pb = -1

var a = fill(K, state.sizes.infinity)
var b = fill(K, state.sizes.infinity)
a[0] = new BN(0)
b[0] = new BN(0)

var a0 = 0
var b0 = 0
var last = 0

var nextUpdate = 0

var callbackOB, callbackTick

const update = now => {
  while (nextUpdate < now) {
  
    // Print order book
    /*
    console.log("T=" + t)
    console.log("Inside bid=" + new BN(basePrice + pb / ticksPerUnit).toFixed(2) + " pa=" + new BN(basePrice + pa / ticksPerUnit ).toFixed(2))
    var bids = "[" + b.reduce((acc, el, n) => {
      var comma = ""
      if (n > 0) comma = ","
      acc = el.toFixed(0) + comma + acc
      return acc
    }, "") + "]"
    var asks = a.reduce((acc, el, n) => {
      acc += el.toFixed(0)
      if (n < a.length - 1) acc += ","
      return acc
    }, "[") + "]"
    console.log("Before Bids: " + bids + " Asks: " + asks)
    */
    
    // Compute weighted event rates
    const callBidRates = b.map((el, n) => {
      if (n >= state.rates.cancel.length) return new BN(0)
      return new BN(state.rates.cancel[n]).multipliedBy(el).dividedBy(1000)
    })
    
    const callAskRates = a.map((el, n) => {
      if (n >= state.rates.cancel.length) return new BN(0)
      return new BN(state.rates.cancel[n]).multipliedBy(el).dividedBy(1000)
    })
    
    const limitRates = state.rates.limit.map(el => {
      return new BN(el)
    })
    
    // Draw waiting time
    const eventRates = [
      new BN(state.rates.market),
      new BN(state.rates.market),
      sum(limitRates),
      sum(limitRates),
      sum(callAskRates),
      sum(callBidRates)
    ]
    
    // Draw the new event
    const draw = pickBucket(eventRates)
    const tao = exp(draw[2])
    var type = draw[1]
    
    // Readjust buy / sell probability based on percentage set
    if (type === TYPE_BUY_MARKET || type === TYPE_SELL_MARKET) {
      const buysell = rng() * 100
      if (buysell < state.rates.buy_prob) {
        type = TYPE_BUY_MARKET
      } else {
        type = TYPE_SELL_MARKET
      }
    }
    
    if (type === TYPE_BUY_MARKET) {
      var q = lognormal(state.sizes.market.v, state.sizes.market.s)
      if (log_orders) console.log("Buy Market " + q.toFixed(2))
      last = a0
      for (var i=0; i < state.max.marketTicks && q.isGreaterThan(0); i++) {
        if (i >= a.length) {
          a.push(new BN(state.sizes.infinity))
        }
        last = a0 + i
        if (q.isGreaterThanOrEqualTo(a[i])) {
          q = q.minus(a[i])
          a[i] = new BN(0)
        } else {
          a[i] = a[i].minus(q)
          q = new BN(0)
        }
      }
      callbackTick({
        time: nextUpdate,
        type: "buy",
        data: parseFloat(new BN(basePrice + last / ticksPerUnit).toFixed(2))
      })
    }
    if (type === TYPE_SELL_MARKET) {
      q = lognormal(state.sizes.market.v, state.sizes.market.s)
      if (log_orders) console.log("Sell Market " + q.toFixed(2))
      last = b0
      for (i=0; i < state.max.marketTicks && q.isGreaterThan(0); i++) {
        if (i >= b.length) {
          b.push(new BN(state.sizes.infinity))
        }
        last = b0 - i
        if (q.isGreaterThanOrEqualTo(b[i])) {
          q = q.minus(b[i])
          b[i] = new BN(0)
        } else {
          b[i] = b[i].minus(q)
          q = new BN(0)
        }
      }
      callbackTick({
        time: nextUpdate,
        type: "sell",
        data: parseFloat(new BN(basePrice + last / ticksPerUnit).toFixed(2))
      })
    }
    if (type === TYPE_BUY_LIMIT) {
      q = lognormal(state.sizes.limit.v, state.sizes.limit.s)
      const bucket = pickBucket(limitRates)[1]
      if (log_orders) console.log("Buy Limit " + bucket + " " + q.toFixed(2))
      while (b.length <= bucket) {
        b.push(new BN(state.sizes.infinity))
      }
      b[bucket] = b[bucket].plus(q)
    }
    if (type === TYPE_SELL_LIMIT) {
      q = lognormal(state.sizes.limit.v, state.sizes.limit.s)
      const bucket = pickBucket(limitRates)[1]
      if (log_orders) console.log("Sell Limit " + bucket + " " + q.toFixed(2))
      while (a.length <= bucket) {
        a.push(new BN(state.sizes.infinity))
      }
      a[bucket] = a[bucket].plus(q)
    }
    if (type === TYPE_CANCEL_ASK) {
      q = lognormal(state.sizes.cancel.v, state.sizes.cancel.s)
      const bucket = pickBucket(callAskRates)[1]
      if (log_orders) console.log("Cancel Ask " + bucket + " " + q.toFixed(2))
      if (a[bucket].isGreaterThanOrEqualTo(q)) {
        a[bucket] = a[bucket].minus(q)
      } else {
        a[bucket] = new BN(0)
      }
    }
    if (type === TYPE_CANCEL_BID) {
      q = lognormal(state.sizes.cancel.v, state.sizes.cancel.s)
      const bucket = pickBucket(callBidRates)[1]
      if (log_orders) console.log("Cancel Bid " + bucket + " " + q.toFixed(2))
      if (b[bucket].isGreaterThanOrEqualTo(q)) {
        b[bucket] = b[bucket].minus(q)
      } else {
        b[bucket] = new BN(0)
      }
    }
    
    // Compute best bid and best ask
    for (i=0; i<a.length && a[i].isZero(); i++) {}
    if (i === a.length) a.push(new BN(state.sizes.infinity))
    pa = a0 + i
    for (i=0; i<b.length && b[i].isZero(); i++) {}
    if (i === b.length) b.push(new BN(state.sizes.infinity))
    pb = b0 - i
    
    // shift arrays 
    
    if (a0 > pb + 1) {
      //console.log("Ask shift left")
      const shift = a0 - pb - 1
      for (i=0; i<shift; i++) {
        a.unshift(new BN(0))
      }
      a0 = pb + 1
    } 
    if (a0 < pb + 1) {
      //console.log("Ask shift right")
      const shift = pb + 1 - a0
      a = a.slice(shift) 
      for (i=1; i<shift; i++) {
        a.push(new BN(state.sizes.infinity))
      }
      a0 = pb + 1
    }
    if (b0 > pa - 1) {
      //console.log("Bid shift left")
      const shift = b0 - pa + 1
      b = b.slice(shift)
      for (i=1; i<shift; i++) {
        b.push(new BN(state.sizes.infinity))
      }
      b0 = pa - 1
    } 
    if (b0 < pa - 1) {
      //console.log("Bid shift right")
      const shift = pa - 1 - b0
      for (i=0; i<shift; i++) {
        b.unshift(new BN(0))
      }
      b0 = pa - 1
    }
    
    // truncate extra inf entries
    a = a.slice(0, state.max.depth)
    b = b.slice(0, state.max.depth)
    
    //console.log()
    callbackOB({
      insideBid: new BN(basePrice + pb / ticksPerUnit).toFixed(2),
      insideAsk: new BN(basePrice + pa / ticksPerUnit).toFixed(2),
      bids: b.map(el => Math.floor(el.toNumber())),
      asks: a.map(el => Math.floor(el.toNumber())),
      refBid: b0,
      refAsk: a0,
      refLast: last,
      ticksPerUnit: ticksPerUnit,
      base: basePrice,
      time: parseFloat(new BN(nextUpdate).toFixed(2))
    })
    
    nextUpdate += tao.toNumber()
    
  } // while (nextUpdate < now)
}

module.exports = {
  update: update,
  setCallbacks: (ob, tick) => {
    callbackOB = ob
    callbackTick= tick
  },
  getState: getModelState,
  setState: setModelState
}
