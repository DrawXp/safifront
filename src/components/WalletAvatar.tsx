import type { AvatarComponent } from '@rainbow-me/rainbowkit'
export const WalletAvatar: AvatarComponent = ({ size }) => (
  <img src="/wallet.webp" width={size} height={size}
       style={{ borderRadius: 999, objectFit: 'cover' }} alt="wallet" />
)
