"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import AmbientCanvas from "./AmbientCanvas";

interface StoryChapter {
  id: string | number;
  title: string;
  slug?: string;
  content: any;
  publishedDate: string;
  status: string;
}

interface MainPageProps {
  storyChapters: StoryChapter[];
  initialSlug?: string;
}

function extractShortNameSlug(title: string): string {
  if (!title) return "";
  let text = title;
  if (text.includes(":")) {
    const after = text.split(":").slice(1).join(":").trim();
    if (after) text = after;
  } else if (text.includes(" - ")) {
    const after = text.split(" - ").slice(1).join(" - ").trim();
    if (after) text = after;
  } else {
    text = text.replace(/^(?:chapter|part|transmission|act)\s+[0-9ivxlcdm]+\s*[:\-–—]?\s*/i, "").trim() || text;
  }
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStorySlug(chapter: StoryChapter): string {
  if (chapter.slug && chapter.slug.trim()) return chapter.slug.trim();
  return extractShortNameSlug(chapter.title);
}

function serializeLexical(node: any, index: number = 0): React.ReactNode {
  if (!node) return null;

  if (node.type === "linebreak") {
    return <br key={`br-${index}`} />;
  }

  if (node.type === "tab") {
    // If a tab is at the start of a paragraph, omit it so it doesn't double-indent with CSS text-indent: 2em
    if (index === 0) return null;
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
        if (node.format !== "left") {
          style.textIndent = "0";
        }
      }
      if (node.indent && node.indent > 0) {
        style.paddingInlineStart = `${node.indent * 2}rem`;
      }

      if (isEmpty) {
        return (
          <p key={`p-${index}`} style={Object.keys(style).length > 0 ? style : undefined}>
            <br />
          </p>
        );
      }

      // Check if paragraph contains consecutive linebreaks (double br)
      const hasDoubleLinebreak = node.children?.some(
        (child: any, i: number) =>
          child?.type === "linebreak" && node.children[i + 1]?.type === "linebreak"
      );

      if (hasDoubleLinebreak) {
        const groups: any[][] = [];
        let currentGroup: any[] = [];
        const items = node.children || [];
        let i = 0;
        while (i < items.length) {
          if (
            items[i]?.type === "linebreak" &&
            items[i + 1]?.type === "linebreak"
          ) {
            while (i < items.length && items[i]?.type === "linebreak") {
              i++;
            }
            if (currentGroup.length > 0) {
              groups.push(currentGroup);
              currentGroup = [];
            }
          } else {
            currentGroup.push(items[i]);
            i++;
          }
        }
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }

        return (
          <React.Fragment key={`p-group-${index}`}>
            {groups.map((grp, gIdx) => {
              let start = 0;
              let end = grp.length;
              while (start < end && grp[start]?.type === "linebreak") start++;
              while (end > start && grp[end - 1]?.type === "linebreak") end--;
              const trimmed = grp.slice(start, end);
              if (trimmed.length === 0) return null;

              return (
                <p
                  key={`p-${index}-${gIdx}`}
                  style={Object.keys(style).length > 0 ? style : undefined}
                >
                  {trimmed.map((child: any, cIdx: number) => serializeLexical(child, cIdx))}
                </p>
              );
            })}
          </React.Fragment>
        );
      }

      return (
        <p key={`p-${index}`} style={Object.keys(style).length > 0 ? style : undefined}>
          {children}
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

export default function MainPage({ storyChapters, initialSlug }: MainPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundText = isPlaying ? "Silence" : "Tune in";

  const maxIndex = Math.max(0, storyChapters.length - 1);

  const getInitialIndex = useCallback(() => {
    if (!initialSlug) return 0;
    const normalized = decodeURIComponent(initialSlug).toLowerCase().trim();
    const foundIdx = storyChapters.findIndex((c) => {
      const slug = getStorySlug(c)?.toLowerCase();
      return (
        slug === normalized ||
        String(c.id) === normalized ||
        (slug ? slug.endsWith(`-${normalized}`) : false) ||
        (slug ? normalized.endsWith(`-${slug}`) : false)
      );
    });
    return foundIdx !== -1 ? foundIdx : 0;
  }, [initialSlug, storyChapters]);

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const safeCurrentIndex = Math.min(currentIndex, maxIndex);

  const isPopStateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Synchronize URL and document title whenever the user moves between stories
  useEffect(() => {
    if (typeof window === "undefined" || storyChapters.length === 0) return;

    const targetStory = storyChapters[safeCurrentIndex];
    if (!targetStory) return;

    const slug = getStorySlug(targetStory);
    const newUrl = slug ? `/stories/${slug}` : "/";

    if (targetStory.title) {
      document.title = `${targetStory.title} | Truman Chipotle`;
    }

    // On initial mount, don't overwrite '/' if the user landed on the root page
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // If change came from browser popstate (back/forward), don't push again
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    if (window.location.pathname !== newUrl) {
      window.history.pushState(
        { index: safeCurrentIndex, slug },
        "",
        newUrl
      );
    }
  }, [safeCurrentIndex, storyChapters]);

  const navigateToStory = useCallback(
    (index: number) => {
      const boundedIndex = Math.max(0, Math.min(index, maxIndex));
      setCurrentIndex(boundedIndex);
    },
    [maxIndex]
  );

  const handlePrev = useCallback(() => {
    navigateToStory(safeCurrentIndex - 1);
  }, [safeCurrentIndex, navigateToStory]);

  const handleNext = useCallback(() => {
    navigateToStory(safeCurrentIndex + 1);
  }, [safeCurrentIndex, navigateToStory]);

  const handleCardClick = (index: number) => {
    if (index !== safeCurrentIndex) {
      navigateToStory(index);
    }
  };

  const handleCopyLink = async (slug: string, id: string | number) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/stories/${slug}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      prompt("Story link:", url);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/stories\/([^/]+)/);
      if (match) {
        const pathSlug = decodeURIComponent(match[1]).toLowerCase().trim();
        const idx = storyChapters.findIndex((c) => {
          const slug = getStorySlug(c)?.toLowerCase();
          return (
            slug === pathSlug ||
            String(c.id) === pathSlug ||
            (slug ? slug.endsWith(`-${pathSlug}`) : false) ||
            (slug ? pathSlug.endsWith(`-${slug}`) : false)
          );
        });
        if (idx !== -1) {
          isPopStateRef.current = true;
          setCurrentIndex(idx);
          return;
        }
      } else if (pathname === "/") {
        isPopStateRef.current = true;
        setCurrentIndex(0);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [storyChapters]);

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
          <button
            type="button"
            className={`sound-toggle ${isPlaying ? "active" : ""}`}
            id="sound-toggle"
            onClick={handleSoundToggle}
            aria-label={isPlaying ? "Silence ambient audio" : "Tune in to ambient audio"}
          >
            <span className="sound-icon" />
            <span className="sound-text">{soundText}</span>
          </button>
        </header>

        <main className="story-container">
          <h1 className="title">
            <Link href="/" className="title-link">
              Truman Chipotle
            </Link>
          </h1>

          {storyChapters.length > 0 ? (
            <div className="slideshow-container">
              {storyChapters.length > 1 && (
                <div className="slideshow-header">
                  <div className="slideshow-pagination">
                    <span className="slideshow-counter">
                      [ TRANSMISSION {String(safeCurrentIndex + 1).padStart(2, "0")} / {String(storyChapters.length).padStart(2, "0")} ]
                    </span>
                    <div className="slideshow-dots" role="tablist">
                      {Array.from({ length: storyChapters.length }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`slideshow-dot ${idx === safeCurrentIndex ? "active" : ""}`}
                          onClick={() => navigateToStory(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          role="tab"
                          aria-selected={idx === safeCurrentIndex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="slideshow-stage-wrapper">
                {storyChapters.length > 1 && (
                  <button
                    type="button"
                    className="slideshow-circle-btn prev-btn"
                    onClick={handlePrev}
                    disabled={safeCurrentIndex === 0}
                    aria-label="Previous story"
                    title="Previous story"
                  >
                    <svg
                      className="circle-btn-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>
                )}

                <div
                  className="slideshow-stage"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                <div
                  className="slideshow-track"
                  style={{
                    transform: `translateX(calc(-1 * ${safeCurrentIndex} * (var(--card-width) + var(--slideshow-gap))))`,
                  }}
                >
                  {storyChapters.map((chapter, index) => {
                    const distance = Math.abs(index - safeCurrentIndex);
                    const inFocus = distance === 0;
                    const blurPx = inFocus ? 0 : Math.min(distance * 4, 16);
                    const opacityVal = inFocus ? 1 : Math.max(0.52 - (distance - 1) * 0.22, 0.12);
                    const scaleVal = inFocus ? 1 : Math.max(0.95 - (distance - 1) * 0.05, 0.82);

                    return (
                      <article
                        key={chapter.id}
                        className={`story-chapter ${inFocus ? "in-focus" : "out-of-focus"}`}
                        style={
                          {
                            filter: `blur(${blurPx}px)`,
                            opacity: opacityVal,
                            transform: `scale(${scaleVal})`,
                            zIndex: inFocus ? 10 : Math.max(1, 10 - distance),
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
                        {chapter.title && (
                          <h2 className="chapter-title">
                            <Link
                              href={`/stories/${getStorySlug(chapter)}`}
                              className="chapter-title-link"
                              onClick={(e) => {
                                if (!inFocus) {
                                  e.preventDefault();
                                  navigateToStory(index);
                                }
                              }}
                            >
                              {chapter.title}
                            </Link>
                          </h2>
                        )}
                        <div className="chapter-content">
                          {serializeLexical(chapter.content?.root)}
                        </div>
                        <div className="chapter-footer">
                          {chapter.publishedDate && (
                            <time className="chapter-date">
                              {new Date(chapter.publishedDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          )}
                          <div className="chapter-actions">
                            <button
                              type="button"
                              className={`chapter-link-btn ${copiedId === chapter.id ? "copied" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(getStorySlug(chapter), chapter.id);
                              }}
                              title={`Direct link: /stories/${getStorySlug(chapter)}`}
                              aria-label={`Copy link to ${chapter.title}`}
                            >
                              <svg
                                className="link-btn-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                              <span className="link-btn-text">
                                {copiedId === chapter.id ? "COPIED" : "LINK"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {storyChapters.length > 1 && (
                <button
                  type="button"
                  className="slideshow-circle-btn next-btn"
                  onClick={handleNext}
                  disabled={safeCurrentIndex >= maxIndex}
                  aria-label="Next story"
                  title="Next story"
                >
                  <svg
                    className="circle-btn-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          ) : (
            <p className="no-story">The story is waiting to be written.</p>
          )}
        </main>

        <footer>
          <span className="copyright">&copy; 1989–2026 TRUMAN CHIPOTLE.</span>
        </footer>
      </div>
    </>
  );
}
