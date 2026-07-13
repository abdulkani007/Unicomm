import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words' | 'lines';
  from?: Record<string, any>;
  to?: Record<string, any>;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  tag?: string;
  onLetterAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete
}) => {
  const ref = useRef<HTMLElement>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useGSAP(
    () => {
      if (!ref.current || !text) return;
      if (animationCompletedRef.current) return;
      const el = ref.current;

      // Find all target children spans to animate
      const targets = el.querySelectorAll('.split-item');
      if (!targets.length) return;

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      gsap.fromTo(
        targets,
        { ...from },
        {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          scrollTrigger: {
            trigger: el,
            start,
            once: true,
            fastScrollEnd: true,
            anticipatePin: 0.4
          },
          onComplete: () => {
            animationCompletedRef.current = true;
            onCompleteRef.current?.();
          },
          willChange: 'transform, opacity',
          force3D: true
        }
      );

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin
      ],
      scope: ref
    }
  );

  const renderContent = () => {
    if (splitType === 'words') {
      return text.split(' ').map((word, idx) => (
        <span
          key={idx}
          className="split-item split-word"
          style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: '0.25em' }}
        >
          {word}
        </span>
      ));
    }

    if (splitType === 'lines') {
      // Simplistic line split by sentences
      return text.split('. ').map((line, idx) => (
        <span
          key={idx}
          className="split-item split-line"
          style={{ display: 'block', willChange: 'transform, opacity' }}
        >
          {line}
        </span>
      ));
    }

    // Default: chars
    return text.split('').map((char, idx) => (
      <span
        key={idx}
        className="split-item split-char"
        style={{
          display: 'inline-block',
          whiteSpace: char === ' ' ? 'pre' : 'normal',
          willChange: 'transform, opacity'
        }}
      >
        {char}
      </span>
    ));
  };

  const style: React.CSSProperties = {
    textAlign,
    overflow: 'hidden',
    display: 'inline-block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    willChange: 'transform, opacity'
  };
  const classes = `split-parent ${className}`;
  const Tag = tag as any;

  return (
    <Tag ref={ref} style={style} className={classes}>
      {renderContent()}
    </Tag>
  );
};

export default SplitText;
