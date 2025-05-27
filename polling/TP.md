# TP Hangman

Implémenter le longPolling sur une jeu de pendu.

## Règles du jeu
10 essais pour trouver un mot mystère.
## Fonctionnement du jeu
1. Les joueurs peuvent se connecter au jeu en envoyant une requête HTTP POST à l'URL `/hangman`.
2. Un joueur démarrer une partie en envoyant une requête HTTP POST à l'URL `/hangman/start`.
3. Le serveur génère un mot mystère aléatoire et envoie un event de type `gameStarted` avec le mot mystère masqué (par exemple, "______").
4. Les joueurs peuvent envoyer des requêtes HTTP POST à l'URL `/hangman/guess` avec une lettre pour deviner le mot mystère.
5. Le serveur vérifie si la lettre est dans le mot mystère.
6. Si la lettre est correcte, le serveur envoie un event de type `correctGuess` avec le mot mystère mis à jour (par exemple, "a____e").
7. Si la lettre est incorrecte, le serveur envoie un event de type `incorrectGuess` avec le nombre d'essais restants.
8. Si le joueur trouve le mot mystère, le serveur envoie un event de type `gameWon` avec le mot mystère complet.
9. Si le joueur n'a plus d'essais, le serveur envoie un event de type `gameLost` avec le mot mystère complet.