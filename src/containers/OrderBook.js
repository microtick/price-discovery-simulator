import React from 'react'
import './OrderBook.css'

class OrderBook extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      market_rate: props.model.rates.market,
      buy_prob: props.model.rates.buy_prob,
      market_v: props.model.sizes.market.v,
      market_s: props.model.sizes.market.s,
      limit_rates: props.model.rates.limit.slice(),
      limit_v: props.model.sizes.limit.v,
      limit_s: props.model.sizes.limit.s,
      cancel_rates: props.model.rates.cancel.slice(),
      cancel_v: props.model.sizes.cancel.v,
      cancel_s: props.model.sizes.cancel.s,
      boundary: props.model.sizes.infinity,
      max_depth: props.model.max.depth,
      max_ticks: props.model.max.marketTicks
    }
    this.onTodoChange = this.onTodoChange.bind(this)
    this.onTodoArrayChange = this.onTodoArrayChange.bind(this)
    this.onSetClick = this.onSetClick.bind(this)
  }
  
  render() {
    var cols = this.state.limit_rates.length
    if (this.state.cancel_rates.length > cols) cols = this.state.cancel_rates.length
    const limits = this.state.limit_rates.map((l, n) => {
      return <td key={n}><input id={"limit_rate_" + n} size={5} value={l} onChange={this.onTodoArrayChange}/></td>
    })
    const cancel = this.state.cancel_rates.map((c, n) => {
      return <td key={n}><input id={"cancel_rate_" + n} size={5} value={c} onChange={this.onTodoArrayChange}/></td>
    })
    const depths = []
    for (var i=0; i<cols; i++) {
      depths.push(<td key={i}>{i}</td>)
    }
    return <div id="orderbook">
      <div>
        <h2>Order Rates - Exponential pdf</h2>
        <table>
          <tbody>
            <tr>
              <td>Market</td>
              <td><input id="market_rate" size={5} value={this.state.market_rate} onChange={this.onTodoChange}/></td>
              <td>Buy Prob</td>
              <td colSpan={cols-1}><input id="buy_prob" size={3} value={this.state.buy_prob} onChange={this.onTodoChange}/>%</td>
            </tr>
            <tr>
              <td>Depth</td>
              {depths}
            </tr>
            <tr>
              <td>Limit</td>
              {limits}
            </tr>
            <tr>
              <td>Cancel</td>
              {cancel}
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h2>Order Sizes - Lognormal pdf</h2>
        <table>
          <tbody>
            <tr>
              <td></td>
              <td>V</td>
              <td>S</td>
            </tr>
            <tr>
              <td>Market</td>
              <td><input id="market_v" size={5} value={this.state.market_v} onChange={this.onTodoChange}/></td>
              <td><input id="market_s" size={5} value={this.state.market_s} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Limit</td>
              <td><input id="limit_v" size={5} value={this.state.limit_v} onChange={this.onTodoChange}/></td>
              <td><input id="limit_s" size={5} value={this.state.limit_s} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Cancel</td>
              <td><input id="cancel_v" size={5} value={this.state.cancel_v} onChange={this.onTodoChange}/></td>
              <td><input id="cancel_s" size={5} value={this.state.cancel_s} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Boundary</td>
              <td colSpan={2}><input id="boundary" size={5} value={this.state.boundary} onChange={this.onTodoChange}/></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h2>Maximums</h2>
        <p>Depth: <input id="max_depth" size={5} value={this.state.max_depth} onChange={this.onTodoChange}/></p>
        <p>Market Ticks: <input id="max_ticks" size={5} value={this.state.max_ticks} onChange={this.onTodoChange}/></p>
      </div>
      <button onClick={this.onSetClick}>Set</button>
    </div>
  }
  
  onTodoChange(e) {
    this.setState({[e.target.id]: e.target.value})
  }
  
  onTodoArrayChange(e) {
    if (e.target.id.startsWith("limit_rate_")) {
      const lr = this.state.limit_rates.slice()
      const index = parseInt(e.target.id.slice(11), 10)
      lr[index] = e.target.value
      this.setState({
        limit_rates: lr
      })
    }
    if (e.target.id.startsWith("cancel_rate_")) {
      const cr = this.state.cancel_rates.slice()
      const index = parseInt(e.target.id.slice(12), 10)
      cr[index] = e.target.value
      this.setState({
        cancel_rates: cr
      })
    }
  }
  
  onSetClick() {
    this.props.setter(this.state)
  }
  
}

export default OrderBook