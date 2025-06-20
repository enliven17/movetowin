import { ConnectButton, useWallet, WalletProvider } from '@suiet/wallet-kit'
import './App.css'
import '@suiet/wallet-kit/style.css'
import { useState } from 'react'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { SuiClient, getFullnodeUrl, type SuiObjectChange } from '@mysten/sui.js/client'

const PACKAGE_ID = '0xfcdee3992772e0ade4afdd618888a3096dc81429f711360ded95305fd1c9216c'
const TREASURY_OBJECT_ID = '0x3b3992faa2228e97f259ed359651f7404ea9fd283d0e4a736f89ec47e1690c6f'
const ADMIN_ADDRESS = '0xea6335f7f3d365d0a9f0ce1c2e6cdb79b8a42cd84fd8c4ce12ed0f09fcf04406'

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') })

const App = () => {
  const wallet = useWallet()
  const [prediction, setPrediction] = useState<number | null>(null)
  const [stake, setStake] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [txStatus, setTxStatus] = useState<string | null>(null)

  const isAdmin = wallet.account?.address === ADMIN_ADDRESS

  const handlePlay = async () => {
    if (!wallet.account || prediction === null || !stake) return

    setTxStatus('İşlem hazırlanıyor...')
    try {
      const tx = new TransactionBlock()
      const stakeAmount = parseFloat(stake) * 1_000_000_000
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(stakeAmount)])
      
      tx.moveCall({
        target: `${PACKAGE_ID}::RPSGame::play`,
        arguments: [
          tx.object(TREASURY_OBJECT_ID),
          coin,
          tx.pure(prediction),
        ],
      })

      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showObjectChanges: true,
          showEffects: true,
        },
      })

      if (result.effects?.status.status !== 'success') {
        const error = result.effects?.status.error || 'Zincir üzerinde bir hata oluştu. Kasanın yeterli bakiyesi olduğundan emin olun.';
        setTxStatus(`İşlem başarısız: ${error}`);
        return;
      }

      const won = result.objectChanges?.some(
        (change: SuiObjectChange) =>
          change.type === 'created' &&
          typeof change.owner === 'object' &&
          'AddressOwner'in change.owner &&
          change.owner.AddressOwner === wallet.account?.address &&
          change.objectType === '0x2::coin::Coin<0x2::sui::SUI>'
      )

      if (won) {
        setTxStatus(`Tebrikler, kazandınız! Ödülünüz cüzdanınıza gönderildi. Digest: ${result.digest}`)
      } else {
        setTxStatus(`Kaybettiniz veya berabere kaldı. Bahsiniz kasaya eklendi. Digest: ${result.digest}`)
      }
    } catch (e) {
      let errorMessage = "Bilinmeyen bir hata oluştu.";
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else {
        try {
          errorMessage = JSON.stringify(e);
        } catch {
          // JSON.stringify başarısız olursa diye fallback
          errorMessage = String(e);
        }
      }
      setTxStatus(`İşlem gönderilemedi: ${errorMessage}. Kasanın boş olmadığından emin olun.`);
    }
  }

  const handleDeposit = async () => {
    if (!wallet.account || !depositAmount) return

    setTxStatus('Deposit işlemi hazırlanıyor...')
    try {
      const tx = new TransactionBlock()
      const depositSui = parseFloat(depositAmount) * 1_000_000_000
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(depositSui)])
      
      tx.moveCall({
        target: `${PACKAGE_ID}::RPSGame::deposit`,
        arguments: [
          tx.object(TREASURY_OBJECT_ID),
          coin,
        ],
      })

      const result = await wallet.signAndExecuteTransactionBlock({ transactionBlock: tx })
      setTxStatus(`Deposit başarılı! Digest: ${result.digest}`)
    } catch (e: any) {
      setTxStatus(`Deposit başarısız: ${e.message}`)
    }
  }

  return (
    <div className="app">
      <header>
        <ConnectButton />
      </header>
      <main>
        <h1>Taş - Kağıt - Makas</h1>
        <div className="game-section">
          <h2>Oyna</h2>
          <p>Tahminini yap ve bahsini koy!</p>
          <div className="predictions">
            <button onClick={() => setPrediction(0)} className={prediction === 0 ? 'selected' : ''}>Taş</button>
            <button onClick={() => setPrediction(1)} className={prediction === 1 ? 'selected' : ''}>Kağıt</button>
            <button onClick={() => setPrediction(2)} className={prediction === 2 ? 'selected' : ''}>Makas</button>
          </div>
          <input
            type="number"
            placeholder="Bahis Miktarı (SUI)"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
          <button onClick={handlePlay} disabled={!wallet.account || prediction === null || !stake}>Oyna</button>
        </div>

        {isAdmin && (
          <div className="admin-section">
            <h2>Yönetici Paneli</h2>
            <input
              type="number"
              placeholder="Yatırılacak Miktar (SUI)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <button onClick={handleDeposit} disabled={!depositAmount}>Kassaya Para Yatır</button>
          </div>
        )}

        {txStatus && <div className="status">{txStatus}</div>}
      </main>
    </div>
  )
}

const AppWrapper = () => (
  <WalletProvider>
    <App />
  </WalletProvider>
)

export default AppWrapper
