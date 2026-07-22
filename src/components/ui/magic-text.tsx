"use client" 

import * as React from "react"
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";
 
export interface MagicTextSegment {
  text: string;
  className?: string;
}

export interface MagicTextProps {
  segments?: MagicTextSegment[];
  text?: string;
  className?: string;
}
 
interface WordProps {
  children: string;
  progress: MotionValue<number>;
  range: number[];
}
 
const Word: React.FC<WordProps> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
 
  return (
    <span className="relative mr-1.5 mt-1">
      <span className="absolute opacity-20">{children}</span>
      <motion.span style={{ opacity: opacity }}>{children}</motion.span>
    </span>
  );
};
 
export const MagicText: React.FC<MagicTextProps> = ({ text, segments, className }) => {
  const container = useRef(null);
 
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 0.8", "start 0.2"],
  });
  
  const finalSegments = segments || (text ? [{ text }] : []);
  
  let totalWords = 0;
  finalSegments.forEach(seg => {
    totalWords += seg.text.split(/\s+/).filter(w => w !== "").length;
  });
  
  let wordCount = 0;
 
  return (
    <div ref={container} className={`flex flex-col gap-6 w-full ${className || ''}`}>
      {finalSegments.map((segment, segIndex) => {
        const lines = segment.text.split("\n");
        return (
          <div key={segIndex} className={segment.className}>
            {lines.map((line, lineIndex) => {
              const words = line.split(" ").filter(w => w !== "");
              return (
                <p key={lineIndex} className="flex flex-wrap justify-start text-left">
            {words.map((word, i) => {
              const start = wordCount / totalWords;
              const end = (wordCount + 1) / totalWords;
              wordCount++;
       
              return (
                <Word key={i} progress={scrollYProgress} range={[start, end]}>
                  {word}
                </Word>
              );
            })}
          </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
