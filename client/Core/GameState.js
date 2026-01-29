
export const GameState = {
    userId: null,
    firstTimePlay: true,

    progress: {},

    isLoggedIn: false,

    reset(){
        this.userId = null;
        this.firstTimePlay = true;
        this.progress = {};
        this.isLoggedIn = false;
    }
};