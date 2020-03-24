const BN = require('bignumber.js')
const seedrandom = require('seedrandom')
const rng = seedrandom()
const Microtick = require('./microtick')

const MARKET = "sim"
const ACCT_MM = "0x1234567890123456789012345678901234567890"
const ACCT_TRADER = "0x9876543210987654321098765432109876543210"

const scale = 2 
const defaultState = {
  model: {
    // this is where the Microtick backend data lives
  },
  rates: {
    createQuote: 0.03 * scale,
    updateQuote: 0.05 * scale,
    cancelQuote: [ 
      0.00002 * scale,
      0.00004 * scale, 
      0.00010 * scale, 
      0.0002 * scale, 
      0.0003 * scale, 
      0.001 * scale, 
      0.001 * scale, 
      0.001 * scale, 
      0.002 * scale, 
      0.005 * scale 
    ],
    placeTrade: 0.04 * scale
  },
  sizes: {
    createQuote: {
      v: 4,
      s: 0.8
    },
    cancelQuote: {
      v: 4,
      s: 0.8
    },
    placeTrade: {
      v: 2,
      s: 0.8
    }
  },
  max: {
    depth: 10
  }
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

const sum = (arr) => {
  return arr.reduce((acc, el) => {
    return acc.plus(el.rate)
  }, new BN(0))
}

const pickBucket = arr => {
  const s = sum(arr)
  const r = s.multipliedBy(rng())
  const draw = arr.reduce((acc, el) => {
    acc[1] = acc[1].plus(el.rate)
    if (acc[1].isLessThan(r)) {
      acc[0]++
    }
    return acc
  }, [0, new BN(0)])
  return [r, draw[0], s]
}

class MarketMaker {
  
  constructor(cb) {
    console.log("Creating market maker")
    this.state = defaultState
    this.cb = cb
    this.mt = new Microtick(this.state.model)
    this.mt.createMarket(MARKET)
    this.mt.createAccount(ACCT_MM, 100000)
    this.mt.createAccount(ACCT_TRADER, 100000)
    this.durs = [300, 900, 3600]
    
    this.nextUpdate = 0
    
    this.setState = this.setState.bind(this)
  }
  
  setState(newState) {
    this.state.rates.createQuote = parseFloat(newState.createRate)
    this.state.rates.updateQuote = parseFloat(newState.updateRate)
    this.state.rates.placeTrade = parseFloat(newState.tradeRate)
    this.state.rates.cancelQuote = newState.cancelRate.map(r => parseFloat(r))
    
    this.state.sizes.createQuote.v = parseFloat(newState.createSizeV)
    this.state.sizes.createQuote.s = parseFloat(newState.createSizeS)
    this.state.sizes.cancelQuote.v = parseFloat(newState.cancelSizeV)
    this.state.sizes.cancelQuote.s = parseFloat(newState.cancelSizeS)
    this.state.sizes.placeTrade.v = parseFloat(newState.tradeSizeV)
    this.state.sizes.placeTrade.s = parseFloat(newState.tradeSizeS)
    
    this.state.max.depth = parseInt(newState.maxDepth, 10)
  }
  
  update(now, feed) {
    const market = this.state.model.markets[MARKET]
    
    // Compute underlying vol estimate on 15minute, 1hour window
    const vol15 = this.arrayStd(feed.bars1minute.slice(-16).map(b => {
      return b.c
    })) * Math.sqrt(1/15)
    const vol60 = this.arrayStd(feed.bars1minute.slice(-61).map(b => {
      return b.c
    })) * Math.sqrt(1/60)
    const vol = (vol15 + vol60) / 2
    
    if (vol > 0) {
    
      const externalSpot = (feed.bid + feed.ask) / 2
      const consensus = this.mt.consensusSpot(MARKET)
      
      // random noise signal based on spread to estimate geographic disparity
      // note: not using vol here because that's time-based uncertainty. trying to
      // find a proxy for geographic disparity and latency here.
      const spread = feed.ask - feed.bid
      const spot = externalSpot + normal() * spread / 2
      
      var loops = 0
      while (this.nextUpdate < now && loops < 10) {
        
        const ratearray = []
        for (var i=0; i<this.durs.length; i++) {
          const dur = this.durs[i]
          const ob = market.orderbooks[dur]
      
          const obj = this.blackscholes(spot, spot, vol, dur / 60, 0)
          const premium = (obj.call + obj.put) / 2 
        
          if (premium > 0) {
        
            // Create quote
            if (ob.base.length < this.state.max.depth) {
              ratearray.push({
                rate: new BN(this.state.rates.createQuote),
                debug: "create",
                handler: () => {
                  const quantity = lognormal(this.state.sizes.createQuote.v, this.state.sizes.createQuote.s)
                  const backing = quantity.multipliedBy(premium*10)
                  //console.log("MT create quote: " + dur + " "  + quantity.toFixed(2))
                  this.mt.createQuote(feed.time, ACCT_MM, MARKET, dur, spot, premium, backing.toNumber())
                }
              })
            }
            
            // Cancel quote
            for (var j=0; j<this.state.rates.cancelQuote.length; j++) {
              const rc = this.state.rates.cancelQuote[j]
              if (j < ob.base.length) {
                const id = ob.base[j]
                const quote = this.state.model.activeQuotes[id]
                const quantity = lognormal(this.state.sizes.cancelQuote.v, this.state.sizes.cancelQuote.s)
                const backing = quantity.multipliedBy(premium*10)
                ratearray.push({
                  rate: new BN(rc),
                  debug: "cancel " + j,
                  handler: () => {
                    //console.log("MT cancel quote: " + quote.id)
                    if (backing.toNumber() >= quote.backing) {
                      // Cancel quote
                      this.mt.cancelQuote(feed.time, ACCT_MM, quote.id)
                    } else {
                      // Withdraw quote
                      this.mt.withdrawQuote(feed.time, ACCT_MM, quote.id, backing.toNumber())
                    }
                  }
                })
              }
            }
            
            // Update quote
            for (j=0; j<ob.base.length; j++) {
              const id = ob.base[j]
              const quote = this.state.model.activeQuotes[id]
              ratearray.push({
                rate: new BN(this.state.rates.updateQuote).multipliedBy(Math.abs(quote.spot - spot) / quote.premium),
                debug: "update " + j,
                handler: () => {
                  //console.log("MT update quote: " + quote.id)
                  this.mt.updateQuote(feed.time, ACCT_MM, quote.id, spot, premium)
                }
              }) 
            }
            
            // Trade
            if (ob.base.length > 0) {
              const bestCall = this.state.model.activeQuotes[ob.calls[0]]
              const bestPut = this.state.model.activeQuotes[ob.puts[0]]
              const bestCallPremium = bestCall.premium + (consensus - bestCall.spot) / 2
              const bestPutPremium = bestPut.premium - (consensus - bestPut.spot) / 2
              ratearray.push({
                rate: new BN(this.state.rates.placeTrade).multipliedBy(Math.abs(consensus - spot) / premium),
                debug: "trade",
                handler: () => {
                  var quantity = lognormal(this.state.sizes.placeTrade.v, this.state.sizes.placeTrade.s).toNumber()
                  if (quantity > ob.sumWeight) {
                    quantity = ob.sumWeight
                  }
                  if (bestCallPremium <= bestPutPremium) {
                    this.mt.createTrade(feed.time, ACCT_TRADER, MARKET, dur, 0, quantity)
                  } else {
                    this.mt.createTrade(feed.time, ACCT_TRADER, MARKET, dur, 1, quantity)
                  }
                }
              })
            }
          }
        }
        
        if (ratearray.length > 0) {
          const draw = pickBucket(ratearray)
          const tao = exp(draw[2])
        
          // handler
          try {
            ratearray[draw[1]].handler()
          } catch (err) {
            console.log(err) 
          }
        
          if (consensus > 0) {
            this.cb({
              time: this.nextUpdate,
              consensus: consensus
            })
          }
          this.nextUpdate += tao.toNumber()
        } else {
          this.nextUpdate = now
        }
        loops++
      }
      
      // Trade expirations
      const expirations = this.state.model.tradeExpirations
      if (expirations.length > 0 && expirations[0].expiration < now) {
        this.mt.settleTrades(feed.time)
      }
    }
  }
  
  feedUpdate(now) {
    this.nextUpdate = now
  }
  
  arrayStd(dataArr) {
    var length = dataArr.length
    if (length <= 2) return 0
    
    // Compute volatility
    var avg = 0;
    for (var i=0; i<dataArr.length; i++) {
        avg += dataArr[i]
    }
    avg /= dataArr.length
    var std = 0
    for (i=0; i<dataArr.length; i++) {
        std += Math.pow(dataArr[i] - avg, 2)
    }
    std = Math.sqrt(std/dataArr.length)
    return std 
  }
  
  erf(x) {
    // save the sign of x
    var sign = (x >= 0) ? 1 : -1
    x = Math.abs(x)
  
    // constants
    var a1 =  0.254829592
    var a2 = -0.284496736
    var a3 =  1.421413741
    var a4 = -1.453152027
    var a5 =  1.061405429
    var p  =  0.3275911
  
    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x)
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
    return sign * y // erf(-x) = -erf(x) 
  }

  cdf(x, mean, variance) {
    return 0.5 * (1 + this.erf((x - mean) / (Math.sqrt(2 * variance))))
  }
  
  ln(x) {
    return Math.log(x)
  }
  
  // Standard Normal variate using Box-Muller transform.
  randn_bm() {
    var u = 0, v = 0
    while (u === 0) u = rng() // Converting [0,1) to (0,1)
    while (v === 0) v = rng()
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )
  }
  
  blackscholes(spot, strike, vol, T, r) {
    // OP = S * N(d1) - X * exp(-r * t) * N(d2)
    // d1 = (ln(S/X) + (r + v^2/2) * t) / (v * sqrt(t))
    // d2 = d1 - v * sqrt(t)
    // S = spot price
    // X = strike price
    // t = time remaining, percent of a year
    // r = risk-free interest rate, continuously compounded
    // v = annual volatility (std dev of short-term returns over 1 year)
    //      square root of the mean of the squared deviations of close-close log returns
    if (vol > 0) {
      var d1 = (this.ln(spot / strike) + (r + vol * vol / 2.0) * T) / (vol * Math.sqrt(T))
    } else {
      d1 = 0
    }
    var d2 = d1 - vol * Math.sqrt(T)
    var C = spot * this.cdf(d1, 0, 1) - strike * this.cdf(d2, 0, 1) * Math.exp(-r * T)
    var P = C - spot + strike * Math.exp(-r * T)
    return { call: C, put: P }    
  }
  
}

module.exports = MarketMaker