# TP Call Center
Implémenter un call center en temps réel avec WebRTC, le serveur de signalisation peut être implémenté en Websocket ou SSE.

## Règles du jeu
Quand un utilisateur se connecte, il doit s'identifier avec un nom d'utilisateur unique. Une fois connecté, les utilisateurs reçoivent la liste des utilisateurs connectés, (le nouveau connecté est envoyé aux autres déjà connectés). L'utilisateur clique sur un autre pour lancer un appel. L'appel peut être accepté ou refusé. Si l'appel est accepté, une connexion WebRTC est établie entre les deux utilisateurs avec leurs flux audio (micro) et vidéo (caméra et/ou écran partagé).