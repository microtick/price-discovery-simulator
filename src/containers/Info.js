import React from 'react'
import './Info.css'
import BN from 'bignumber.js'

class Time extends React.Component {
  
  render() {
      //<p>Inside 
        //<span className="idata">Bid: {this.props.orderbook.insideBid}</span>
        //<span className="idata">Ask: {this.props.orderbook.insideAsk}</span>
      //</p>
      //<p>
        //<span className="data">Last: {this.props.last}</span>
      //</p>
    const elapsed = new BN(this.props.time.elapsedTime).toFixed(2)
    const model = new BN(this.props.time.modelTime).toFixed(1)
    return <div id="info">
      <p>
        <span className="data">Elapsed Time: {elapsed}</span>
        <span className="data">Simulation Time: {model}</span>
      </p>
    </div>
  }
  
}

export default Time