/**
 * GameFlowManager
 * ----------------
 * Centralized scene navigation controller for the game.
 *
 * This module abstracts scene transitions and provides a
 * single point of control for moving between major game states
 * such as login, signup, level select, cutscenes, and gameplay scenes.
 *
 * Keeping transitions centralized improves maintainability
 * and prevents scene-switching logic from being scattered
 * across multiple files.
 */

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
    },

    goToLevel(scene, sceneKey){
        scene.scene.start(sceneKey);
    },

    onLevelComplete(scene, levelId){
        scene.scene.start('LevelSelectScene');
    }
};
