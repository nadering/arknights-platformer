"use client";

import {
  CharacterManager,
  BackgroundManager,
  EffectBehindCharacterManager,
  MapManager
} from "@manager";

export default function Home() {
  return (
    <>
      <BackgroundManager />
      <MapManager />
      <EffectBehindCharacterManager />
      <CharacterManager />
    </>
  );
}
