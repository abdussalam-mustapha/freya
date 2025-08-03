# Sonic Invoice Portal 🚀

**B2B DeFi Invoicing Platform on Sonic Blockchain**

Sonic Invoice Portal is a decentralized invoicing platform built for freelancers, startups, and B2B transactions on the Sonic blockchain. The platform leverages Sonic's FeeM infrastructure for micro-fee, high-speed financial interactions with optional escrow and milestone payment support.

![Sonic Logo](https://img.shields.io/badge/Sonic-Invoice%20Portal-blue?style=for-the-badge&logo=ethereum)

## 🌟 Features

### Core Functionality
- **🔐 Secure Invoice Creation**: Create professional invoices stored immutably on the blockchain
- **💰 Escrow Protection**: Built-in smart contract escrow for secure payments
- **📊 Milestone Payments**: Break down projects into milestones with conditional releases
- **⚡ Lightning Fast**: Powered by Sonic blockchain for instant, low-cost transactions
- **🔗 Wallet Integration**: Seamless MetaMask and WalletConnect support
- **📱 Responsive Design**: Beautiful, modern UI that works on all devices

### Advanced Features
- **🎯 Status Tracking**: Real-time invoice status updates
- **🛡️ Dispute Resolution**: Built-in dispute handling mechanisms
- **💎 Multi-token Support**: Support for native Sonic tokens and ERC-20 tokens
- **📈 Dashboard Analytics**: Comprehensive invoice management dashboard
- **🔔 Event Notifications**: Real-time blockchain event tracking

## 🏗️ Architecture

### Smart Contracts
- **InvoiceManager.sol**: Core invoice management and payment processing
- **Escrow.sol**: Advanced escrow functionality for milestone payments
- **Built with OpenZeppelin**: Industry-standard security and access controls

### Frontend
- **Next.js 13**: Modern React framework with SSR support
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Wagmi + RainbowKit**: Best-in-class Web3 wallet integration
- **Ethers.js**: Ethereum library for blockchain interactions

### Blockchain
- **Sonic Testnet**: High-performance EVM-compatible blockchain
- **Chain ID**: 57054
- **RPC**: https://rpc.blaze.soniclabs.com

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MetaMask or compatible Web3 wallet
- Sonic testnet tokens (for testing)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sonihackathon
```

2. **Install dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

3. **Environment Setup**
```bash
# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Edit .env with your private key (without 0x prefix)
# Edit frontend/.env.local with your WalletConnect Project ID
```

4. **Compile and Deploy Contracts**
```bash
# Compile smart contracts
npm run compile

# Deploy to Sonic testnet
npm run deploy
```

5. **Start the Frontend**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see your Freya Invoice Portal!

## 📋 Environment Variables

### Backend (.env)
```env
PRIVATE_KEY=your_wallet_private_key_without_0x
SONIC_TESTNET_RPC_URL=https://rpc.blaze.soniclabs.com
SONIC_RPC_URL=https://rpc.soniclabs.com
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CHAIN_ID=57054
NEXT_PUBLIC_RPC_URL=https://rpc.blaze.soniclabs.com
NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS=deployed_contract_address
NEXT_PUBLIC_ESCROW_ADDRESS=deployed_escrow_address
```

## 🔧 Development

### Available Scripts

**Backend:**
- `npm run compile` - Compile smart contracts
- `npm run test` - Run contract tests
- `npm run deploy` - Deploy to Sonic testnet
- `npm run clean` - Clean artifacts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Testing
```bash
# Run smart contract tests
npm test

# Test with local blockchain
npm run node
npm run deploy:local
```

## 📖 Usage Guide

### Creating an Invoice

1. **Connect Wallet**: Connect your MetaMask to Sonic testnet
2. **Navigate**: Go to "Create Invoice" page
3. **Fill Details**:
   - Client wallet address
   - Amount in Sonic tokens
   - Due date
   - Description
   - Optional: Enable escrow protection
4. **Submit**: Sign the transaction and wait for confirmation

### Payment Process

1. **Client receives invoice** (via shared link or dashboard)
2. **Client connects wallet** and reviews invoice details
3. **Payment options**:
   - Direct payment (immediate transfer)
   - Escrow payment (funds held until work completion)
4. **Confirmation** and blockchain receipt

### Escrow & Milestones

1. **Enable escrow** when creating invoice
2. **Add milestones** with specific amounts and descriptions
3. **Complete work** and mark milestones as done
4. **Client approval** releases funds for completed milestones
5. **Dispute resolution** available if needed

## 🔐 Security

- **Audited Contracts**: Built with OpenZeppelin standards
- **Reentrancy Protection**: All payment functions protected
- **Access Controls**: Proper role-based permissions
- **Input Validation**: Comprehensive validation on all inputs
- **Test Coverage**: Extensive unit and integration tests

## 🌐 Deployment

### Sonic Testnet
- **Network**: Sonic Testnet
- **Chain ID**: 57054
- **RPC**: https://rpc.blaze.soniclabs.com
- **Explorer**: https://testnet.sonicscan.org

### Contract Addresses
- **InvoiceManager**: `0xae5DdF3ac3dfD629d1C5Ad1Cc6AF1B741b0405fe`
- **Escrow**: `0xA878C1455aC7D06B147c9f0F65d13E37d7C6Beb2`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Community**: Join our Discord for discussions

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core invoice creation and payment
- ✅ Escrow protection
- ✅ Milestone payments
- ✅ Web3 wallet integration

### Phase 2 (Future)
- 🔄 AI-powered invoice generation
- 🔄 On-chain reputation system
- 🔄 NFT receipt generation
- 🔄 Multi-signature support

### Phase 3 (Advanced)
- 🔄 Cross-chain compatibility
- 🔄 Privacy-preserving payments
- 🔄 Automated recurring invoices
- 🔄 Integration APIs

## 🏆 Hackathon Submission

**Built for Sonic Blockchain Hackathon**

Freya demonstrates the power of decentralized finance (DeFi) applied to everyday business operations. By leveraging Sonic's high-speed, low-cost infrastructure, we've created a platform that makes blockchain technology accessible and practical for real-world invoicing needs.

### Key Innovation Points:
- **Real-world utility**: Solves actual business pain points
- **Sonic optimization**: Leverages Sonic's unique capabilities
- **Professional UX**: Enterprise-grade user experience
- **Security first**: Robust smart contract architecture
- **Scalable design**: Built for growth and adoption

---

**Built for Sonic S Tier University Edition Hackathon**

*Submission Deadline: September 1, 2025*

**Made with ❤️ for the Sonic Blockchain Ecosystem**

*Empowering B2B DeFi with high-speed, low-cost transactions*
