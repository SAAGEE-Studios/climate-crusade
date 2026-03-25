/**
 * GameState
 * ----------
 * Global in-memory state container for the current game session.
 *
 * This object stores session-related data such as the active user,
 * authentication status, and background music instance. It allows
 * different scenes to share information without tightly coupling
 * them together.
 *
 * The progress property is reserved for future expansion to support
 * persistent level tracking and enhanced progression features.
 *
 * The reset() function clears all session data on logout to ensure
 * a clean and predictable state for the next session.
 */

export const GameState = {
    userId: null,
    firstTimePlay: true,
    bgMusic: null,

    progress: {},

    isLoggedIn: false,

    reset(){
        this.userId = null;
        this.firstTimePlay = true;
        this.progress = {};
        this.isLoggedIn = false;
        this.bgMusic = null;
    }
};