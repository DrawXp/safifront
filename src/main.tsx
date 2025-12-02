import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { wagmiConfig } from './wagmi'
import { WalletAvatar } from './components/WalletAvatar'

import App from './App'
import Home from './pages/home'
import Faucet from './pages/faucet'
import Stake from './pages/stake'
import Swap from './pages/swap'
import Pool from './pages/pool'
import SafidoPrize from './pages/safidoprize'

const qc = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider avatar={WalletAvatar} locale="en-US">
          <BrowserRouter>
            <Routes>
              <Route element={<App />}>
                <Route path="/"            element={<Home />} />
                <Route path="/swap"        element={<Swap />} />
                <Route path="/pool"        element={<Pool />} />
                <Route path="/stake"       element={<Stake />} />
                <Route path="/safidoprize" element={<SafidoPrize />} />
                <Route path="/faucet"      element={<Faucet />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
