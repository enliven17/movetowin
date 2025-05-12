import { ConnectButton } from '@suiet/wallet-kit'
import Simulation from './components/Simulation'
import './App.css'

function App() {
  return (
    <div className="app">
      <header>
        <ConnectButton />
      </header>
      <Simulation />
    </div>
  )
}

export default App
