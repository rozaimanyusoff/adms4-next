import React, { useRef, useEffect, useState } from 'react';

interface SliderPuzzleCaptchaProps {
   onSuccess: () => void;
   width?: number;
   height?: number;
}

// Custom slider puzzle: slide to join 'RTSB'
const SliderPuzzleCaptcha: React.FC<SliderPuzzleCaptchaProps> = ({ onSuccess, width = 320, height = 56 }) => {
   const [verified, setVerified] = useState(false);
   const [dragging, setDragging] = useState(false);
   const [sliderX, setSliderX] = useState(0);
   const sliderRef = useRef<HTMLDivElement>(null);
   const trackRef = useRef<HTMLDivElement>(null);

   const sliderWidth = 48;
   const maxX = width - sliderWidth;

   useEffect(() => {
      if (sliderX >= maxX && !verified) {
         setVerified(true);
         onSuccess();
      }
   }, [sliderX, maxX, verified, onSuccess]);

   const onMouseDown = (e: React.MouseEvent) => {
      if (verified) return;
      setDragging(true);
   };
   const onMouseUp = () => {
      if (!dragging) return;
      setDragging(false);
      if (sliderX < maxX) setSliderX(0); // Reset if not complete
   };
   const onMouseMove = (e: MouseEvent) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left - 20; // Center slider
      x = Math.max(0, Math.min(x, maxX));
      setSliderX(x);
   };
   useEffect(() => {
      if (dragging) {
         window.addEventListener('mousemove', onMouseMove);
         window.addEventListener('mouseup', onMouseUp);
      } else {
         window.removeEventListener('mousemove', onMouseMove);
         window.removeEventListener('mouseup', onMouseUp);
      }
      return () => {
         window.removeEventListener('mousemove', onMouseMove);
         window.removeEventListener('mouseup', onMouseUp);
      };
   });

   // Calculate the gap for the puzzle (start with a gap, close as slider moves)
   const minGap = 8;
   const maxGap = 120; // More apart initially
   // When verified, show joined word with no gap
   const gap = verified ? minGap : Math.max(minGap, maxGap - (sliderX / maxX) * (maxGap - minGap));

   return (
      <div style={{ width, height, position: 'relative', userSelect: 'none', margin: '16px 0' }}>
         <div
            ref={trackRef}
            style={{
               width: '100%',
               height: '100%',
               background: verified ? '#d1fae5' : '#f3f4f6',
               borderRadius: 12,
               border: '1.5px solid #d1d5db',
               position: 'relative',
               boxShadow: '0 2px 8px #0001',
            }}
         >
            {/* Slider handle */}
            <div
               ref={sliderRef}
               onMouseDown={onMouseDown}
               style={{
                  width: sliderWidth,
                  height: height - 8,
                  background: verified ? '#10b981' : '#fff',
                  border: '2.5px solid #10b981',
                  borderRadius: 12,
                  position: 'absolute',
                  top: 4,
                  left: sliderX,
                  cursor: verified ? 'not-allowed' : 'pointer',
                  boxShadow: dragging ? '0 2px 12px #10b98133' : '0 1px 4px #0001',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 24,
                  color: verified ? '#fff' : '#10b981',
                  transition: verified ? 'background 0.2s' : undefined,
                  zIndex: 2,
                  userSelect: 'none',
               }}
            >
               {verified ? '✔' : '→'}
            </div>
            {/* Progress bar (z-index 0) */}
            <div
               style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: sliderX + sliderWidth,
                  height: '100%',
                  background: verified ? '#6ee7b7' : '#d1fae5',
                  borderRadius: 12,
                  zIndex: 0,
                  transition: 'background 0.2s',
               }}
            />
            {/* RTSB puzzle text (z-index 2, always on top) */}
            <div
               style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 28,
                  letterSpacing: 2,
                  color: '#222',
                  pointerEvents: 'none',
                  zIndex: 2,
                  userSelect: 'none',
               }}
            >
               {verified ? (
                  <span style={{ fontWeight: 900, transition: 'margin 0.2s' }}>RTSB</span>
               ) : (
                  <>
                     <span style={{ fontWeight: 900, marginRight: gap / 2, transition: 'margin 0.2s' }}>RT</span>
                     <span style={{ fontWeight: 900, marginLeft: gap / 2, transition: 'margin 0.2s' }}>SB</span>
                  </>
               )}
            </div>
         </div>
      </div>
   );
};

export default SliderPuzzleCaptcha;
