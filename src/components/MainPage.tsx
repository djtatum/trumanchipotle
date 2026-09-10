"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import AmbientCanvas from "./AmbientCanvas";

function subscribeMediaQuery(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getDesktopSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerDesktopSnapshot(): boolean {
  return true;
}

interface StoryChapter {
  id: string | number;
  title: string;
  content: any;
  publishedDate: string;
  status: string;
}

interface MainPageProps {
  storyChapters: StoryChapter[];
}

function serializeLexical(node: any, index: number = 0): React.ReactNode {
  if (!node) return null;

  if (node.type === "linebreak") {
    return <br key={`br-${index}`} />;
  }

  if (node.type === "tab") {
    return (
      <span key={`tab-${index}`} style={{ display: "inline-block", width: "2em" }}>
        &#9;
      </span>
    );
  }

  if (node.type === "text") {
    let text: React.ReactNode = node.text;
    // Format bitmask in Lexical:
    // 1 = bold, 2 = italic, 4 = strikethrough, 8 = underline, 16 = code, 32 = subscript, 64 = superscript
    if (node.format & 1) {
      text = <strong key="b">{text}</strong>;
    }
    if (node.format & 2) {
      text = <em key="i">{text}</em>;
    }
    if (node.format & 4) {
      text = (
        <span style={{ textDecoration: "line-through" }} key="s">
          {text}
        </span>
      );
    }
    if (node.format & 8) {
      text = <u key="u">{text}</u>;
    }
    if (node.format & 16) {
      text = <code key="c">{text}</code>;
    }
    if (node.format & 32) {
      text = <sub key="sub">{text}</sub>;
    }
    if (node.format & 64) {
      text = <sup key="sup">{text}</sup>;
    }
    return <React.Fragment key={`t-${index}`}>{text}</React.Fragment>;
  }

  const children = node.children?.map((child: any, i: number) => serializeLexical(child, i));

  switch (node.type) {
    case "root":
      return <React.Fragment key="root">{children}</React.Fragment>;
    case "paragraph": {
      // If paragraph has no children or empty text, render a <br /> so it occupies vertical space
      const isEmpty =
        !node.children ||
        node.children.length === 0 ||
        (node.children.length === 1 &&
          node.children[0].type === "text" &&
          !node.children[0].text?.trim());

      const style: React.CSSProperties = {};
      if (node.format) {
        style.textAlign = node.format;
      }
      if (node.indent && node.indent > 0) {
        style.paddingInlineStart = `${node.indent * 2}rem`;
      }

      return (
        <p key={`p-${index}`} style={Object.keys(style).length > 0 ? style : undefined}>
          {isEmpty ? <br /> : children}
        </p>
      );
    }
    case "heading": {
      const Tag = (node.tag || "h3") as any;
      const style: React.CSSProperties = {};
      if (node.format) {
        style.textAlign = node.format;
      }
      return (
        <Tag key={`h-${index}`} style={Object.keys(style).length > 0 ? style : undefined}>
          {children}
        </Tag>
      );
    }
    case "list": {
      const ListTag = (node.listType === "ordered" ? "ol" : "ul") as any;
      return <ListTag key={`list-${index}`}>{children}</ListTag>;
    }
    case "listitem":
      return <li key={`li-${index}`}>{children}</li>;
    case "quote":
      return <blockquote key={`quote-${index}`}>{children}</blockquote>;
    case "horizontalrule":
      return (
        <hr
          key={`hr-${index}`}
          style={{ borderColor: "rgba(143, 162, 166, 0.2)", margin: "1.5rem 0" }}
        />
      );
    case "link":
      return (
        <a
          href={node.fields?.url}
          target="_blank"
          rel="noopener noreferrer"
          key={`a-${index}`}
        >
          {children}
        </a>
      );
    default:
      return children;
  }
}

export default function MainPage({ storyChapters }: MainPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundText = isPlaying ? "Silence the void" : "Listen to the void";
  const statusText = isPlaying ? "[ SYSTEM STATUS: TUNED IN ]" : "[ SYSTEM STATUS: QUIET ]";

  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const padOscsRef = useRef<{ osc: OscillatorNode; volLfo: OscillatorNode }[]>([]);
  const filterLfoRef = useRef<OscillatorNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const crackleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const isDesktop = useSyncExternalStore(
    subscribeMediaQuery,
    getDesktopSnapshot,
    getServerDesktopSnapshot
  );

  const itemsPerPage = isDesktop ? 2 : 1;
  const maxIndex = Math.max(0, storyChapters.length - itemsPerPage);
  const safeCurrentIndex = Math.min(currentIndex, maxIndex);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, maxIndex) - 1));
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, Math.min(prev, maxIndex) + 1));
  }, [maxIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handleCardClick = (index: number) => {
    if (index < safeCurrentIndex) {
      setCurrentIndex(index);
    } else if (index > safeCurrentIndex + itemsPerPage - 1) {
      setCurrentIndex(Math.min(index, maxIndex));
    }
  };

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

          {storyChapters.length > 0 ? (
            <div className="slideshow-container">
              {storyChapters.length > itemsPerPage && (
                <div className="slideshow-header">
                  <button
                    type="button"
                    className="slideshow-btn prev-btn"
                    onClick={handlePrev}
                    disabled={safeCurrentIndex === 0}
                    aria-label="Previous story"
                    title="Previous story"
                  >
                    <span className="btn-chevron">&larr;</span>
                    <span className="btn-text">PREV</span>
                  </button>

                  <div className="slideshow-pagination">
                    <span className="slideshow-counter">
                      [ TRANSMISSION {String(safeCurrentIndex + 1).padStart(2, "0")}
                      {itemsPerPage > 1 && storyChapters.length > 1
                        ? `–${String(Math.min(safeCurrentIndex + itemsPerPage, storyChapters.length)).padStart(2, "0")}`
                        : ""} / {String(storyChapters.length).padStart(2, "0")} ]
                    </span>
                    <div className="slideshow-dots" role="tablist">
                      {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`slideshow-dot ${idx === safeCurrentIndex ? "active" : ""}`}
                          onClick={() => setCurrentIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          role="tab"
                          aria-selected={idx === safeCurrentIndex}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="slideshow-btn next-btn"
                    onClick={handleNext}
                    disabled={safeCurrentIndex >= maxIndex}
                    aria-label="Next story"
                    title="Next story"
                  >
                    <span className="btn-text">NEXT</span>
                    <span className="btn-chevron">&rarr;</span>
                  </button>
                </div>
              )}

              <div
                className="slideshow-stage"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="slideshow-track"
                  style={{
                    transform: `translateX(calc(-1 * ${safeCurrentIndex} * ((100% + var(--slideshow-gap)) / ${itemsPerPage})))`,
                  }}
                >
                  {storyChapters.map((chapter, index) => {
                    const focusStart = safeCurrentIndex;
                    const focusEnd = safeCurrentIndex + itemsPerPage - 1;
                    let distance = 0;
                    if (index < focusStart) {
                      distance = focusStart - index;
                    } else if (index > focusEnd) {
                      distance = index - focusEnd;
                    }

                    const inFocus = distance === 0;
                    const blurPx = inFocus ? 0 : Math.min(distance * 3.5, 14);
                    const opacityVal = inFocus ? 1 : Math.max(0.6 - (distance - 1) * 0.22, 0.15);
                    const scaleVal = inFocus ? 1 : Math.max(0.96 - (distance - 1) * 0.04, 0.86);

                    return (
                      <article
                        key={chapter.id}
                        className={`story-chapter ${inFocus ? "in-focus" : "out-of-focus"}`}
                        style={
                          {
                            filter: `blur(${blurPx}px)`,
                            opacity: opacityVal,
                            transform: `scale(${scaleVal})`,
                            zIndex: inFocus ? 10 : 10 - distance,
                            cursor: inFocus ? "default" : "pointer",
                            "--card-blur": `${blurPx}px`,
                            "--card-opacity": opacityVal,
                            "--card-scale": scaleVal,
                          } as React.CSSProperties
                        }
                        onClick={() => handleCardClick(index)}
                        title={!inFocus ? "Click to bring chapter into focus" : undefined}
                      >
                        {!inFocus && (
                          <div className="focus-hint">
                            <span className="focus-hint-badge">[ FOCUS ]</span>
                          </div>
                        )}
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
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="no-story">The story is waiting to be written.</p>
          )}
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
