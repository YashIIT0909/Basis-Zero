'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type State, WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {mounted ? (
              <RainbowKitProvider 
                  theme={darkTheme({
                      accentColor: '#10b981', // Emerald-500 matching app theme
                      accentColorForeground: 'white',
                      borderRadius: 'medium',
                  })}
              >
              {children}
              </RainbowKitProvider>
          ) : (
              children
          )}
        </QueryClientProvider>
      </WagmiProvider>
  );
}

