import { IntroScene } from '../Login/scenes/IntroScene.js';
import { LoginScene } from '../Login/scenes/LoginScene.js';
import { SignupScene } from '../Login/scenes/SignupScene.js';
import { ValidationTests } from '../Login/LoginTests/ValidationTests.js';
import { Level04_EntryScene } from '../Levels/Level04/EntryScene.js';
import { Level04_CutsceneScene } from '../Levels/Level04/Cutscene/CutsceneScene.js';
import { Level04_GameplayScene } from '../Levels/Level04/Scenes/GameplayScene.js';
import { Level04_CompletionScene } from '../Levels/Level04/Scenes/CompletionScene.js';

export const SCENES = [
  // Level04 first for testing (move back after IntroScene when LevelSelect is ready)
  Level04_EntryScene,
  Level04_CutsceneScene,
  Level04_GameplayScene,
  Level04_CompletionScene,
  IntroScene,
  LoginScene,
  SignupScene,
  ValidationTests,
];
