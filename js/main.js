/**
 * Main entry point for the Vibe-Racer game
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create and initialize the game
    const game = new Game();
    
    // Expose game to window for debugging (can be removed in production)
    window.vibeRacerGame = game;
    
    console.log('Vibe-Racer initialized!');
});
