// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ArcYieldVault} from "../src/ArcYieldVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestFullFlow
 * @notice Test script to deposit USDC and verify the vault is working
 */
contract TestFullFlow is Script {
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    address constant VAULT = 0x49E4177eA6F21Cc5673bDc0b09507C5648fd53a3;
    uint256 constant DEPOSIT_AMOUNT = 10 * 1e6; // 10 USDC

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address user = vm.addr(pk);
        
        ArcYieldVault vault = ArcYieldVault(VAULT);
        IERC20 usdc = IERC20(ARC_USDC);

        console.log("=== Basis-Zero Test ===");
        console.log("User:", user);
        
        // Check initial balance
        uint256 walletBal = usdc.balanceOf(user);
        console.log("Wallet USDC:", walletBal / 1e6);
        
        // Check vault state
        (uint256 principal,,,, uint256 totalBal) = vault.getUserDeposit(user);
        console.log("Vault Principal:", principal / 1e6);
        console.log("Vault Total:", totalBal / 1e6);

        require(walletBal >= DEPOSIT_AMOUNT, "Need more USDC");

        // Execute deposit
        vm.startBroadcast(pk);
        usdc.approve(VAULT, DEPOSIT_AMOUNT);
        vault.deposit(DEPOSIT_AMOUNT);
        vm.stopBroadcast();

        console.log("");
        console.log("=== After Deposit ===");
        
        // Check new state
        (uint256 newPrincipal,,,, uint256 newTotal) = vault.getUserDeposit(user);
        console.log("New Principal:", newPrincipal / 1e6);
        console.log("New Total:", newTotal / 1e6);
        
        console.log("");
        console.log("SUCCESS! 10 USDC deposited.");
    }
}
