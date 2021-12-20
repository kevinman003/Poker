const List = require('./structures/List');

class PlayerList {
	constructor() {
		this.length = 0;
		this.players = new List();
	}

	addPlayer(player) {
		this.length++;
		return this.players.add(player);
	}

	getPlayer(id) {
		return this.players.find(player => player.id === id);
	}

	getPlayers() {
		return this.players.toArray();
	}

	nextAction(id) {
		let curr = this.players.root;
		while (curr.next != this.root) {
			if (curr.val.id === id) break;
			curr = curr.next;
		}
		let nextPlayer = curr.next;
		while (!nextPlayer.val.playing) {
			nextPlayer = nextPlayer.next;
		}
		return nextPlayer.val.id;
	}

	// removes player with id
	removePlayer(id) {
		let curr = this.players.root;
		while (curr.val.id !== id) {
			curr = curr.next;
		}
		curr.prev.next = curr.next;
		curr.next.prev = curr.prev;
		this.players.root =
			curr.next.val.seated < curr.prev.val.seated ? curr.next : curr.prev;
	}

	resetAction(bigBlind) {
		const res = {};
		let curr = this.players.root;
		while (curr.val.id !== bigBlind) {
			curr = curr.next;
		}
		if (this.length === 2) {
			res.smallBlind = curr.val.id;
			res.currAction = res.smallBlind;
			res.button = res.smallBlind;
		} else {
			res.smallBlind = curr.val.id;
			res.currAction = curr.next.next.val.id;
			res.button = curr.prev.val.id;
		}
		res.bigBlind = curr.next.val.id;
		return res;
	}

	// index of smallBlind and number of activePlayers
	postFlopLastAction(smallBlind, activePlayers) {
		const res = {};
		let curr = this.players.root;
		while (curr.val.id !== smallBlind) {
			curr = curr.next;
		}
		if (activePlayers === 2) {
			res.lastAction = curr.val.id;
			res.currAction = this.findNextPlaying(curr.next).val.id;
		} else {
			res.lastAction = this.findPrevPlaying(curr.prev).val.id;
			res.currAction = curr.val.id;
		}
		return res;
	}

	// id of smallBlind and number of activePlayers
	// TODO make sure activePlayers > 2 works
	resetLastAction(id, activePlayers) {
		if (activePlayers > 2) {
			let curr = this.players.root;
			while (curr.val.id !== id) {
				curr = curr.next;
			}
			const nextLastAction = this.findPrevPlaying(curr.prev);
			return nextLastAction.val.id;
		}
		return id;
	}

	// id of first player
	firstAllIn(id) {
		let curr = this.players.root;
		while (curr.val.allIn) {
			curr = curr.next;
		}
		return curr.val.id;
	}

	// id of seated person
	seat(id) {
		let curr = this.players.root;
		if (this.length === 1) return;
		while (curr.val.id !== id) {
			curr = curr.next;
		}
		if (
			curr.val.seated > curr.prev.val.seated &&
			(curr.val.seated < curr.next.val.seated ||
				curr.next === this.players.root)
		)
			return;
		let insertNode = this.players.root;
		while (insertNode.val.seated < curr.val.seated) {
			insertNode = insertNode.next;
		}
		if (this.length > 2) {
			curr.prev.next = curr.next;
			curr.next.prev = curr.prev;
			insertNode.prev.next = curr;
			curr.next = insertNode;
			curr.prev = insertNode.prev;
			insertNode.prev = curr;
		}
		this.resetRoot();
	}

	// resets root to smallest seated player
	resetRoot() {
		let curr = this.players.root;
		let smallestNode = curr;
		while (curr.next !== this.players.root) {
			if (curr.val.seated < smallestNode.val.seated) {
				smallestNode = curr;
			}
			curr = curr.next;
		}
		this.players.root =
			curr.val.seated < smallestNode.val.seated ? curr : smallestNode;
	}

	// find next active player
	findNextPlaying(node) {
		let curr = node;
		while (!curr.val.playing) {
			curr = curr.next;
		}
		return curr;
	}

	// find first prev active player
	findPrevPlaying(node) {
		let curr = node;
		while (!curr.val.playing) {
			curr = curr.prev;
		}
		return curr;
	}
}

module.exports = PlayerList;
