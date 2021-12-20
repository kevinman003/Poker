const http = require('http');
const CardRanker = require('./CardRanker');
const Deck = require('./Deck');
const { STREETS } = require('./constants');
const PlayerList = require('./PlayerList');
const { before } = require('lodash');

// Contains array of total players, community cards
// TODO complete the switch case
const playerList = new PlayerList();
// const activePlayerList = new
class Table {
	constructor(id, name) {
		this.id = id;
		this.cards = [];
		this.players = []; // for front-end
		this.toCall = 0;
		this.chips = 0;
		this.deck = new Deck();
		this.bigBlind = 0;
		this.smallBlind = 0;
		this.lastAction = 0;
		this.currAction = 0;
		this.button = -1;
		this.street = STREETS.PREFLOP;
		this.winner = [];
		this.blind = 10;
		this.playerPositions = {};
		this.disabled = true;
		this.time = 10000;
		this.timeCount = 10;
		this.toJoin = [];
		this.name;
		this.allIn = false;
		if (name) {
			this.name = name;
		} else {
			new Promise((resolve, reject) => {
				http.get(
					'http://names.drycodes.com/1?nameOptions=objects&combine=%202',
					res => {
						let data = '';

						res.on('data', chunk => {
							data += chunk;
						});

						res.on('end', () => {
							const result = JSON.parse(data);
							this.name = result[0].replace('Hnad', 'Hand').split('_').join('');
							resolve(this);
						});

						res.on('error', () => {
							reject('error');
						});
					}
				);
			});
		}
	}

	getPlayers() {
		return this.players;
	}

	// for testing
	addCards(cards) {
		this.cards = cards;
	}
	getActivePlayers() {
		return this.players.filter(player => player.playing);
	}

	getPlayer(id) {
		return this.players.find(player => player.id === id);
	}

	getPlayerIndex(id) {
		return this.players.findIndex(player => player.id === id);
	}

	getCards() {
		return this.cards;
	}

	nextAction() {
		const nextPlayerId = playerList.nextAction(
			this.players[this.currAction].id
		);
		this.currAction = this.getPlayerIndex(nextPlayerId);
		const nextPlayer = this.players[this.currAction];
		if (
			((nextPlayer.premove.check || nextPlayer.premove.fold) &&
				!(this.toCall - nextPlayer.playedChips)) ||
			nextPlayer.premove.raise
		) {
			return this.checkCall(nextPlayer.id);
		} else if (
			nextPlayer.premove.fold &&
			pokerTable.toCall - nextPlayer.playedChips
		) {
			return this.fold(nextPlayer.id);
		}
	}

	setToCall(toCall) {
		this.toCall = toCall;
	}

	seat(id, seatNumber) {
		this.playerPositions[seatNumber] = id;
		// TODO implement later
		// playerList.seat(id);
		const player = this.getPlayer(id);
		player.seated = seatNumber;
		playerList.addPlayer(player);
		playerList.seat(id);

		const activePlayers = this.getActivePlayers();
		if (activePlayers.length >= 2) {
			this.toJoin.push(id);
		} else {
			player.playing = true;
		}
	}

	addPlayer(player) {
		this.players.push(player);
	}

	removePlayer(id) {
		this.players = this.players.filter(player => player.id !== id);
		this.fold(id);
		console.log('removing: ', id);
		playerList.removePlayer(id);
		Object.keys(this.playerPositions).map(position => {
			if (this.playerPositions[position] === id)
				delete this.playerPositions[position];
		});
	}

	dealPlayerCards(player) {
		const currPlayer = this.players.find(p => p.id === player.id);
		this.deck.dealPlayerCards(currPlayer);
	}

	start() {
		this.disabled = false;
		this.players.forEach(player => {
			if (player.playing) {
				this.dealPlayerCards(player);
			}
		});
		this.toCall = this.blind;

		this.bigBlind = 0; // TODO: uncomment Math.floor(Math.random() * this.getActivePlayers().length);

		this.resetBlinds();
	}

	stop() {
		this.button = -1;
		this.disabled = true;
	}

	resetPremove(player) {
		player.premove = {
			check: false,
			fold: false,
			raise: false,
		};
	}

	resetBlinds() {
		const { smallBlind, bigBlind, currAction, button } = playerList.resetAction(
			this.getActivePlayers()[this.bigBlind].id
		);
		this.smallBlind = this.getPlayerIndex(smallBlind);
		this.currAction = this.getPlayerIndex(currAction);
		this.bigBlind = this.getPlayerIndex(bigBlind);
		this.button = this.getPlayerIndex(button);

		this.lastAction = this.bigBlind;

		this.toCall = this.blind;
		this.players[this.smallBlind].addChips(this.blind / 2);
		this.players[this.bigBlind].addChips(this.blind);
		this.toJoin.map(player => {
			const selectedPlayer = this.players.find(p => p.id === player);
			if (!selectedPlayer.playedChips) {
				selectedPlayer.addChips(this.blind);
			}
		});
		this.toJoin = [];
	}

