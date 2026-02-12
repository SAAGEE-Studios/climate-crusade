import { SCENES } from '../Core/SceneRegistry.js';

const config = {
    type: Phaser.AUTO,
    title: 'Climate Crusade',
    description: '',
    parent: 'game-container',
    width: 1920,
    height: 1080,
    backgroundColor: '#000000',
    pixelArt: false,
    scene: SCENES,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
}

const game = new Phaser.Game(config);

const uiRoot = document.getElementById('ui-overlay');

function syncUIWithPhaser() {
  const canvas = game.canvas;
  const scaleX = canvas.clientWidth / game.config.width;
  const scaleY = canvas.clientHeight / game.config.height;
  const scale = Math.min(scaleX, scaleY);

  const rect = canvas.getBoundingClientRect();

  uiRoot.style.transform = `translate(${rect.left}px, ${rect.top}px) scale(${scale})`;
}

game.scale.on('resize', syncUIWithPhaser);
window.addEventListener('resize', syncUIWithPhaser);

// Initial sync
syncUIWithPhaser();
            