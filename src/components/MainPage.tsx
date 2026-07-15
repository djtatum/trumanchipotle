"use client";

import React, { useState, useEffect, useRef } from "react";
import AmbientCanvas from "./AmbientCanvas";

interface StoryChapter {
  id: string | number;
  title: string;
  content: any;
  publishedDate: string;
  status: string;
}

interface MainPageProps {
  latestPost: {
    text: string;
    url: string;
  };
  storyChapters: StoryChapter[];
}

function serializeLexical(node: any): React.ReactNode {
  if (!node) return null;

  if (node.type === "text") {
    let text: React.ReactNode = node.text;
    // Format is a bitmask: 1 = bold, 2 = italic, 4 = underline, 8 = strikethrough
    if (node.format & 1) {
      text = <strong key={Math.random()}>{text}</strong>;
    }
    if (node.format & 2) {
      text = <em key={Math.random()}>{text}</em>;
    }
    if (node.format & 4) {
      text = <u key={Math.random()}>{text}</u>;
    }
    if (node.format & 8) {
      text = (
        <span style={{ textDecoration: "line-through" }} key={Math.random()}>
          {text}
        </span>
      );
    }
    return text;
  }

  const children = node.children?.map((child: any) => serializeLexical(child));

  switch (node.type) {
    case "root":
      return <div key="root">{children}</div>;
    case "paragraph":
      return <p key={Math.random()}>{children}</p>;
    case "heading":
      const Tag = node.tag || "h3";
      return <Tag key={Math.random()}>{children}</Tag>;
    case "list":
      const ListTag = node.listType === "ordered" ? "ol" : "ul";
      return <ListTag key={Math.random()}>{children}</ListTag>;
    case "listitem":
      return <li key={Math.random()}>{children}</li>;
    case "quote":
      return <blockquote key={Math.random()}>{children}</blockquote>;
    case "link":
      return (
        <a
          href={node.fields?.url}
          target="_blank"
          rel="noopener noreferrer"
          key={Math.random()}
        >
          {children}
        </a>
      );
    default:
      return children;
  }
}

