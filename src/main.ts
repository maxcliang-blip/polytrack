import { Game } from "./Game";
import { Menu } from "./Menu";

const game = new Game();
const menu = new Menu();

menu.onAction((action) => {
  menu.hide();
  game.startInMode(action === "play" ? "play" : "edit");
});
