import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.6,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}: AnimatedNumberProps) {
  const displayValue = useRef(0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  // Use Framer Motion's useMotionValue and useMotionTemplate for number animation
  return (
    <motion.span
      ref={nodeRef}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </motion.span>
  );
}

// Alternative component with actual counting animation
export function ScrollingNumber({
  from = 0,
  to,
  duration = 1.5,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
}: {
  from?: number;
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const displayValue = useRef(from);

  useEffect(() => {
    const element = nodeRef.current;
    if (!element) return;

    const startValue = from;
    const endValue = to;
    const difference = endValue - startValue;
    const isNegative = difference < 0;
    const animationFrameId = requestAnimationFrame(animate);

    let startTime: number;

    function animate(currentTime: number) {
      if (!startTime) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Easing function for smooth scroll effect
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + difference * easeOutCubic;
      displayValue.current = currentValue;

      element.textContent = `${prefix}${currentValue
        .toFixed(decimals)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [to, from, duration, decimals, suffix, prefix]);

  return (
    <motion.span
      ref={nodeRef}
      className={className}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      key={`scroll-${to}`}
    >
      {`${prefix}${from.toLocaleString()}${suffix}`}
    </motion.span>
  );
}
