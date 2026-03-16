"use client";

/**
 * Animated semicircle of travel illustration cards that orbit continuously.
 * Used as the loading indicator while the AI generates itineraries.
 */

const ORBIT_IMAGES = [
  "/orbit/1.webp",  // Santorini
  "/orbit/2.webp",  // Japan
  "/orbit/3.webp",  // Venice
  "/orbit/4.webp",  // Safari
  "/orbit/6.webp",  // Paris
  "/orbit/7.webp",  // Maldives
  "/orbit/8.webp",  // Hot Air Balloons
  "/orbit/9.webp",  // Rio
  "/orbit/11.webp", // Alps
  "/orbit/13.webp", // Morocco
];

const CARD_COUNT = ORBIT_IMAGES.length;
const ORBIT_DURATION = 35; // seconds per full revolution

export function PhotoOrbitLoader() {
  return (
    <div className="photo-orbit-viewport">
      {ORBIT_IMAGES.map((src, i) => (
        <div
          key={i}
          className="photo-orbit-card"
          style={{
            animationDelay: `${(-ORBIT_DURATION * i) / CARD_COUNT}s`,
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="h-full w-full rounded-[17px] object-cover"
          />
        </div>
      ))}
    </div>
  );
}
