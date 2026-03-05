import { IntroScene } from '../Login/scenes/IntroScene.js';
import { LoginScene } from '../Login/scenes/LoginScene.js';
import { SignupScene } from '../Login/scenes/SignupScene.js';
import { ValidationTests } from '../Login/LoginTests/ValidationTests.js';
import { AcidDownpourLevel } from '../Levels/Level01/Scenes/AcidDownpourLevel.js';
import { Level04_EntryScene } from '../Levels/Level04/EntryScene.js';
import { Level04_CutsceneScene } from '../Levels/Level04/Cutscene/CutsceneScene.js';
import { Level04_GameplayScene } from '../Levels/Level04/Scenes/GameplayScene.js';
import { Level04_CompletionScene } from '../Levels/Level04/Scenes/CompletionScene.js';

export const SCENES = [
  IntroScene,
  LoginScene,
  SignupScene,
  ValidationTests,
  AcidDownpourLevel,
  Level04_EntryScene,
  Level04_CutsceneScene,
  Level04_GameplayScene,
  Level04_CompletionScene,
];