	raise(id, amount) {
		const player = this.getPlayer(id);
		this.toCall = amount;
		player.addChips(amount - player.playedChips);
		this.lastAction =
			this.currAction - 1 < 0 ? this.players.length - 1 : this.currAction - 1;
		this.nextAction();
		this.resetTimer();
	}

	checkCall(id) {
		const player = this.getPlayer(id);
		const moreChips = this.toCall - player.playedChips;
		const diffChips = moreChips > player.chips ? player.chips : moreChips;
		if (diffChips) {
			player.addChips(diffChips);
		}
		if (!player.chips) {
			player.premove.raise = true;
			player.allIn = true;
		}
		const beforeNextAction = this.currAction;
		this.nextAction();
		if (this.lastAction === beforeNextAction) {
			this.nextStreet();
		}
		this.resetTimer();
	}

	dealFlop() {
		this.cards = this.deck.dealFlop();
	}

	dealOneCard() {
		this.cards.push(this.deck.dealOneCard());
	}
	nextStreet() {
		this.handlePot();
		this.toCall = 0;
		const activePlayers = this.getActivePlayers();
		activePlayers.map(player => {
			if (player.chips) {
				this.resetPremove(player);
			}
		});
		switch (this.street) {
			case STREETS.PREFLOP:
				this.dealFlop();
				this.street = STREETS.FLOP;
				const { lastAction, currAction } = playerList.postFlopLastAction(
					this.players[this.smallBlind].id,
					this.getActivePlayers().length
				);
				this.lastAction = this.getPlayerIndex(lastAction);
				this.currAction = this.getPlayerIndex(currAction);
				break;
			case STREETS.FLOP:
				this.street = STREETS.TURN;
				this.dealOneCard();
				break;
			case STREETS.TURN:
				this.street = STREETS.RIVER;
				this.dealOneCard();
				break;
			case STREETS.RIVER:
				this.street = STREETS.PREFLOP;
				this.showCards();
				this.findWinner();
				break;
		}
		if (this.street !== STREETS.RIVER) {
			if (this.players.filter(player => !player.allIn).length === 1) {
				this.allIn = true;
			} else if (this.players[this.currAction].allIn) {
				const currAction = playerList.firstAllIn(
					this.players[this.currAction].id
				);
				this.currAction = this.getPlayerIndex(currAction);
			}
		}

		const lastActionId = playerList.resetLastAction(
			this.players[this.smallBlind].id,
			this.getActivePlayers().length
		);
		this.lastAction = this.getPlayerIndex(lastActionId);
	}

	handlePot() {
		this.players.forEach(player => {
			this.chips += player.playedChips;
			player.playedChips = 0;
		});
	}

	fold(id) {
		const player = this.getPlayer(id);
		if (player) player.playing = false;
		const activePlayers = this.getActivePlayers();
		if (this.players.length) {
			if (activePlayers.length === 1) {
				this.handlePot();
				this.won(activePlayers);
			} else if (this.players[this.lastAction].id === id) {
				this.nextStreet();
			}
			if (!this.disabled) {
				const player = this.getPlayer(id);
				this.nextAction();
				player.holeCards = [];
			}
		}

		this.resetTimer();
	}

	// players array of players
	won(players) {
		this.winner = players;
		if (players.length === 1) {
			players[0].chips += this.chips;
		} else {
			players.map(player => {
				player.chips += Math.floor(this.chips / players.length);
			});
		}
		this.deck.reset();
		this.disabled = true;
	}

	showCards() {
		this.players.forEach(player => {
			player.showCards = true;
		});
	}
	resetTimer() {
		this.timeCount = this.time;
	}

	resetGame() {
		this.street = STREETS.PREFLOP;
		this.chips = 0;
		this.allIn = false;
		this.cards = [];
		this.players.forEach(player => {
			player.cardRank = undefined;
			player.paired = {};
			player.bestCards = [];
			player.showCards = false;
			player.holeCards = [];
			if (player.chips > 0) {
				player.playing = true;
				if (this.players.length > 1) this.deck.dealPlayerCards(player);
			}
			this.resetPremove(player);
		});

		this.winner = [];
		if (this.players.length > 1) {
			this.resetBlinds();
			this.disabled = false;
		}
	}

	findWinner() {
		const ranker = new CardRanker(this.getActivePlayers(), this.cards);
		this.won(ranker.findWinner());
	}
}

module.exports = Table;
