import { Game } from "./Game";
import { Menu } from "./Menu";
import { PRESETS } from "./track/Presets";

const game = new Game();
const menu = new Menu();

menu.onAction((action) => {
  menu.hide();
  if (action.type === "play") {
    game.track.loadData(PRESETS[action.trackIndex].data);
    game.startInMode("play");
  } else {
    game.startInMode("edit");
  }
});
