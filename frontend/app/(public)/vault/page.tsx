import type { Metadata } from "next"
import { VaultClient } from "@/components/vault/vault-client"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://basiszero.io'

export const metadata: Metadata = {
    title: "Vault — Basis Zero",
    description: "Deposit USDC via Circle Arc and earn yield from BlackRock BUIDL RWAs. Manage your cross-chain liquidity.",
    keywords: ["USDC vault", "Circle Arc", "CCTP", "RWA yield", "BlackRock BUIDL", "cross-chain"],
    openGraph: {
        title: "Vault — Basis Zero",
        description: "Deposit USDC and earn institutional-grade RWA yield.",
        url: `${baseUrl}/vault`,
        type: "website",
    },
}

export default function VaultPage() {
    return <VaultClient />
}
