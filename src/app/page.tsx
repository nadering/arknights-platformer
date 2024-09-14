"use client";

import {
  CharacterManager,
  BackgroundManager,
  EffectBehindCharacterManager
} from "@manager";

export default function Home() {
  return (
    <>
      <BackgroundManager />
      <EffectBehindCharacterManager />
      <CharacterManager />
    </>
  );
}
