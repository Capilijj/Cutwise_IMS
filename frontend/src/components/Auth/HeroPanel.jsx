import bgImage from "../../assets/ottodrone.jpg";
import logo from "../../assets/otto-logo.svg";

export default function HeroPanel() {
  return (
    <aside
      style={{
        flex: 1,
        minHeight: "100vh",
        backgroundImage: `linear-gradient(135deg, rgba(60, 10, 10, 0.72), rgba(120, 30, 30, 0.65)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "48px 52px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            margin: "0 0 16px",
            color: "#fff",
            maxWidth: 420,
          }}
        >
          Crafting Excellence Since 1979
        </h1>
        <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
          Premium handcrafted footwear made with the finest materials.
        </p>
        <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 1.6, margin: "4px 0 0" }}>
          Quality leather, timeless design, unmatched comfort.
        </p>
      </div>
    </aside>
  );
}