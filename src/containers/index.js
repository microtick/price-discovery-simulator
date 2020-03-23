import React from 'react'
import model from '../model'
import Info from './Info'
import Controls from './Controls'
import Chart from './Chart'
import OrderBook from './OrderBook'

class Simulation extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = model.register(this)
  }
  
  render() {
    return <div>
      <h1>Orderbook simulation</h1>
      <Info time={this.state.time} orderbook={this.state.orderbook} last={this.state.feed.last}/>
      <Controls timespans={this.state.timespans} start={this.start} stop={this.stop}/>
      <svg id="chart">
        <Chart windowSize={this.state.time.windowSize} feed={this.state.feed} 
          orderbook={this.state.orderbook} microtick={this.state.microtick.model}/>
      </svg>
      <OrderBook model={this.state.params.orderbook} setter={this.state.params.setter}/>
    </div>
  }
  
  update(state) {
    this.setState(state)
  }
  
  start() {
    console.log("Starting simulation...")
    model.start()
  }
  
  stop() {
    model.stop()
    console.log("Simulation stopped...")
  }
  
}

export default Simulation