export default function MainPage({ latestPost, storyChapters }: MainPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusText, setStatusText] = useState("[ SYSTEM STATUS: QUIET ]");
  const [soundText, setSoundText] = useState("Take a moment to listen.");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const padOscsRef = useRef<{ osc: OscillatorNode; volLfo: OscillatorNode }[]>([]);
  const filterLfoRef = useRef<OscillatorNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const crackleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  // Sync ref with state to avoid stale closure in setInterval and setTimeouts
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      setSoundText("Silence the void");
      setStatusText("[ SYSTEM STATUS: TUNED IN ]");
    } else {
      setSoundText("Listen to the void");
      setStatusText("[ SYSTEM STATUS: QUIET ]");
    }
  }, [isPlaying]);

  const triggerPop = () => {
    const audioCtx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (!audioCtx || !masterGain) return;

    try {
      const popOsc = audioCtx.createOscillator();
      const popGain = audioCtx.createGain();

      popOsc.type = "sine";
      popOsc.frequency.setValueAtTime(
        Math.random() * 1100 + 150,
        audioCtx.currentTime
      );

      popGain.gain.setValueAtTime(0, audioCtx.currentTime);
      popGain.gain.linearRampToValueAtTime(
        Math.random() * 0.007 + 0.0015,
        audioCtx.currentTime + 0.001
      );
      popGain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + Math.random() * 0.025 + 0.008
      );

      popOsc.connect(popGain);
      popGain.connect(masterGain);

      popOsc.start();
      popOsc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {
      console.error("Error triggering audio pop:", e);
    }
  };

  const startStaticPops = () => {
    crackleIntervalRef.current = setInterval(() => {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx || audioCtx.state === "suspended" || !isPlayingRef.current) return;

      if (Math.random() < 0.22) {
        triggerPop();
      }
    }, 180);
  };

  const initAudio = () => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioCtxRef.current = audioCtx;

    // Master Gain
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
    masterGainRef.current = masterGain;

    // Lowpass filter for the pad & drone
    const filterNode = audioCtx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.setValueAtTime(160, audioCtx.currentTime);
    filterNode.Q.setValueAtTime(1.8, audioCtx.currentTime);
    filterNode.connect(masterGain);
    filterNodeRef.current = filterNode;

    // 1. A1 Sub hum drone (55Hz)
    const droneOsc = audioCtx.createOscillator();
    droneOsc.type = "sine";
    droneOsc.frequency.setValueAtTime(55.0, audioCtx.currentTime);

    const droneGain = audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.28, audioCtx.currentTime);

    droneOsc.connect(droneGain);
    droneGain.connect(filterNode);
    droneOsc.start();
    droneOscRef.current = droneOsc;

    // 2. Choral Minor Pad (A2 = 110Hz, C3 = 130.81Hz, E3 = 164.81Hz, G3 = 196.00Hz)
    const chordFrequencies = [110.0, 130.81, 164.81, 196.0];
    const padOscs: { osc: OscillatorNode; volLfo: OscillatorNode }[] = [];

    chordFrequencies.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, audioCtx.currentTime);

      const oscGain = audioCtx.createGain();
      oscGain.gain.setValueAtTime(0.045, audioCtx.currentTime);

      const volLfo = audioCtx.createOscillator();
      volLfo.type = "sine";
      volLfo.frequency.setValueAtTime(0.02 + idx * 0.008, audioCtx.currentTime);

      const volLfoGain = audioCtx.createGain();
      volLfoGain.gain.setValueAtTime(0.018, audioCtx.currentTime);

      volLfo.connect(volLfoGain);
      volLfoGain.connect(oscGain.gain);
      volLfo.start();

      osc.connect(oscGain);
      oscGain.connect(filterNode);
      osc.start();

      padOscs.push({ osc, volLfo });
    });
    padOscsRef.current = padOscs;

    // 3. Filter LFO Sweep
    const filterLfo = audioCtx.createOscillator();
    filterLfo.type = "sine";
    filterLfo.frequency.setValueAtTime(0.06, audioCtx.currentTime);

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(75, audioCtx.currentTime);

    filterLfo.connect(lfoGain);
    lfoGain.connect(filterNode.frequency);
    filterLfo.start();
    filterLfoRef.current = filterLfo;

    // 4. Procedural Static Pops/Crackles
    startStaticPops();
  };

  const handleSoundToggle = async () => {
    if (!audioCtxRef.current) {
      initAudio();
    }

    const audioCtx = audioCtxRef.current!;
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    if (!isPlaying) {
      // Fade in volume over 3 seconds
      masterGainRef.current!.gain.linearRampToValueAtTime(
        0.35,
        audioCtx.currentTime + 3.0
      );
      setIsPlaying(true);
    } else {
      // Fade out volume over 3 seconds
      masterGainRef.current!.gain.linearRampToValueAtTime(
        0,
        audioCtx.currentTime + 3.0
      );
      setIsPlaying(false);

      // Suspend context after fade-out finishes
      setTimeout(async () => {
        if (!isPlayingRef.current && audioCtxRef.current) {
          await audioCtxRef.current.suspend();
        }
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (crackleIntervalRef.current) {
        clearInterval(crackleIntervalRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, []);

  return (
    <>
      <AmbientCanvas />
      <div className="overlay" />
      <div className="content-wrapper">
        <header>
          <div className="status-indicator" id="status-text">
            {statusText}
          </div>
        </header>

        <main className="story-container">
          <h1 className="title">Truman Chipotle</h1>

          <div className="story-content">
            {storyChapters.length > 0 ? (
              storyChapters.map((chapter) => (
                <article key={chapter.id} className="story-chapter">
                  {chapter.title && <h2 className="chapter-title">{chapter.title}</h2>}
                  <div className="chapter-content">
                    {serializeLexical(chapter.content?.root)}
                  </div>
                  {chapter.publishedDate && (
                    <time className="chapter-date">
                      {new Date(chapter.publishedDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  )}
                </article>
              ))
            ) : (
              <p className="no-story">The story is waiting to be written.</p>
            )}
          </div>

          <p className="description">
            <span className="status-label">TRANSMISSION FEED: </span>
            <a href={latestPost.url} target="_blank" rel="noopener noreferrer">
              {latestPost.text}
            </a>
          </p>
        </main>

        <footer>
          <div className="footer-left">
            <button
              className={`sound-toggle ${isPlaying ? "active" : ""}`}
              id="sound-toggle"
              onClick={handleSoundToggle}
            >
              <span className="sound-icon" />
              <span className="sound-text">{soundText}</span>
            </button>
          </div>
          <div className="footer-right">
            <span className="copyright">&copy; 1989–2026 TRUMAN CHIPOTLE.</span>
          </div>
        </footer>
      </div>
    </>
  );
}
