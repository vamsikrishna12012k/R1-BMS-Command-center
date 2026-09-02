import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

interface ScrollAnimateProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur';
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

const animations: Record<string, Variants> = {
  'fade-up': {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-down': {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-left': {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  'fade-right': {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(10px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
};

export function ScrollAnimate({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 0.6,
  className = '',
  once = true,
}: ScrollAnimateProps) {
  const { ref, isVisible } = useScrollAnimation({ once });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={animations[animation]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Grid with staggered children animations
interface ScrollAnimateGridProps {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur';
}

export function ScrollAnimateGrid({
  children,
  className = '',
  staggerDelay = 0.08,
  animation = 'fade-up',
}: ScrollAnimateGridProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={animations[animation]}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
