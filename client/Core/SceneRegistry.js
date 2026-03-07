import { IntroScene } from '../Login/scenes/IntroScene.js';
import { LoginScene } from '../Login/scenes/LoginScene.js';
import { SignupScene } from '../Login/scenes/SignupScene.js';
import { FirstTimeCutsceneScene } from '../Login/scenes/FirstTimeCutsceneScene.js';
import { LevelSelectScene } from '../LevelSelect/LevelSelectScene.js';

import { Level01EntryScene } from '../Levels/Level01/Level01EntryScene.js';
import { AcidDownpourLevel } from '../Levels/Level01/Scenes/AcidDownpourLevel.js';

import { Level02EntryScene } from '../Levels/Level02/Level01EntryScene.js';
import { DeepPurgeLevel } from '../Levels/Level02/Scenes/DeepPurgeLevel.js';

import { Level03EntryScene } from '../Levels/Level03/Level03EntryScene.js';
import { SunkenWellsLevel } from '../Levels/Level03/Scenes/SunkenWellsLevel.js';

import { Level04_EntryScene } from '../Levels/Level04/EntryScene.js';
import { Level04_CutsceneScene } from '../Levels/Level04/Cutscene/CutsceneScene.js';
import { SpaceJunkLevel } from '../Levels/Level04/Scenes/space_junk_level.js';

export const SCENES = [
  //IntroScene,
  //LoginScene,
  //SignupScene,
  //FirstTimeCutsceneScene,
  //LevelSelectScene,
  //Level01EntryScene,
  AcidDownpourLevel,
  Level04_EntryScene,
  Level04_CutsceneScene,
  SpaceJunkLevel,
];
