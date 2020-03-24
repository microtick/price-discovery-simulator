import React from 'react'
import './Microtick.css'

class Microtick extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      createRate: props.model.rates.createQuote,
      updateRate: props.model.rates.updateQuote,
      cancelRate: props.model.rates.cancelQuote.slice(),
      tradeRate: props.model.rates.placeTrade,
      
      createSizeV: props.model.sizes.createQuote.v,
      createSizeS: props.model.sizes.createQuote.s,
      cancelSizeV: props.model.sizes.cancelQuote.v,
      cancelSizeS: props.model.sizes.cancelQuote.s,
      tradeSizeV: props.model.sizes.placeTrade.v,
      tradeSizeS: props.model.sizes.placeTrade.s,
      
      maxDepth: props.model.max.depth
    }
    
    this.onTodoChange = this.onTodoChange.bind(this)
    this.onTodoArrayChange = this.onTodoArrayChange.bind(this)
    this.onSetClick = this.onSetClick.bind(this)
  }
  
  render() {
    const cancel = this.state.cancelRate.map((c, n) => {
      return <td key={n}><input id={"cancelRate_" + n} size={5} value={c} onChange={this.onTodoArrayChange}/></td>
    })
    const depths = []
    for (var i=0; i<10; i++) {
      depths.push(<td key={i}>{i}</td>)
    }    
    return <div id="microtick_panel">
      <h1>Microtick Parameters</h1>
      <div>
        <h2>Transaction Rates - Exponential pdf</h2>
        <table>
          <tbody>
            <tr>
              <td>Depth</td>
              {depths}
            </tr>
            <tr>
              <td>Cancel</td>
              {cancel}
            </tr>
            <tr>
              <td>Create Quote</td>
              <td><input id="createRate" size={5} value={this.state.createRate} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Update Quote</td>
              <td><input id="updateRate" size={5} value={this.state.updateRate} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Place Trade</td>
              <td><input id="tradeRate" size={5} value={this.state.tradeRate} onChange={this.onTodoChange}/></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h2>Transaction Sizes - Lognormal pdf</h2>
        <table>
          <tbody>
            <tr>
              <td></td>
              <td>V</td>
              <td>S</td>
            </tr>
            <tr>
              <td>Create Quote</td>
              <td><input id="createSizeV" size={5} value={this.state.createSizeV} onChange={this.onTodoChange}/></td>
              <td><input id="createSizeS" size={5} value={this.state.createSizeS} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Cancel Quote</td>
              <td><input id="cancelSizeV" size={5} value={this.state.cancelSizeV} onChange={this.onTodoChange}/></td>
              <td><input id="cancelSizes" size={5} value={this.state.cancelSizeS} onChange={this.onTodoChange}/></td>
            </tr>
            <tr>
              <td>Place Trade</td>
              <td><input id="tradeSizeV" size={5} value={this.state.tradeSizeV} onChange={this.onTodoChange}/></td>
              <td><input id="tradeSizeS" size={5} value={this.state.tradeSizeS} onChange={this.onTodoChange}/></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h2>Maximums</h2>
        <p>Depth <input id="maxDepth" size={3} value={this.state.maxDepth} onChange={this.onTodoChange}/></p>
      </div>
      <button onClick={this.onSetClick}>Set Microtick Parameters</button>
    </div>
  }
  
  onTodoChange(e) {
    this.setState({[e.target.id]: e.target.value})
  }
  
  onTodoArrayChange(e) {
    if (e.target.id.startsWith("cancelRate_")) {
      const cr = this.state.cancelRate.slice()
      const index = parseInt(e.target.id.slice(11), 10)
      cr[index] = e.target.value
      this.setState({
        cancelRate: cr
      })
    }
  }
  
  onSetClick() {
    this.props.setter(this.state)
  }
  
}

export default Microtick