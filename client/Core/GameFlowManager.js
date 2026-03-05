export const GameFlowManager = {
    goToLogin(scene){
        scene.scene.start('LoginScene');
    },

    goToSignup(scene){
        scene.scene.start('SignupScene');
    },

    // Temporarily routes to Level04 for testing (replace with LevelSelectScene later)
    goToLevelSelect(scene){
        scene.scene.start('Level04_EntryScene');
    },

    goToIntro(scene){
        scene.scene.start('IntroScene');
    },

    // Temporarily routes to Level04 for testing (replace with FirstTimeCutsceneScene later)
    goToFirstTimeCutscene(scene){
        scene.scene.start('Level04_EntryScene');
    },

    goToLevel(scene, sceneKey){
        scene.scene.start(sceneKey);
    },

    onLevelComplete(scene, levelId){
        scene.scene.start('LoginScene');
    }
};
