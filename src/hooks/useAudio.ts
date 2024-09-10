"use client";

// Reference: https://blog.shiren.dev/2022-01-27/

import { useState, useEffect } from "react";

const audios: Map<string, () => void> = new Map();

interface AudioDataType {
  sourceUrl: string;
  volume: number;
}

/** 오디오 재생에 사용하는 커스텀 훅
 * - Declaration: const { audioLoaded, audios } = useAudio({ key: { sourceUrl: "...", volume: ... }, ... });
 * - Play Audio: audios.get(key)?.()
 * 
 * @param data 오디오 정보를 담고 있는 객체 (sourceUrl: string, volume: number = [0, 1])
*/
export default function useAudio(data: Record<string, AudioDataType>): { audioLoaded: boolean; audios: typeof audios } {
  const [audioLoaded, setAudioLoaded] = useState(false);

  useEffect(() => {
    const promises: Promise<void>[] = [];

    const AudioContext = window.AudioContext;
    const audioContext = new AudioContext();
    const gainNode = audioContext.createGain(); // 볼륨 조절용 GainNode

    Object.keys(data).forEach((key) => {
      const { sourceUrl, volume } = data[key];

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
      setAudioLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    audioLoaded,
    audios,
  };
}