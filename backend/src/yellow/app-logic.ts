import { type Hex, decodeAbiParameters, encodeAbiParameters, keccak256, encodePacked, recoverAddress } from 'viem';

export interface ChannelState {
  marketId: string;
  userId: string;
  amount: bigint;
  outcome: number; // 0 = YES, 1 = NO
}

export class BasisZeroAppLogic {
  
  /**
   * Encode the state data into bytes
   */
  encode(state: ChannelState): Hex {
    return encodeAbiParameters(
      [
        { name: 'marketId', type: 'string' },
        { name: 'userId', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'outcome', type: 'uint8' }
      ],
      [state.marketId, state.userId, state.amount, state.outcome]
    );
  }

  /**
   * Decode bytes into state data
   */
  decode(data: Hex): ChannelState {
    const [marketId, userId, amount, outcome] = decodeAbiParameters(
      [
        { name: 'marketId', type: 'string' },
        { name: 'userId', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'outcome', type: 'uint8' }
      ],
      data
    );

    return {
      marketId,
      userId,
      amount,
      outcome
    };
  }

  /**
   * Recover the signer of a state update
   */
  async recoverSigner(state: ChannelState, signature: Hex): Promise<string> {
    // Reconstruct the message hash exactly as the client did
    const intentHash = keccak256(
        encodePacked(
            ['string', 'string', 'uint256', 'uint8'],
            [
                state.marketId,
                state.userId,
                state.amount,
                state.outcome
            ]
        )
    );
    
    return await recoverAddress({ hash: intentHash, signature });
  }

  /**
   * Validate a transition
   * In a real full node, this would check balances against the previous state.
   * Here, we validate the structure and standard checks.
   */
  validate(state: ChannelState): boolean {
    if (state.amount <= 0n) return false;
    if (state.outcome !== 0 && state.outcome !== 1) return false;
    if (!state.marketId || !state.userId) return false;
    return true;
  }
}

export const appLogic = new BasisZeroAppLogic();
