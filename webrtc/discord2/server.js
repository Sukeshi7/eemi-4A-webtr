const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Créer un serveur HTTP simple pour servir les fichiers statiques
const server = http.createServer((req, res) => {
	let filePath = '.' + req.url;
	if (filePath === './') filePath = './index.html';

	const extname = path.extname(filePath).toLowerCase();
	const mimeTypes = {
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css'
	};

	const contentType = mimeTypes[extname] || 'application/octet-stream';

	fs.readFile(filePath, (error, content) => {
		if (error) {
			if (error.code === 'ENOENT') {
				res.writeHead(404);
				res.end('Page not found');
			} else {
				res.writeHead(500);
				res.end('Server error: ' + error.code);
			}
		} else {
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(content, 'utf-8');
		}
	});
});

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker les utilisateurs connectés
const users = new Map();

wss.on('connection', (ws) => {
	console.log('Nouvelle connexion WebSocket');

	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message);
			console.log('Message reçu:', data.type);

			switch (data.type) {
				case 'join':
					handleUserJoin(ws, data);
					break;
				case 'call':
					handleCallRequest(ws, data);
					break;
				case 'call-answer':
					handleCallAnswer(ws, data);
					break;
				case 'call-decline':
					handleCallDecline(ws, data);
					break;
				case 'offer':
					handleOffer(ws, data);
					break;
				case 'answer':
					handleAnswer(ws, data);
					break;
				case 'ice-candidate':
					handleIceCandidate(ws, data);
					break;
				case 'hang-up':
					handleHangUp(ws, data);
					break;
				default:
					console.log('Type de message inconnu:', data.type);
			}
		} catch (error) {
			console.error('Erreur parsing message:', error);
		}
	});

	ws.on('close', () => {
		handleUserDisconnect(ws);
	});
});

function handleUserJoin(ws, data) {
	const { username } = data;

	// Vérifier si le nom d'utilisateur existe déjà
	for (let user of users.values()) {
		if (user.username === username) {
			ws.send(JSON.stringify({
				type: 'error',
				message: 'Ce nom d\'utilisateur est déjà pris'
			}));
			return;
		}
	}

	// Ajouter l'utilisateur
	const userId = generateUserId();
	users.set(ws, { id: userId, username, socket: ws });

	// Confirmer la connexion
	ws.send(JSON.stringify({
		type: 'joined',
		userId: userId,
		username: username
	}));

	// Envoyer la liste des utilisateurs à tous
	broadcastUserList();
}

function handleCallRequest(ws, data) {
	const caller = users.get(ws);
	const callee = findUserById(data.targetUserId);

	if (!caller || !callee) {
		ws.send(JSON.stringify({
			type: 'error',
			message: 'Utilisateur non trouvé'
		}));
		return;
	}

	// Envoyer la demande d'appel au destinataire
	callee.socket.send(JSON.stringify({
		type: 'incoming-call',
		callerId: caller.id,
		callerName: caller.username
	}));
}

function handleCallAnswer(ws, data) {
	const callee = users.get(ws);
	const caller = findUserById(data.callerId);

	if (!caller || !callee) return;

	// Informer l'appelant que l'appel est accepté
	caller.socket.send(JSON.stringify({
		type: 'call-accepted',
		calleeId: callee.id,
		calleeName: callee.username
	}));
}

function handleCallDecline(ws, data) {
	const callee = users.get(ws);
	const caller = findUserById(data.callerId);

	if (!caller || !callee) return;

	// Informer l'appelant que l'appel est refusé
	caller.socket.send(JSON.stringify({
		type: 'call-declined',
		calleeId: callee.id,
		calleeName: callee.username
	}));
}

function handleOffer(ws, data) {
	const sender = users.get(ws);
	const receiver = findUserById(data.targetUserId);

	if (!sender || !receiver) return;

	receiver.socket.send(JSON.stringify({
		type: 'offer',
		senderId: sender.id,
		offer: data.offer
	}));
}

function handleAnswer(ws, data) {
	const sender = users.get(ws);
	const receiver = findUserById(data.targetUserId);

	if (!sender || !receiver) return;

	receiver.socket.send(JSON.stringify({
		type: 'answer',
		senderId: sender.id,
		answer: data.answer
	}));
}

function handleIceCandidate(ws, data) {
	const sender = users.get(ws);
	const receiver = findUserById(data.targetUserId);

	if (!sender || !receiver) return;

	receiver.socket.send(JSON.stringify({
		type: 'ice-candidate',
		senderId: sender.id,
		candidate: data.candidate
	}));
}

function handleHangUp(ws, data) {
	const sender = users.get(ws);
	const receiver = findUserById(data.targetUserId);

	if (!sender || !receiver) return;

	receiver.socket.send(JSON.stringify({
		type: 'call-ended',
		senderId: sender.id
	}));
}

function handleUserDisconnect(ws) {
	const user = users.get(ws);
	if (user) {
		console.log(`Utilisateur ${user.username} déconnecté`);
		users.delete(ws);
		broadcastUserList();
	}
}

function broadcastUserList() {
	const userList = Array.from(users.values()).map(user => ({
		id: user.id,
		username: user.username
	}));

	const message = JSON.stringify({
		type: 'user-list',
		users: userList
	});

	users.forEach(user => {
		user.socket.send(message);
	});
}

function findUserById(id) {
	for (let user of users.values()) {
		if (user.id === id) {
			return user;
		}
	}
	return null;
}

function generateUserId() {
	return Math.random().toString(36).substring(2, 15);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Serveur démarré sur http://localhost:${PORT}`);
});