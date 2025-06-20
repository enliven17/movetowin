module rps_game::RPSGame {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use std::option;
    use std::vector;
    use sui::event;
    use sui::object::ID;

    // Game state
    struct Game has key {
        id: UID,
        player1: option::Option<Player>,
        player2: option::Option<Player>,
        total_stake: u64,
        winner: option::Option<u8>,
        active: bool,
    }

    // Player info
    struct Player has store, drop {
        address: address,
        prediction: u8, // 0: rock, 1: paper, 2: scissors
        stake: u64,
        paid: bool,
    }

    // Events
    struct GameCreated has copy, drop {
        game_id: ID
    }

    struct PlayerJoined has copy, drop {
        game_id: ID,
        player: address,
        prediction: u8,
        stake: u64
    }

    struct GameEnded has copy, drop {
        game_id: ID,
        winner: u8,
        total_stake: u64
    }

    struct RewardClaimed has copy, drop {
        game_id: ID,
        player: address,
        amount: u64
    }

    // Errors
    const EGameNotActive: u64 = 0;
    const EGameAlreadyActive: u64 = 1;
    const EGameFull: u64 = 2;
    const EInvalidPrediction: u64 = 3;
    const ENotPlayer: u64 = 4;
    const EAlreadyPaid: u64 = 5;
    const ENoWinner: u64 = 6;

    public fun new(ctx: &mut TxContext): Game {
        let game = Game {
            id: object::new(ctx),
            player1: option::none(),
            player2: option::none(),
            total_stake: 0,
            winner: option::none(),
            active: true,
        };
        
        event::emit(GameCreated {
            game_id: object::id(&game)
        });
        
        game
    }

    public fun join_game(game: &mut Game, prediction: u8, coin: Coin<SUI>, cap: &mut sui::coin::TreasuryCap<SUI>, ctx: &mut TxContext) {
        assert!(game.active, EGameNotActive);
        assert!(prediction <= 2, EInvalidPrediction);
        let sender = tx_context::sender(ctx);
        let stake = coin::value(&coin);
        let player = Player {
            address: sender,
            prediction,
            stake,
            paid: false,
        };
        if (option::is_none(&game.player1)) {
            game.player1 = option::some(player);
        } else if (option::is_none(&game.player2)) {
            game.player2 = option::some(player);
        } else {
            abort EGameFull
        };
        game.total_stake = game.total_stake + stake;
        sui::coin::burn<SUI>(cap, coin);
        event::emit(PlayerJoined {
            game_id: object::id(game),
            player: sender,
            prediction,
            stake
        });
    }

    public fun end_game(game: &mut Game, winner: u8) {
        assert!(game.active, EGameNotActive);
        assert!(winner <= 2, EInvalidPrediction);
        
        game.winner = option::some(winner);
        game.active = false;

        event::emit(GameEnded {
            game_id: object::id(game),
            winner,
            total_stake: game.total_stake
        });
    }

    public fun claim_reward(game: &mut Game, cap: &mut sui::coin::TreasuryCap<SUI>, ctx: &mut TxContext) {
        assert!(!game.active, EGameAlreadyActive);
        let winner = option::borrow(&game.winner);
        let sender = tx_context::sender(ctx);

        if (option::is_some(&mut game.player1)) {
            let player1 = option::borrow_mut(&mut game.player1);
            if (player1.address == sender) {
                assert!(!player1.paid, EAlreadyPaid);
                assert!(player1.prediction == *winner, ENoWinner);
                let reward = player1.stake * 2;
                player1.paid = true;
                let reward_coin = sui::coin::mint<SUI>(cap, reward, ctx);
                sui::transfer::public_transfer(reward_coin, sender);
                event::emit(RewardClaimed {
                    game_id: object::id(game),
                    player: sender,
                    amount: reward
                });
            } else if (option::is_some(&mut game.player2)) {
                let player2 = option::borrow_mut(&mut game.player2);
                if (player2.address == sender) {
                    assert!(!player2.paid, EAlreadyPaid);
                    assert!(player2.prediction == *winner, ENoWinner);
                    let reward = player2.stake * 2;
                    player2.paid = true;
                    let reward_coin = sui::coin::mint<SUI>(cap, reward, ctx);
                    sui::transfer::public_transfer(reward_coin, sender);
                    event::emit(RewardClaimed {
                        game_id: object::id(game),
                        player: sender,
                        amount: reward
                    });
                } else {
                    abort ENotPlayer;
                }
            } else {
                abort ENotPlayer;
            }
        } else if (option::is_some(&mut game.player2)) {
            let player2 = option::borrow_mut(&mut game.player2);
            if (player2.address == sender) {
                assert!(!player2.paid, EAlreadyPaid);
                assert!(player2.prediction == *winner, ENoWinner);
                let reward = player2.stake * 2;
                player2.paid = true;
                let reward_coin = sui::coin::mint<SUI>(cap, reward, ctx);
                sui::transfer::public_transfer(reward_coin, sender);
                event::emit(RewardClaimed {
                    game_id: object::id(game),
                    player: sender,
                    amount: reward
                });
            } else {
                abort ENotPlayer;
            }
        } else {
            abort ENotPlayer;
        }
    }
} 