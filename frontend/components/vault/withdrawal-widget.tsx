"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, ChevronDown, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useArcVault, SessionState } from "@/hooks/use-arc-vault"
import { useSwitchChain, useChainId } from "wagmi"
import { arcTestnet } from "@/lib/wagmi"

const chains = [
    { id: "arc", name: "Arc Testnet", icon: "🔵", fee: "~$0.00", isDefault: true },
    { id: "ethereum", name: "Ethereum", icon: "🔷", fee: "~$5.00" },
    { id: "base", name: "Base", icon: "🔵", fee: "~$0.10" },
    { id: "arbitrum", name: "Arbitrum", icon: "🔶", fee: "~$0.30" },
    { id: "polygon", name: "Polygon", icon: "🟣", fee: "~$0.05" },
]

export function WithdrawalWidget() {
    const {
        totalBalance,
        principal,
        accruedYield,
        sessionState,
        isConnected,
        isLoading,
        withdraw,
        isWithdrawing,
        isWithdrawSuccess,
        withdrawError,
        refetch
    } = useArcVault()

    const chainId = useChainId()
    const { switchChain } = useSwitchChain()

    const [selectedChain, setSelectedChain] = useState(chains[0])
    const [amount, setAmount] = useState("")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const availableBalance = parseFloat(totalBalance) || 0
    const principalNum = parseFloat(principal) || 0
    const yieldNum = parseFloat(accruedYield) || 0

    // Check if user has active session (cannot withdraw during session)
    const hasActiveSession = sessionState === SessionState.PendingBridge || sessionState === SessionState.Active

    const handleWithdraw = () => {
        if (!isConnected) return
        
        // Check chain
        if (chainId !== arcTestnet.id) {
            switchChain({ chainId: arcTestnet.id })
            return
        }

        withdraw(amount)
    }

    // Show success state
    useEffect(() => {
        if (isWithdrawSuccess) {
            setShowSuccess(true)
            refetch()
            setTimeout(() => {
                setShowSuccess(false)
                setAmount("")
            }, 3000)
        }
    }, [isWithdrawSuccess, refetch])

    const withdrawAmount = parseFloat(amount) || 0
    const isValidAmount = withdrawAmount > 0 && withdrawAmount <= availableBalance && !hasActiveSession
    const isWithdrawingPrincipal = withdrawAmount > yieldNum

    if (!isConnected) {
        return (
            <div className="rounded-xl border border-border bg-card/60 glass overflow-hidden p-8 text-center">
                <ArrowUpRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Connect wallet to withdraw</p>
            </div>
        )
    }

    if (showSuccess) {
        return (
            <div className="rounded-xl border border-border bg-card/60 glass overflow-hidden p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto text-green-500">
                    <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Withdrawal Submitted!</h3>
                <p className="text-muted-foreground">Your withdrawal of ${withdrawAmount.toFixed(2)} is processing.</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-border bg-card/60 glass overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/50 bg-secondary/40 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                        <h3 className="font-mono text-xs uppercase tracking-wider text-primary">
                            Withdraw
                        </h3>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                        Arc Vault
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Available Balance */}
                <div className="rounded-lg bg-secondary/30 p-4">
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Available to Withdraw
                    </p>
                    <p className="font-mono text-2xl font-bold">
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            `$${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Principal: ${principalNum.toFixed(2)} | Yield: ${yieldNum.toFixed(2)}
                    </p>
                </div>

                {/* Active Session Warning */}
                {hasActiveSession && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">
                            Withdrawals are disabled during active Yellow sessions. Close your session first.
                        </p>
                    </div>
                )}

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="block font-mono text-xs text-muted-foreground uppercase tracking-wider">
                        Withdrawal Amount
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            disabled={hasActiveSession || isWithdrawing}
                            className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 pr-20 font-mono text-xl focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <span className="font-mono text-sm text-muted-foreground">USDC</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end">
                        <button
                            onClick={() => setAmount(availableBalance.toString())}
                            disabled={hasActiveSession}
                            className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                            Withdraw Max
                        </button>
                    </div>
                </div>

                {/* Summary */}
                {withdrawAmount > 0 && (
                    <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">You will receive</span>
                            <span className="font-mono font-medium">${withdrawAmount.toLocaleString()} USDC</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">From yield</span>
                            <span className="font-mono text-green-500">${Math.min(withdrawAmount, yieldNum).toFixed(2)}</span>
                        </div>
                        {isWithdrawingPrincipal && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">From principal</span>
                                <span className="font-mono text-blue-500">${(withdrawAmount - yieldNum).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {withdrawError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">
                            {withdrawError.message.split('\n')[0]}
                        </p>
                    </div>
                )}

                {/* Warning for principal withdrawal */}
                {isWithdrawingPrincipal && withdrawAmount > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                        <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-200">
                            This withdrawal includes principal. Your future yield earnings will be reduced.
                        </p>
                    </div>
                )}

                {/* Withdraw Button */}
                <button
                    onClick={handleWithdraw}
                    disabled={!isValidAmount || isWithdrawing}
                    className={cn(
                        "w-full py-4 rounded-lg font-mono text-sm font-medium transition-all flex items-center justify-center gap-2",
                        isValidAmount
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {isWithdrawing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : chainId !== arcTestnet.id ? (
                        "Switch to Arc Testnet"
                    ) : (
                        "Withdraw"
                    )}
                </button>
            </div>
        </div>
    )
}
