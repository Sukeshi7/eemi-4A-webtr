# TP Hangman
Implémenter le SSE sur un jeu de morpion.

## Règles du jeu
Le jeu de morpion se joue sur une grille de 3x3. Deux joueurs jouent à tour de rôle pour placer leur symbole (X ou O) dans une case vide. Le premier joueur à aligner trois de ses symboles horizontalement, verticalement ou en diagonale gagne la partie. Si toutes les cases sont remplies sans qu'un joueur n'ait gagné, la partie est déclarée nulle.

## Fonctionnement du jeu
1. Les joueurs peuvent se connecter au jeu en envoyant une requête HTTP POST à l'URL `/tictactoe` avec un identifiant de joueur.
2. Le serveur enregistre le joueur et envoie un event de type `playerJoined` avec l'identifiant du joueur, si deux joueurs sont connectés le serveur envoie un event de type `gameStarted`.
3. Les joueurs peuvent envoyer des requêtes HTTP POST à l'URL `/tictactoe/move` avec les coordonnés (i,j) et le username.
4. Le serveur enregistre le coup du joueur et envoie un event de type `moveMade` avec les coordonnés (i,j) et le username.
5. Le serveur vérifie si le coup permet à un joueur de gagner en appelant la fonction `checkWinner`.
6. Si un joueur a gagné, le serveur envoie un event de type `gameWon` avec l'identifiant du joueur gagnant.
7. Si la grille est pleine et qu'aucun joueur n'a gagné, le serveur envoie un event de type `gameDraw`.
8. Les joueurs peuvent continuer à jouer en envoyant des coups jusqu'à ce qu'un joueur gagne ou que la partie soit déclarée nulle.

## Fonction checkWinner
```js
function checkWinner(moves) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    const firstWinnerMove = moves.find((move) => move.i * 3 + move.j === a);
    if (firstWinnerMove) {
      const lineMoves = moves.filter(
        (move) =>
          (move.i * 3 + move.j === b || move.i * 3 + move.j === c) &&
          move.user === firstWinnerMove.user
      );
      if (lineMoves.length === 2) {
        return firstWinnerMove.user;
      }
    }
  }
  return null;
}
```