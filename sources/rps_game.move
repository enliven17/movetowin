module rps_game::RPSGame {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::balance::{Self, Balance};

    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
    }

    const ADMIN: address = @0xea6335f7f3d365d0a9f0ce1c2e6cdb79b8a42cd84fd8c4ce12ed0f09fcf04406;
    
    const ENotAdmin: u64 = 0;
    const EInvalidBet: u64 = 1;
    const ETreasuryEmpty: u64 = 2;

    fun init(ctx: &mut TxContext) {
        let treasury = Treasury {
            id: object::new(ctx),
            balance: balance::zero(),
        };
        transfer::share_object(treasury);
    }
    
    public entry fun deposit(
        treasury: &mut Treasury,
        coin: Coin<SUI>,
        ctx: &TxContext
    ) {
        assert!(tx_context::sender(ctx) == ADMIN, ENotAdmin);
        let value = coin::into_balance(coin);
        balance::join(&mut treasury.balance, value);
    }

    public entry fun play(
        treasury: &mut Treasury,
        bet_coin: Coin<SUI>,
        player_prediction: u8, // 0: rock, 1: paper, 2: scissors
        ctx: &mut TxContext
    ) {
        let bet_amount = coin::value(&bet_coin);
        assert!(bet_amount > 0, EInvalidBet);

        let contract_move = (tx_context::epoch(ctx) % 3);

        let player_won = (player_prediction == 0 && contract_move == 2) ||
                         (player_prediction == 1 && contract_move == 0) ||
                         (player_prediction == 2 && contract_move == 1);
        
        let player_address = tx_context::sender(ctx);

        if (player_won) {
            let prize_amount = bet_amount * 2;
            let current_balance = balance::value(&treasury.balance);
            assert!(current_balance >= prize_amount, ETreasuryEmpty);

            balance::join(&mut treasury.balance, coin::into_balance(bet_coin));
            
            let prize = coin::take(&mut treasury.balance, prize_amount, ctx);
            transfer::public_transfer(prize, player_address);
        } else {
            balance::join(&mut treasury.balance, coin::into_balance(bet_coin));
        }
    }
} 