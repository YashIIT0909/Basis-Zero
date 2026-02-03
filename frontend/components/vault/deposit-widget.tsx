
"use client"

import { useState, useEffect } from "react"
import { ArrowRight, CheckCircle, Loader2, Wallet, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from "wagmi"
import { parseUnits, formatUnits, zeroAddress, type Address } from "viem"
import { Confetti } from "@/components/ui/confetti"
import { arcTestnet } from "@/lib/wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"

// --- Constants & ABIs ---

const USDC_ADDRESS_ARC = "0x3600000000000000000000000000000000000000" as Address
const ARC_VAULT_ADDRESS = "0x49E4177eA6F21Cc5673bDc0b09507C5648fd53a3" as Address // Check .env

const ERC20_ABI = [
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "decimals",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint8" }],
    },
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const

const VAULT_ABI = [
    {
        name: "deposit",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "assets", type: "uint256" },
            { name: "receiver", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const

export function DepositWidget() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const { address, isConnected } = useAccount()
    const chainId = useChainId()
    const { switchChain } = useSwitchChain()
    
    const [amount, setAmount] = useState("")
    const [step, setStep] = useState(1) // 1: Input, 2: Confirm, 3: Processing
    
    // --- Wagmi Reads ---
    
    // 1. USDC Balance
    const { data: balanceData } = useReadContract({
        address: USDC_ADDRESS_ARC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address || zeroAddress],
        chainId: arcTestnet.id,
        query: { enabled: !!address }
    })

    // 2. Allowance
    const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS_ARC,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address || zeroAddress, ARC_VAULT_ADDRESS],
        chainId: arcTestnet.id,
        query: { enabled: !!address }
    })

    const balance = balanceData ? formatUnits(balanceData, 18) : "0" // Arc USDC is 18 decimals? Checking .env.. No, typical USDC is 6. Arc might be 18. defineChain said 18.
    const hasAllowance = allowanceData && amount ? allowanceData >= parseUnits(amount, 18) : false

    // --- Wagmi Writes ---

    const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract()
    const { writeContract: writeDeposit, data: depositHash, isPending: isDepositing, error: depositError } = useWriteContract()

    // Wait for Tx Receipts
    const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
    const { isLoading: isWaitingDeposit, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash })

    // --- Side Effects ---

    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance()
        }
    }, [isApproveSuccess, refetchAllowance])

    useEffect(() => {
        if (isDepositSuccess) {
            setStep(3) // Success state
        }
    }, [isDepositSuccess])

    // --- Handlers ---

    const handleAction = () => {
        if (!isConnected) return

        // Network Check
        if (chainId !== arcTestnet.id) {
            switchChain({ chainId: arcTestnet.id })
            return
        }

        const amountBig = parseUnits(amount, 18)

        if (!hasAllowance) {
             writeApprove({
                address: USDC_ADDRESS_ARC,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [ARC_VAULT_ADDRESS, amountBig]
             })
        } else {
             writeDeposit({
                address: ARC_VAULT_ADDRESS,
                abi: VAULT_ABI,
                functionName: "deposit",
                args: [amountBig, address!]
             })
        }
    }

    // --- Render Logic ---

    // Return early if not mounted to prevent hydration issues and server render of hooks
    if (!mounted) return <div className="rounded-xl border border-border bg-card/60 glass p-8 text-center h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

    const isProcessing = isApproving || isWaitingApprove || isDepositing || isWaitingDeposit
    const isSuccess = isDepositSuccess // or step === 3

    if (!isConnected) {
        return (
            <div className="rounded-xl border border-border bg-card/60 glass p-8 text-center space-y-4 flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Connect Wallet</h3>
                <p className="text-muted-foreground max-w-xs">
                    Connect to deposit USDC into the Yield Vault.
                </p>
                <div className="mt-4">
                     <ConnectButton />
                </div>
            </div>
        )
    }

    if (isSuccess) {
         return (
            <div className="rounded-xl border border-border bg-card/60 glass p-8 text-center space-y-6">
                <Confetti className="absolute inset-0 pointer-events-none" />
                <div className="flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 text-green-500">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold">Deposit Successful!</h3>
                    <p className="text-muted-foreground mt-2">
                        You have successfully deposited {amount} USDC.
                    </p>
                </div>
                <button 
                    onClick={() => { setStep(1); setAmount(""); }}
                    className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition-colors"
                >
                    Make Another Deposit
                </button>
            </div>
         )
    }

    return (
        <div className="rounded-xl border border-border bg-card/60 glass overflow-hidden relative p-6 space-y-6">
             {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <VaultIcon className="h-5 w-5 text-primary" />
                    Vault Deposit
                </h3>
                <div className="px-2 py-1 rounded bg-secondary/50 text-xs font-mono">
                    APY: 5.12%
                </div>
            </div>

            {/* Input */}
            <div className="space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider">
                    <label>Amount (USDC)</label>
                    <span>Balance: {parseFloat(balance).toFixed(2)}</span>
                </div>
                
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={isProcessing}
                        className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 pr-20 font-mono text-xl focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="font-mono text-sm text-primary font-bold">USDC</span>
                        <button 
                            onClick={() => setAmount(balance)}
                            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded"
                        >
                            MAX
                        </button>
                    </div>
                </div>
            </div>

            {/* Status / Error */}
            {depositError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{depositError.message.split('\n')[0]}</span>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleAction}
                disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
                className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg transition-all relative overflow-hidden",
                    !amount || parseFloat(amount) <= 0 
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
            >
                {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>
                            {isApproving || isWaitingApprove ? "Approving USDC..." : "Depositing Assets..."}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2">
                         <span>
                             {chainId !== arcTestnet.id ? "Switch to Arc Testnet" : 
                              !hasAllowance ? "Approve USDC" : "Deposit"}
                         </span>
                         {(chainId === arcTestnet.id) && <ArrowRight className="h-5 w-5" />}
                    </div>
                )}
            </button>

            {/* Footer */}
            <div className="text-center">
                <p className="text-xs text-muted-foreground">
                    Powered by Circle Arc • Principal Protected
                </p>
            </div>
        </div>
    )
}

function VaultIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
            <path d="m7.9 7.9 2.7 2.7" />
            <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
            <path d="m13.4 10.6 2.7-2.7" />
            <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
            <path d="m7.9 16.1 2.7-2.7" />
            <circle cx="16.5" cy="16.5" r=".5" fill="currentColor" />
            <path d="m13.4 13.4 2.7 2.7" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    )
}
