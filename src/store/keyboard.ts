import { atom } from "jotai";

export const keyboardSettingAtom = atom({
  jump: "c",
  dash: "x",
  grab: "z",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
});
