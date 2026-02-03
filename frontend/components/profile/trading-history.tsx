"use client"

import { ArrowUpRight, ArrowDownLeft, Clock, Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { useYellowSession } from "@/hooks/use-yellow-session"
import { formatUnits } from "viem"

export function TradingHistory() {
    const { bets, isLoading } = useYellowSession()
    
    // Sort bets by timestamp desc
    const sortedBets = [...bets].sort((a, b) => b.timestamp - a.timestamp)

    return (
        <div className="rounded-xl border border-border bg-card/60 glass overflow-hidden">
            <div className="border-b border-border/50 bg-secondary/40 px-4 py-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-primary">
                        Recent Activity
                    </h3>
                    <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-secondary/50 rounded-md transition-colors text-muted-foreground hover:text-foreground">
                            <Search className="h-3 w-3" />
                        </button>
                        <button className="p-1.5 hover:bg-secondary/50 rounded-md transition-colors text-muted-foreground hover:text-foreground">
                            <Filter className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/50 bg-secondary/20">
                            <th className="px-4 py-2 text-left font-mono text-[10px] text-muted-foreground uppercase">Time</th>
                            <th className="px-4 py-2 text-left font-mono text-[10px] text-muted-foreground uppercase">Market</th>
                            <th className="px-4 py-2 text-left font-mono text-[10px] text-muted-foreground uppercase">Side</th>
                            <th className="px-4 py-2 text-right font-mono text-[10px] text-muted-foreground uppercase">Size (USDC)</th>
                            <th className="px-4 py-2 text-right font-mono text-[10px] text-muted-foreground uppercase">Shares</th>
                            <th className="px-4 py-2 text-right font-mono text-[10px] text-muted-foreground uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {sortedBets.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                                    No trading activity yet.
                                </td>
                            </tr>
                        ) : (
                            sortedBets.map((bet) => (
                                <tr key={bet.id} className="hover:bg-secondary/10 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 font-medium">
                                        {bet.marketId}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                                            bet.side === "YES" 
                                                ? "border-green-500/20 bg-green-500/10 text-green-500"
                                                : "border-red-500/20 bg-red-500/10 text-red-500"
                                        )}>
                                            {bet.side === "YES" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                            {bet.side}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        ${(parseFloat(bet.amount) / 1e6).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                                        {(parseFloat(bet.shares) / 1e6).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={cn(
                                            "font-mono text-xs",
                                            bet.resolved 
                                                ? (bet.won ? "text-green-500" : "text-red-500")
                                                : "text-yellow-500"
                                        )}>
                                            {bet.resolved ? (bet.won ? "WON" : "LOST") : "OPEN"}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
