import React from 'react'
import './Controls.css'

class Controls extends React.Component {
  
  render() {
    const timespans = this.props.timespans.map((t, n) => {
      return <button key={n}>{t}</button>
    })
    return <div id="controls">
      <span id="startstop">
        <button onClick={this.props.start}>Start</button>
        <button onClick={() => this.props.stop()}>Stop</button>
      </span>
      <span id="datatype">
        <button>Tick</button>
        <button>1-minute Bars</button>
        <button>5-minute Bars</button>
      </span>
      <span id="timespans">
        {timespans}
      </span>
    </div>
  }
  
}

export default Controls
