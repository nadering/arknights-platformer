"use client";

// Reference: https://blog.shiren.dev/2022-01-27/

import { useState, useEffect } from "react";

const audios: Map<string, () => void> = new Map();

export default function useAudio(data: Record<string, string>, volume: number = 1): { loaded: boolean; audios: typeof audios } {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const promises: Promise<void>[] = [];

    const AudioContext = window.AudioContext;
    const audioContext = new AudioContext();
    const gainNode = audioContext.createGain(); // 볼륨 조절용 GainNode

    Object.keys(data).forEach((key) => {
      const sourceUrl = data[key];

      promises.push(
        new Promise<void>(async (resolve, reject) => {
          try {
            const res = await fetch(sourceUrl);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            audios.set(key, () => {
              const trackSource = audioContext.createBufferSource();
              trackSource.buffer = audioBuffer;
              trackSource.connect(gainNode);
              gainNode.connect(audioContext.destination);
              gainNode.gain.setValueAtTime(volume, audioContext.currentTime); // 볼륨 조절

              if (audioContext.state === 'suspended') { // 하드웨어 자원 문제와 같은 이슈에 대한 처리
                audioContext.resume();
              }

              trackSource.start();
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        })
      );
    });

    Promise.all(promises).then(() => {
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loaded,
    audios,
  };
}