"use client"

import { Wifi, WifiOff, Zap, Clock, RefreshCw, Loader2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useYellowSession } from "@/hooks/use-yellow-session"
import { useSessionEscrow } from "@/hooks/use-session-escrow"
import { useState } from "react"
import { formatUnits } from "viem"

export function SessionManager() {
    const { session, balance: streamBalance, isLoading, openSession, closeSession, refresh: refreshSession } = useYellowSession()
    const { balance: escrowBalance, deposit: depositToEscrow, isApproving, isDepositing } = useSessionEscrow()
    
    // UI State for Open Channel
    const [amount, setAmount] = useState("100") // Default 100 USDC
    
    const handleOpenChannel = async () => {
        try {
            // 1. Deposit to Escrow
            // Only mocked for now if user confirms? 
            // The hook handles approve + deposit transaction flow
            await depositToEscrow(amount)
            
            // 2. Open Backend Session
            // In real app, we wait for deposit confirmation/events. 
            // For now assuming success or optimistic update
            // (Note: The hook returns early 'depositing' string, need better promise handling in hook later)
            // But let's trigger openSession
            await openSession(amount + "000000", true) // 6 decimals string
        } catch (e) {
            console.error(e)
        }
    }

    const isSessionActive = session?.status === "active"
    const totalChannelBalance = streamBalance ? parseFloat(formatUnits(BigInt(streamBalance.available), 6)) : 0
    // Mock duration for now or calc from createdAt
    const sessionDuration = session ? "Active" : "Inactive"

    const isProcessing = isLoading || isApproving || isDepositing

    return (
        <div className="rounded-xl border border-border bg-card/60 glass overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/50 bg-secondary/40 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <h3 className="font-mono text-xs uppercase tracking-wider text-primary">
                            Yellow Session
                        </h3>
                    </div>
                    <div className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-full text-xs font-mono",
                        isSessionActive
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                    )}>
                        {isSessionActive ? (
                            <>
                                <Wifi className="h-3 w-3" />
                                Session Active
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-3 w-3" />
                                Disconnected
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Session Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="font-mono text-xl font-bold text-foreground">
                            {session ? 1 : 0}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">Active Channels</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="font-mono text-xl font-bold text-primary">
                           ${totalChannelBalance.toFixed(2)}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">Channel Balance</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                        <p className="font-mono text-xl font-bold text-foreground">
                            {sessionDuration}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground uppercase">Session State</p>
                    </div>
                </div>

                {/* Channels List */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                            Active Session
                        </p>
                        <button 
                            onClick={refreshSession}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Refresh
                        </button>
                    </div>

                    <div className="space-y-2">
                        {session ? (
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <div>
                                        <p className="text-sm font-medium">Yellow Network Hub</p>
                                        <p className="font-mono text-xs text-muted-foreground">{session.sessionId}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-sm font-medium">
                                        Collateral: ${(parseFloat(session.collateral)/1e6).toFixed(2)}
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        Just now
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
                                No active sessions. Start one to begin trading.
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {!isSessionActive ? (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm font-mono"
                                placeholder="Amount USDC"
                            />
                            <button 
                                onClick={handleOpenChannel}
                                disabled={isProcessing}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                                Start Session
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Escrow Balance: {escrowBalance} USDC
                        </p>
                    </div>
                ) : (
                    <button 
                        onClick={() => closeSession()}
                        disabled={isProcessing}
                        className="w-full py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 font-mono text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                        Close Channel & Settle
                    </button>
                )}
            </div>
        </div>
    )
}
