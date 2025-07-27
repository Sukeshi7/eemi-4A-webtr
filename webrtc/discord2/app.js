class CallCenter {
	constructor() {
		this.socket = null;
		this.peerConnection = null;
		this.localStream = null;
		this.currentUserId = null;
		this.currentCall = null;
		this.users = [];

		this.iceServers = {
			iceServers: [
				{ urls: 'stun:stun.l.google.com:19302' }
			]
		};

		this.init();
	}

	init() {
		this.connectToServer();
		this.setupEventListeners();
	}

	connectToServer() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}`;
		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			console.log('Connecté au serveur');
			this.showLogin();
		};

		this.socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this.handleServerMessage(data);
		};

		this.socket.onclose = () => {
			console.log('Connexion fermée');
			this.showMessage('Connexion au serveur perdue');
		};
	}

	handleServerMessage(data) {
		console.log('Message serveur:', data.type);

		switch (data.type) {
			case 'joined':
				this.currentUserId = data.userId;
				this.showCallCenter();
				this.showMessage(`Connecté en tant que ${data.username}`);
				break;
			case 'error':
				this.showMessage(data.message, 'error');
				break;
			case 'user-list':
				this.updateUserList(data.users);
				break;
			case 'incoming-call':
				this.handleIncomingCall(data);
				break;
			case 'call-accepted':
				this.handleCallAccepted(data);
				break;
			case 'call-declined':
				this.handleCallDeclined(data);
				break;
			case 'offer':
				this.handleOffer(data);
				break;
			case 'answer':
				this.handleAnswer(data);
				break;
			case 'ice-candidate':
				this.handleIceCandidate(data);
				break;
			case 'call-ended':
				this.endCall();
				break;
		}
	}

	setupEventListeners() {
		document.getElementById('login-form').addEventListener('submit', (e) => {
			e.preventDefault();
			const username = document.getElementById('username').value.trim();
			if (username) {
				this.joinCallCenter(username);
			}
		});

		document.getElementById('hang-up').addEventListener('click', () => {
			this.endCall();
		});

		document.getElementById('toggle-video').addEventListener('click', () => {
			this.toggleVideo();
		});

		document.getElementById('toggle-audio').addEventListener('click', () => {
			this.toggleAudio();
		});
	}

	joinCallCenter(username) {
		this.socket.send(JSON.stringify({
			type: 'join',
			username: username
		}));
	}

	showLogin() {
		document.getElementById('login-screen').classList.remove('hidden');
		document.getElementById('call-center').classList.add('hidden');
	}

	showCallCenter() {
		document.getElementById('login-screen').classList.add('hidden');
		document.getElementById('call-center').classList.remove('hidden');
	}

	updateUserList(users) {
		this.users = users;
		const userList = document.getElementById('user-list');
		userList.innerHTML = '';

		users.forEach(user => {
			if (user.id !== this.currentUserId) {
				const userElement = document.createElement('div');
				userElement.className = 'flex items-center justify-between p-2 mx-1 rounded hover:bg-discord2-gray transition-colors group cursor-pointer';
				userElement.innerHTML = `
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-discord-blurple rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-medium">${user.username.charAt(0).toUpperCase()}</span>
            </div>
            <span class="text-discord-lightgray group-hover:text-white">${user.username}</span>
          </div>
          <button 
            onclick="callCenter.initiateCall('${user.id}', '${user.username}')"
            class="bg-discord-green hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          >
            Appeler
          </button>
        `;
				userList.appendChild(userElement);
			}
		});
	}

	async initiateCall(userId, username) {
		try {
			this.currentCall = { userId, username, type: 'outgoing' };
			this.showMessage(`Appel en cours vers ${username}...`);

			await this.setupLocalMedia();

			this.socket.send(JSON.stringify({
				type: 'call',
				targetUserId: userId
			}));

		} catch (error) {
			console.error('Erreur lors de l\'initiation de l\'appel:', error);
			this.showMessage('Impossible d\'accéder à la caméra/micro', 'error');
			this.currentCall = null;
		}
	}

	async handleIncomingCall(data) {
		const accept = confirm(`${data.callerName} vous appelle. Accepter ?`);

		if (accept) {
			try {
				this.currentCall = {
					userId: data.callerId,
					username: data.callerName,
					type: 'incoming'
				};

				await this.setupLocalMedia();

				this.socket.send(JSON.stringify({
					type: 'call-answer',
					callerId: data.callerId
				}));

			} catch (error) {
				console.error('Erreur lors de l\'acceptation de l\'appel:', error);
				this.socket.send(JSON.stringify({
					type: 'call-decline',
					callerId: data.callerId
				}));
			}
		} else {
			this.socket.send(JSON.stringify({
				type: 'call-decline',
				callerId: data.callerId
			}));
		}
	}

	async handleCallAccepted(data) {
		this.showMessage(`${data.calleeName} a accepté l'appel`);
		await this.createPeerConnection();
		await this.createOffer();
		this.showCallInterface();
	}

	handleCallDeclined(data) {
		this.showMessage(`${data.calleeName} a refusé l'appel`);
		this.currentCall = null;
		this.cleanup();
	}

	async setupLocalMedia() {
		try {
			this.localStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});

			document.getElementById('local-video').srcObject = this.localStream;
		} catch (error) {
			throw new Error('Impossible d\'accéder aux médias locaux');
		}
	}

	async createPeerConnection() {
		this.peerConnection = new RTCPeerConnection(this.iceServers);

		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				this.peerConnection.addTrack(track, this.localStream);
			});
		}

		this.peerConnection.ontrack = (event) => {
			document.getElementById('remote-video').srcObject = event.streams[0];
		};

		this.peerConnection.onicecandidate = (event) => {
			if (event.candidate && this.currentCall) {
				this.socket.send(JSON.stringify({
					type: 'ice-candidate',
					targetUserId: this.currentCall.userId,
					candidate: event.candidate
				}));
			}
		};

		this.peerConnection.onconnectionstatechange = () => {
			console.log('État connexion:', this.peerConnection.connectionState);
			if (this.peerConnection.connectionState === 'connected') {
				this.showMessage('Appel connecté');
			}
		};
	}

	async createOffer() {
		const offer = await this.peerConnection.createOffer();
		await this.peerConnection.setLocalDescription(offer);

		this.socket.send(JSON.stringify({
			type: 'offer',
			targetUserId: this.currentCall.userId,
			offer: offer
		}));
	}

	async handleOffer(data) {
		await this.createPeerConnection();
		await this.peerConnection.setRemoteDescription(data.offer);

		const answer = await this.peerConnection.createAnswer();
		await this.peerConnection.setLocalDescription(answer);

		this.socket.send(JSON.stringify({
			type: 'answer',
			targetUserId: data.senderId,
			answer: answer
		}));

		this.showCallInterface();
	}

	async handleAnswer(data) {
		await this.peerConnection.setRemoteDescription(data.answer);
	}

	async handleIceCandidate(data) {
		if (this.peerConnection) {
			await this.peerConnection.addIceCandidate(data.candidate);
		}
	}

	showCallInterface() {
		document.getElementById('call-interface').classList.remove('hidden');
		document.getElementById('user-list-container').classList.add('hidden');
	}

	endCall() {
		if (this.currentCall) {
			this.socket.send(JSON.stringify({
				type: 'hang-up',
				targetUserId: this.currentCall.userId
			}));
		}

		this.showMessage('Appel terminé');
		this.cleanup();
	}

	cleanup() {
		if (this.peerConnection) {
			this.peerConnection.close();
			this.peerConnection = null;
		}

		if (this.localStream) {
			this.localStream.getTracks().forEach(track => track.stop());
			this.localStream = null;
		}

		document.getElementById('call-interface').style.display = 'none';
		document.getElementById('user-list-container').style.display = 'block';
		document.getElementById('local-video').srcObject = null;
		document.getElementById('remote-video').srcObject = null;

		this.currentCall = null;
	}

	toggleVideo() {
		if (this.localStream) {
			const videoTrack = this.localStream.getVideoTracks()[0];
			if (videoTrack) {
				videoTrack.enabled = !videoTrack.enabled;
				const btn = document.getElementById('toggle-video');
				btn.textContent = videoTrack.enabled ? 'Vidéo ON' : 'Vidéo OFF';
				btn.className = videoTrack.enabled
					? 'bg-discord2-blurple hover:bg-blue-600 text-white px-6 py-3 rounded-full transition-colors'
					: 'bg-discord2-red hover:bg-red-600 text-white px-6 py-3 rounded-full transition-colors';
			}
		}
	}

	toggleAudio() {
		if (this.localStream) {
			const audioTrack = this.localStream.getAudioTracks()[0];
			if (audioTrack) {
				audioTrack.enabled = !audioTrack.enabled;
				const btn = document.getElementById('toggle-audio');
				btn.textContent = audioTrack.enabled ? 'Micro ON' : 'Micro OFF';
				btn.className = audioTrack.enabled
					? 'bg-discord2-green hover:bg-green-600 text-white px-6 py-3 rounded-full transition-colors'
					: 'bg-discord2-red hover:bg-red-600 text-white px-6 py-3 rounded-full transition-colors';
			}
		}
	}

	showMessage(message, type = 'info') {
		const messageDiv = document.getElementById('messages');
		const messageElement = document.createElement('div');
		messageElement.className = `message ${type}`;
		messageElement.textContent = message;
		messageDiv.appendChild(messageElement);
		messageDiv.scrollTop = messageDiv.scrollHeight;

		setTimeout(() => {
			if (messageElement.parentNode) {
				messageElement.parentNode.removeChild(messageElement);
			}
		}, 5000);
	}
}

const callCenter = new CallCenter();