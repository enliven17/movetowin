module rps_game::RPSGame {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use std::option;
    use std::vector;

    struct Player has key {
        address: address,
        prediction: u8, // 0: rock, 1: paper, 2: scissors
        stake: u64,
        paid: bool,
    }

    struct Game has key {
        id: UID,
        players: vector<Player>,
        total_stake: u64,
        winner: option::Option<u8>,
        active: bool,
    }

    public fun new(ctx: &mut TxContext): Game {
        Game {
            id: object::new(ctx),
            players: vector::empty<Player>(),
            total_stake: 0,
            winner: option::none<u8>(),
            active: true,
        }
    }

    public fun enter_game(game: &mut Game, prediction: u8, coin: Coin<SUI>, ctx: &mut TxContext) {
        assert!(game.active, 0);
        let stake = coin::value(&coin);
        let player = Player {
            address: tx_context::sender(ctx),
            prediction,
            stake,
            paid: false,
        };
        vector::push_back(&mut game.players, player);
        game.total_stake = game.total_stake + stake;
        coin::freeze(coin);
    }

    public fun end_game(game: &mut Game, winner: u8) {
        assert!(game.active, 0);
        game.winner = option::some(winner);
        game.active = false;
    }

    public fun claim_reward(game: &mut Game, ctx: &mut TxContext) {
        assert!(!game.active, 0);
        let sender = tx_context::sender(ctx);
        let mut found = false;
        let mut reward = 0;
        let mut i = 0;
        while (i < vector::length(&game.players)) {
            let p = &mut vector::borrow_mut(&mut game.players, i);
            if (p.address == sender && !p.paid) {
                if (option::borrow(&game.winner) == &p.prediction) {
                    reward = p.stake * 2;
                    p.paid = true;
                    found = true;
                    break;
                }
            }
            i = i + 1;
        }
        assert!(found, 0);
        transfer::transfer<SUI>(reward, sender);
    }
} 