import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import FreyaLogo from '../components/FreyaLogo';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="relative z-10 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <FreyaLogo size="md" showText={true} />
            <div className="flex items-center space-x-6">
              <Link href="#features" className="text-white/80 hover:text-white transition-colors cursor-pointer">
                Features
              </Link>
              <Link href="#about" className="text-white/80 hover:text-white transition-colors cursor-pointer">
                About
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FreyaLogo size="xl" showText={true} className="justify-center mb-8" />
          
          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
            Decentralized
            <span className="block bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Invoice Portal
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
            Secure, transparent, and efficient invoicing on the Sonic blockchain. 
            Create invoices with built-in escrow protection and milestone payments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isConnected ? (
              <Link href="/create" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-xl cursor-pointer">
                Create Invoice
              </Link>
            ) : (
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button onClick={openConnectModal} className="cursor-pointer">
                      Get Started
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            )}
            
            <Link href="#features" className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Why Choose Freya?
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Built on Sonic blockchain for lightning-fast, low-cost transactions
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Secure Escrow</h3>
              <p className="text-white/70">
                Built-in escrow protection ensures funds are safely held until work is completed and approved.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Lightning Fast</h3>
              <p className="text-white/70">
                Powered by Sonic blockchain for instant transactions with minimal fees.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Milestone Payments</h3>
              <p className="text-white/70">
                Break down projects into milestones with conditional payments for better project management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="cursor-pointer">
              <div className="text-4xl font-bold text-white mb-2">$2.5M+</div>
              <div className="text-white/70">Total Volume</div>
            </div>
            <div className="cursor-pointer">
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-white/70">Invoices Created</div>
            </div>
            <div className="cursor-pointer">
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-white/70">Uptime</div>
            </div>
            <div className="cursor-pointer">
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-white/70">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of freelancers and businesses using Freya for secure, transparent invoicing.
          </p>
          
          {isConnected ? (
            <Link href="/create" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-xl cursor-pointer inline-block">
              Create Your First Invoice
            </Link>
          ) : (
            <div className="inline-block">
              <ConnectButton />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <FreyaLogo size="sm" showText={true} />
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="text-white/60 hover:text-white transition-colors cursor-pointer">Privacy</Link>
              <Link href="#" className="text-white/60 hover:text-white transition-colors cursor-pointer">Terms</Link>
              <Link href="#" className="text-white/60 hover:text-white transition-colors cursor-pointer">Support</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/60">
            <p>&copy; 2024 Freya Invoice Portal. Built on Sonic Blockchain.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
