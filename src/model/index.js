const ob = require('./orderbook')
const MarketMaker = require("./mt/MarketMaker")

const WINDOW_SIZE_TICK=900
const WINDOW_SIZE_1MIN_BAR=7200
const WINDOW_SIZE_5MIN_BAR=14400

const DATATYPE_TICK=0
const DATATYPE_BAR1=1
const DATATYPE_BAR5=2

const TIMESPANS_TICK=[300, 900]

const defaultState = {
  datatype: DATATYPE_BAR1,
  timespans: TIMESPANS_TICK,
  time: {
    startTime: 0,
    stopTime: 0,
    modelTime: 0,
    elapsedTime: 0,
    windowSize: WINDOW_SIZE_1MIN_BAR
  },
  orderbook: {
    bids: [],
    asks: [],
    insideBid: 0,
    insideAsk: 0
  },
  microtick: {},
  feed: {
    time: 0,
    last: 10,
    ticks: [],
    bars1minute: [],
    bars5minute: [],
    mtspot: 0,
    microtick: []
  },
  params: {
    orderbook: ob.getState(),
    setter: ob.setState
  }
}

class API {
  
  constructor() {
    this.state = defaultState
    this.started = false
    ob.setCallbacks(this.orderbookCallback.bind(this), this.tickCallback.bind(this))
    this.marketmaker = new MarketMaker(this.mtCallback.bind(this))
    this.state.microtick = this.marketmaker.state
    this.state.params.mtsetter = this.marketmaker.setState
  }
  
  register(ux) {
    this.ux = ux
    return this.state
  }
  
  start() {
    if (!this.started) {
      this.timer = setInterval(this.timerTick.bind(this), 10)
      this.state.time.startTime += Date.now() - this.state.time.stopTime
      this.started = true
      this.state.feed.ticks = []
    }
  }
  
  stop() {
    if (this.started) {
      this.state.time.stopTime = Date.now()
      clearInterval(this.timer)
      this.started = false
      console.log(JSON.stringify(this.state, null, 4))
      console.log("MT next update=" + this.marketmaker.nextUpdate)
    }
  }
  
  timerTick() {
    const now = Date.now()
    
    const elapsedTime = Math.floor(now - this.state.time.startTime) / 1000
    this.state.time.elapsedTime = elapsedTime
    
    const modelTime = elapsedTime * 5
    this.state.time.modelTime = modelTime
    
    ob.update(modelTime)
    this.marketmaker.update(modelTime, this.state.feed)
    
    if (this.ux !== null) {
      this.ux.update(this.state)
    }
    while (this.state.feed.ticks.length > 0 && this.state.feed.ticks[0].time < modelTime - WINDOW_SIZE_TICK) {
      this.state.feed.ticks.shift()
    }
    while (this.state.feed.bars1minute.length > 0 && this.state.feed.bars1minute[0].t < modelTime - WINDOW_SIZE_1MIN_BAR) {
      this.state.feed.bars1minute.shift()
    }
    while (this.state.feed.bars5minute.length > 0 && this.state.feed.bars5minute[0].t < modelTime - WINDOW_SIZE_5MIN_BAR) {
      this.state.feed.bars5minute.shift()
    }
    while (this.state.feed.microtick.length > 0 && this.state.feed.microtick[0].t < modelTime - WINDOW_SIZE_1MIN_BAR) {
      this.state.feed.microtick.shift()
    }
  }
  
  orderbookCallback(obstate) {
    this.state.orderbook = obstate
    this.state.feed.bid = parseFloat(obstate.insideBid)
    this.state.feed.ask = parseFloat(obstate.insideAsk)
    this.ux.update(this.state)
  }
  
  tickCallback(obj) {
    const tick = obj.data
    const now = obj.time
    this.state.feed.time = now
    this.state.feed.last = tick
    this.state.feed.lasttype = obj.type
    this.state.feed.ticks.push({
      time: now,
      tick: tick
    })
    while (this.state.feed.ticks[0].time < now - WINDOW_SIZE_TICK) {
      this.state.feed.ticks.shift()
    }
    
    if (this.state.feed.bars1minute.length === 0) {
      this.state.feed.bars1minute.push({
        t: now - (now % 60) + 60,
        o: tick,
        h: tick,
        l: tick
      })
    }
    var bar = this.state.feed.bars1minute[this.state.feed.bars1minute.length-1]
    if (now > bar.t) {
      bar = {
        t: now - (now % 60) + 60,
        o: tick,
        h: tick,
        l: tick
      }
      this.state.feed.bars1minute.push(bar)
    }
    if (bar.h < tick) bar.h = tick
    if (bar.l > tick) bar.l = tick
    bar.c = tick
    
    if (this.state.feed.bars5minute.length === 0) {
      this.state.feed.bars5minute.push({
        t: now - (now % 300) + 300,
        o: tick,
        h: tick,
        l: tick
      })
    }
    bar = this.state.feed.bars5minute[this.state.feed.bars5minute.length-1]
    if (now > bar.t) {
      bar = {
        t: now - (now % 300) + 300,
        o: tick,
        h: tick,
        l: tick
      }
      this.state.feed.bars5minute.push(bar)
    }
    if (bar.h < tick) bar.h = tick
    if (bar.l > tick) bar.l = tick
    bar.c = tick
    
    this.marketmaker.feedUpdate(now)
  }
  
  mtCallback(obj) {
    const now = obj.time
    const consensus = obj.consensus
    
    if (this.state.feed.microtick.length === 0) {
      this.state.feed.microtick.push({
        t: now - (now % 60) + 60,
        h: consensus,
        l: consensus,
        c: consensus
      })
    }
    var bar = this.state.feed.microtick[this.state.feed.microtick.length-1]
    if (now > bar.t) {
      const newbar = {
        t: now - (now % 60) + 60,
        h: bar.c,
        l: bar.c
      }
      this.state.feed.microtick.push(newbar)
      bar = newbar
    }
    if (bar.h < consensus) bar.h = consensus
    if (bar.l > consensus) bar.l = consensus
    bar.c = consensus
    
    this.ux.update(this.state)
  }
}

const api = new API()
export default api
