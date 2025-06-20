import { ConnectButton, useWallet } from '@suiet/wallet-kit'
import Simulation from './components/Simulation'
import './App.css'
import { useState } from 'react'
import { TransactionBlock } from '@mysten/sui.js/transactions'

const LABELS = { rock: 'R', paper: 'P', scissors: 'S' }

// TODO: Replace with your deployed contract addresses
const PACKAGE_ID = '0xYOUR_PACKAGE_ID';
const MODULE_NAME = 'RPSGame';
const GAME_OBJECT_ID = '0xYOUR_GAME_OBJECT_ID';

function App() {
  const [prediction, setPrediction] = useState<'rock' | 'paper' | 'scissors' | null>(null)
  const [stake, setStake] = useState('')
  const [running, setRunning] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [winnerHistory, setWinnerHistory] = useState<Array<'rock' | 'paper' | 'scissors'>>([])
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const wallet = useWallet()

  const handleStart = async () => {
    setRunning(true)
    setWinner(null)
    setTxStatus(null)
    if (wallet.account?.address && prediction && stake) {
      try {
        await enterGame(wallet, prediction, Number(stake))
        setTxStatus('Tahmin ve stake zincire gönderildi!')
      } catch (e) {
        setTxStatus('Blockchain işlemi başarısız: ' + (e as any).message)
      }
    }
  }

  const handleWinner = async (w: 'rock' | 'paper' | 'scissors') => {
    setWinner(w)
    setRunning(false)
    setWinnerHistory((prev) => [...prev, w])
  }

  // Blockchain entegrasyon fonksiyonları
  async function enterGame(wallet: any, prediction: 'rock' | 'paper' | 'scissors', stake: number) {
    const predNum = prediction === 'rock' ? 0 : prediction === 'paper' ? 1 : 2
    const tx = new TransactionBlock()
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(stake * 1_000_000_000)])
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::enter_game`,
      arguments: [
        tx.object(GAME_OBJECT_ID),
        tx.pure(predNum),
        coin,
      ],
    })
    await wallet.signAndExecuteTransactionBlock({ transactionBlock: tx })
  }

  async function endGame(wallet: any, winner: 'rock' | 'paper' | 'scissors') {
    const winNum = winner === 'rock' ? 0 : winner === 'paper' ? 1 : 2
    const tx = new TransactionBlock()
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::end_game`,
      arguments: [
        tx.object(GAME_OBJECT_ID),
        tx.pure(winNum),
      ],
    })
    await wallet.signAndExecuteTransactionBlock({ transactionBlock: tx })
  }

  async function claimReward(wallet: any) {
    // TESTNET için: Herkese stake ettiği miktarı geri ver
    // Gerçekte: Kazanan 2 katını alır, kaybeden kaybeder
    if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
      setTxStatus('Testnet: Stake miktarınız iade edildi (simülasyon).')
      return
    }
    const tx = new TransactionBlock()
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::claim_reward`,
      arguments: [
        tx.object(GAME_OBJECT_ID),
      ],
    })
    await wallet.signAndExecuteTransactionBlock({ transactionBlock: tx })
  }

  // Demo: ilk cüzdan admin kabul edilir
  const isAdmin = wallet.account?.address && winner

  return (
    <div className="app">
      <header>
        <ConnectButton />
      </header>
      {!running && !winner && (
        <div style={{ margin: '2rem auto', maxWidth: 400, background: '#222', color: '#fff', padding: 24, borderRadius: 12 }}>
          <h2>Choose your prediction</h2>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '1rem 0' }}>
            <button
              style={{ background: prediction === 'rock' ? '#888' : '#444', color: '#fff', fontSize: 24, padding: 12, borderRadius: 8 }}
              onClick={() => setPrediction('rock')}
            >
              Rock (R)
            </button>
            <button
              style={{ background: prediction === 'paper' ? '#fff' : '#444', color: prediction === 'paper' ? '#222' : '#fff', fontSize: 24, padding: 12, borderRadius: 8 }}
              onClick={() => setPrediction('paper')}
            >
              Paper (P)
            </button>
            <button
              style={{ background: prediction === 'scissors' ? '#f00' : '#444', color: '#fff', fontSize: 24, padding: 12, borderRadius: 8 }}
              onClick={() => setPrediction('scissors')}
            >
              Scissors (S)
            </button>
          </div>
          <div style={{ margin: '1rem 0' }}>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Stake SUI"
              value={stake}
              onChange={e => setStake(e.target.value)}
              style={{ fontSize: 20, padding: 8, borderRadius: 6, width: '100%' }}
            />
          </div>
          <button
            style={{ fontSize: 22, padding: '10px 30px', borderRadius: 8, background: '#61dafb', color: '#222', fontWeight: 'bold', marginTop: 12 }}
            disabled={!prediction || !stake || Number(stake) <= 0}
            onClick={handleStart}
          >
            Start Simulation & Stake
          </button>
          {txStatus && <div style={{ marginTop: 10, color: '#0ff' }}>{txStatus}</div>}
        </div>
      )}
      <Simulation running={running} onWinner={handleWinner} winnerHistory={winnerHistory} />
      {winner && (
        <div style={{ margin: '2rem auto', maxWidth: 400, background: '#111', color: '#fff', padding: 24, borderRadius: 12, textAlign: 'center' }}>
          <h2>Winner: {LABELS[winner as 'rock' | 'paper' | 'scissors']}</h2>
          {prediction === winner ? (
            <>
              <div style={{ color: '#0f0', fontWeight: 'bold', fontSize: 24 }}>You predicted correctly!</div>
              <button style={{ marginTop: 20, fontSize: 18, padding: '8px 24px', borderRadius: 8 }} onClick={() => claimReward(wallet)}>
                Ödülünü Al (Claim Reward)
              </button>
            </>
          ) : (
            <div style={{ color: '#f00', fontWeight: 'bold', fontSize: 24 }}>Wrong prediction</div>
          )}
          {isAdmin && (
            <button style={{ marginTop: 20, fontSize: 18, padding: '8px 24px', borderRadius: 8, background: '#ff0', color: '#222' }} onClick={() => endGame(wallet, winner as any)}>
              Kazananı Zincire Yaz (End Game)
            </button>
          )}
          <button style={{ marginTop: 20, fontSize: 18, padding: '8px 24px', borderRadius: 8 }} onClick={() => { setPrediction(null); setStake(''); setWinner(null); setRunning(false); }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

export default App
