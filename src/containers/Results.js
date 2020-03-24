import React from 'react'
import './Results.css'
import BN from 'bignumber.js'

class Results extends React.Component {
  
  render() {
    const accounts = Object.keys(this.props.accounts).map((key, n) => {
      const acct = this.props.accounts[key]
      const total = new BN(acct.balance).plus(acct.quoteBacking).plus(acct.tradeBacking)
      const name = acct.id.startsWith("0x12345") ? "Market Maker(s)" : "Trader(s)"
      return <tr key={n}>
        <td>{name}</td>
        <td>{acct.balance}</td>
        <td>{acct.activeQuotes.length}</td>
        <td>{acct.quoteBacking}</td>
        <td>{acct.numTrades}</td>
        <td>{acct.activeTrades.long.length + acct.activeTrades.short.length}</td>
        <td>{acct.tradeBacking}</td>
        <td>{total.toFixed(6)}</td>
      </tr>
    })
    return <div id="results">
      <table>
        <thead>
          <tr>
            <td>Counterparties</td>
            <td>Token Balance</td>
            <td>Quotes</td>
            <td>Quote Backing</td>
            <td>Num Trades</td>
            <td>Active Trades</td>
            <td>Trade Backing</td>
            <td>Total</td>
          </tr>
        </thead>
        <tbody>
          {accounts}
        </tbody>
      </table>
    </div>
  }
}

export default Results