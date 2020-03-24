import React from 'react'
import './Chart.css'

// percent
const OB_WIDTH = 20
const MT_WIDTH = 30

class Chart extends React.Component {
  
  render() {
    const feed = this.props.feed
    const orderbook = this.props.orderbook
    const microtick = this.props.microtick
    
    const elem = document.getElementById('chart')
    if (elem !== null) {
      this.bounds = elem.getBoundingClientRect()
    } else {
      return <g></g>
    }
    
    const mtlimits = Object.keys(microtick.activeQuotes).reduce((acc, k) => {
      const quote = microtick.activeQuotes[k]
      if (acc[0] > quote.spot - quote.premium) acc[0] = quote.spot - quote.premium
      if (acc[1] < quote.spot + quote.premium) acc[1] = quote.spot + quote.premium
      return acc
    }, [Number.MAX_VALUE, 0])
    
    const limits = feed.bars1minute.reduce((acc, b) => {
      if (acc[0] > b.l) acc[0] = b.l
      if (acc[1] < b.h) acc[1] = b.h
      return acc
    }, mtlimits)
    
    const minobp = orderbook.base + (orderbook.refBid - orderbook.bids.length + 1) / orderbook.ticksPerUnit
    const maxobp = orderbook.base + (orderbook.refAsk + orderbook.asks.length - 1) / orderbook.ticksPerUnit
    if (limits[0] > minobp) limits[0] = minobp
    if (limits[1] < maxobp) limits[1] = maxobp
    
    const delta = limits[1] - limits[0]
    const minp = limits[0] - delta * 0.1
    const maxp = limits[1] + delta * 0.1
    const yinc = Math.floor(this.bounds.height / ((maxp - minp) * orderbook.ticksPerUnit))
    
    const priceToY = p => {
      return this.bounds.height - (p - minp) * this.bounds.height / (maxp - minp)
    }
    
    // calculat screen real-estate bounds
    var ob_width = this.bounds.width * OB_WIDTH / 100
    if (ob_width > 250) ob_width = 250
    var mt_width = this.bounds.width * MT_WIDTH / 100
    if (mt_width > 250) mt_width = 250
    const chart_width = this.bounds.width - ob_width - mt_width
    const chart_right = ob_width + chart_width
    
    const midx = ob_width / 2
    const tics = []
    for (var i=Math.floor(minp*10)+1; i<=maxp*10; i++) {
      const y = priceToY(i/10)
      const xlabel = i/10 > orderbook.base + orderbook.refBid / orderbook.ticksPerUnit ? midx - 25 : midx + 10 
      tics.push(<line key={i} className="grid tic" x1={midx-5} y1={y} x2={midx+5} y2={y}/>)
      tics.push(<text key={i+.1} className="grid" x={xlabel} y={y+3}>{i/10}</text>)
      tics.push(<line key={i+.2} className="grid" x1={ob_width} y1={y} x2={chart_right} y2={y}/>)
      tics.push(<text key={i+.3} className="grid" x={ob_width + 10} y={y-6}>{i/10}</text>)
      tics.push(<text key={i+.4} className="grid" x={chart_right - 25} y={y-6}>{i/10}</text>)
    }
    const grid = <g>
      <line className="grid" x1={midx} y1={0} x2={midx} y2={this.bounds.height}/>
      {tics}
      <line className="separator" x1={ob_width} y1={0} x2={ob_width} y2={this.bounds.height}/>
      <line className="separator" x1={chart_right} y1={0} x2={chart_right} y2={this.bounds.height}/>
    </g>
    
    const maxBidWidth = orderbook.bids.reduce((acc, el) => {
      if (el > acc) return el
      return acc
    }, 0)
    const maxAskWidth = orderbook.asks.reduce((acc, el) => {
      if (el > acc) return el
      return acc
    }, 0)
    const maxWidth = maxAskWidth > maxBidWidth ? maxAskWidth : maxBidWidth
    if (maxWidth > 0) {
      var bids = orderbook.bids.map((b, n) => {
        const index = orderbook.refBid - n
        const w = (midx - 10) * b / maxWidth
        const x = midx - w
        const price = orderbook.base + (orderbook.refBid - n) / orderbook.ticksPerUnit
        const y = priceToY(price) - yinc / 2
        const r = <rect key={index} className="bid" x={x} y={y} width={w} height={yinc > 1 ? yinc-1 : 1}/>
        return r
      })
      var asks = orderbook.asks.map((a, n) => {
        const index = orderbook.refAsk + n
        const w = (midx - 10) * a / maxWidth
        const price = orderbook.base + (orderbook.refAsk + n) / orderbook.ticksPerUnit
        const y = priceToY(price) - yinc / 2
        const r = <rect key={index} className="ask" x={midx} y={y} width={w} height={yinc > 1 ? yinc-1 : 1}/>
        return r
      })
    }
    const ly = priceToY(feed.last)
    var lastclass = "lastlabel "
    lastclass += feed.lasttype
    const lastline = <g>
      <line className="last" x1={midx} y1={ly} x2={chart_right} y2={ly}/>
      <circle className="last" cx={midx} cy={ly} r={2}/>
    </g>
    const lastgroup = <g>
      <circle className="lastlabel" cx={ob_width + 20} cy={ly} r={8}/>
      <circle className="lastlabel" cx={ob_width + 45} cy={ly} r={8}/>
      <rect className="lastlabel" x={ob_width + 20} y={ly-8} width={25} height={16}/>
      <text className={lastclass} x={ob_width + 20} y={ly+3}>{feed.last}</text>
    </g>
    
    const windowSize = this.props.windowSize
    const chartStartTime = feed.time - (feed.time % 60) - windowSize
    const chartStartX = ob_width + 10
    const chartWidth = chart_width - 20
    /*
    if (feed.ticks.length > 0) {
      var lastX = ob_width
      //var lastY = midy - (feed.ticks[0].tick - orderbook.base) * orderbook.ticksPerUnit * yinc
      var lastY = priceToY(feed.ticks[0].tick)
      var prices = feed.ticks.map((t, n) => {
        const x = ob_width + (t.time - chartStartTime) * chart_width / windowSize
        const y = priceToY(t.tick)
        //const y = midy - (t.tick - orderbook.base) * orderbook.ticksPerUnit * yinc 
        const ret = <g key={n}>
          <line className="tick" x1={lastX} y1={lastY} x2={x} y2={lastY}/>
          <line className="tick" x1={x} y1={lastY} x2={x} y2={y}/>
          <circle className="tick" cx={x} cy={y} r={1}/>
        </g>
        lastX = x
        lastY = y
        return ret
      })
    }
    */
    if (feed.bars1minute.length > 0) {
      var prices = feed.bars1minute.map((b, n) => {
        if (b.t > chartStartTime) {
          const x = chartStartX + (b.t - 60 - (chartStartTime - (chartStartTime % 60))) * chartWidth / windowSize
          const o = priceToY(b.o)
          const h = priceToY(b.h)
          const l = priceToY(b.l)
          const c = priceToY(b.c)
          var ret = <g key={n}>
            <line className="bar" x1={x} y1={l} x2={x} y2={h}/>
            <line className="bar" x1={x} y1={o} x2={x-2} y2={o}/>
            <line className="bar" x1={x} y1={c} x2={x+2} y2={c}/>
          </g>
        }
        return ret
      })
    }
    
    if (microtick.markets !== undefined) {
      const market = microtick.markets["sim"]
      const mtdurs = [ 300, 900, 3600]
      
      const mty = priceToY(market.consensus)
      var xcur = chart_right
      var calls = mtdurs.reduce((acc, dur) => {
        const orderbook = market.orderbooks[dur]
        const callsfordur = orderbook.calls.map((c, n) => {
          const spot = microtick.activeQuotes[c].spot
          const premium = microtick.activeQuotes[c].premium
          const consensus = market.consensus
          const top = priceToY(market.consensus + premium + (spot - consensus) / 2)
          const w = microtick.activeQuotes[c].quantity * mt_width / market.sumWeight
          return {
            className: "mtquote q" + dur,
            y: top,
            width: w,
            height: mty - top < 0 ? 0 : mty - top
          }
        })
        return acc.concat(callsfordur)
      }, []).sort((x1, x2) => {
        return x1.height - x2.height
      }).map((c, n) => {
        const el = <rect key={n} className={c.className} x={xcur} y={c.y} width={c.width} height={c.height}/>
        xcur += c.width
        return el
      })
      
      xcur = chart_right
      var puts = mtdurs.reduce((acc, dur) => {
        const orderbook = market.orderbooks[dur]
        const putsfordur = orderbook.puts.map((c, n) => {
          const spot = microtick.activeQuotes[c].spot
          const premium = microtick.activeQuotes[c].premium
          const consensus = market.consensus
          const bottom = priceToY(market.consensus - premium + (spot - consensus) / 2)
          const w = microtick.activeQuotes[c].quantity * mt_width / market.sumWeight
          return {
            className: "mtquote q" + dur,
            y: mty,
            width: w,
            height: bottom - mty < 0 ? 0 : bottom - mty
          }
        })
        return acc.concat(putsfordur)
      }, []).sort((x1, x2) => {
        return x1.height - x2.height
      }).map((p, n) => {
        const el = <rect key={n} className={p.className} x={xcur} y={p.y} width={p.width} height={p.height}/>
        xcur += p.width
        return el
      })
      
      var mtindspots = mtdurs.reduce((acc, dur) => {
        const orderbook = market.orderbooks[dur]
        const spotsfordur = orderbook.base.map((q, n) => {
          const spot = microtick.activeQuotes[q].spot
          const y = priceToY(spot)
          return {
            y: y
          }
        })
        return acc.concat(spotsfordur)
      }, []).map((s, n) => {
        return <line key={n} className="mtindspot" x1={chart_right} y1={s.y} x2={this.bounds.width} y2={s.y}/>
      })
      
      if (feed.microtick.length > 0) {
        const w = 60 * chartWidth / windowSize - 1
        //const halfW = 30 * chartWidth / windowSize + 9 
        var mthist = feed.microtick.map((b, n) => {
          if (b.t > chartStartTime) {
            const x = chartStartX + (b.t - 60 - (chartStartTime - (chartStartTime % 60))) * chartWidth / windowSize
            //const bx = x-w/2 < chartStartX ? chartStartX - 9 : x-w/2 - 1
            const bx = x-w/2
            const h = priceToY(b.h)
            const l = priceToY(b.l)
            const wh = l-h < 1 ? 1 : l-h
            //const bw = ((x - w/2) < chartStartX) || ((x + w/2) > chartStartX + chartWidth) ? halfW : w
            const bw = w
            var ret = <rect key={n} className="mthist" x={bx} y={h} width={bw} height={wh}/>
          }
          return ret
        })
      }
      
      const mid = ob_width + 70
      var mtspot = <g>
        <line className="mtspot" x1={midx} y1={mty} x2={this.bounds.width} y2={mty}/>
        <circle className="mtspot" cx={chart_right} cy={mty} r={2}/>
        <circle className="mtlabel" cx={mid + 35} cy={mty} r={8}/>
        <circle className="mtlabel" cx={mid} cy={mty} r={8}/>
        <rect className="mtlabel" x={mid} y={mty-8} width={35} height={16}/>
        <text className="mtlabel" x={mid} y={mty+3}>{market.consensus}</text>
      </g>
    }
    return <g>
      <g>
        {bids}
        {asks}
      </g>
      {calls}
      {puts}
      {mtindspots}
      {grid}
      {lastline}
      {mthist}
      {mtspot}
      {lastgroup}
      {prices}
    </g>
  }
  
}

export default Chart