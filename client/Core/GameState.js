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