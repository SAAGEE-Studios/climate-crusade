import { IntroScene } from '../Login/scenes/IntroScene.js';
import { LoginScene } from '../Login/scenes/LoginScene.js';
import { SignupScene } from '../Login/scenes/SignupScene.js';
import { FirstTimeCutsceneScene } from '../Login/scenes/FirstTimeCutsceneScene.js';
import { LevelSelectScene } from '../LevelSelect/LevelSelectScene.js';

import { Level01EntryScene } from '../Levels/Level01/Level01EntryScene.js';
//import { Level01CutsceneScene } from '../Levels/Level01/Cutscene/CutsceneScene.js';
import { AcidDownpourLevel } from '../Levels/Level01/Scenes/AcidDownpourLevel.js';

//import { Level02EntryScene } from '../Levels/Level02/Level01EntryScene.js';
//import { Level02CutsceneScene } from '../Levels/Level02/Cutscene/CutsceneScene.js';
//import { DeepPurgeLevel } from '../Levels/Level02/Scenes/DeepPurgeLevel.js';

//import { Level03EntryScene } from '../Levels/Level03/Level03EntryScene.js';
//import { Level03CutsceneScene } from '../Levels/Level03/Cutscene/CutsceneScene.js';
//import { SunkenWellsLevel } from '../Levels/Level03/Scenes/SunkenWellsLevel.js';

//import { Level04EntryScene } from '../Levels/Level04/EntryScene.js';
//import { Level04CutsceneScene } from '../Levels/Level04/Cutscene/CutsceneScene.js';
import { SpaceJunkLevel } from '../Levels/Level04/Scenes/space_junk_level.js';

import { Level04EntryScene } from '../Levels/Level04/EntryScene.js';
import { Level04CutsceneScene } from '../Levels/Level04/Cutscene/CutsceneScene.js';
import { SpaceJunkLevel } from '../Levels/Level04/Scenes/SpaceJunkLevel.js';

export const SCENES = [
  //IntroScene,
  //LoginScene,
  //SignupScene,
  //FirstTimeCutsceneScene,
  LevelSelectScene,
  //------Level 01--------
  //Level01EntryScene,
  //Level01CutsceneScene,
  AcidDownpourLevel,
  //------Level 02--------
  //Level02EntryScene,
  //Level02CutsceneScene,
  //DeepPurgeLevel,
  //------Level 03--------
  //Level03EntryScene,
  //Level03CutsceneScene,
  //SunkenWellsLevel,
  //------Level 04--------
  //Level04EntryScene,
  //Level04CutsceneScene,
  SpaceJunkLevel,
];
