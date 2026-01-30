export const GameFlowManager = {
    goToLogin(scene){
        scene.scene.start('LoginScene');
    },

    goToSignup(scene){
        scene.scene.start('SignupScene');
    },

    goToLevelSelect(scene){
        scene.scene.start('LevelSelectScene');
    },

    goToIntro(scene){
        scene.scene.start('IntroScene');
    },

    goToFirstTimeCutscene(scene){
        scene.scene.start('FirstTimeCutsceneScene');
    }
};