"use client";

import {
  CharacterManager,
  BackgroundManager,
  EffectManager
} from "@manager";

export default function Home() {
  return (
    <>
      <BackgroundManager />
      <CharacterManager />
      <EffectManager />
    </>
  );
}
