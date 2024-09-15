"use client";

import {
  CharacterManager,
  BackgroundManager,
  EffectBehindCharacterManager,
  MapManagerNew
} from "@manager";

export default function Home() {
  return (
    <>
      <BackgroundManager />
      <MapManagerNew />
      <EffectBehindCharacterManager />
      <CharacterManager />
    </>
  );
}
