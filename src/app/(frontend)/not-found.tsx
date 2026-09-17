import Link from "next/link";
import AmbientCanvas from "@/components/AmbientCanvas";

export default function NotFound() {
  return (
    <>
      <AmbientCanvas />
      <div className="overlay" />
      <div className="content-wrapper">
        <header>
          <div className="status-indicator">
            [ ERROR 404 // FREQUENCY NOT FOUND ]
          </div>
        </header>

        <main className="story-container">
          <h1 className="title">
            <Link href="/" className="title-link">
              Truman Chipotle
            </Link>
          </h1>

          <div
            style={{
              background: "rgba(12, 14, 15, 0.75)",
              border: "1px solid rgba(229, 143, 143, 0.3)",
              borderLeft: "3px solid rgba(229, 143, 143, 0.8)",
              borderRadius: "6px",
              padding: "2.5rem 2rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
              backdropFilter: "blur(8px)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-special-elite), monospace",
                fontSize: "1.4rem",
                color: "#e58f8f",
                letterSpacing: "0.05em",
              }}
            >
              TRANSMISSION LOST
            </h2>
            <p
              style={{
                fontFamily: "var(--font-courier-prime), monospace",
                fontSize: "0.85rem",
                color: "#8fa2a6",
                lineHeight: "1.6",
              }}
            >
              The requested transmission coordinate does not exist in the ether.
              The signal dissolved before it could be decoded.
            </p>
            <div style={{ marginTop: "0.8rem" }}>
              <Link
                href="/"
                className="slideshow-btn"
                style={{
                  display: "inline-flex",
                  textDecoration: "none",
                }}
              >
                &larr; RETURN TO VOID
              </Link>
            </div>
          </div>
        </main>

        <footer>
          <span className="copyright">&copy; 1989–2026 TRUMAN CHIPOTLE.</span>
        </footer>
      </div>
    </>
  );
}
