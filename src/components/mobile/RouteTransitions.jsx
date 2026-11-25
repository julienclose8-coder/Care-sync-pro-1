import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigationType } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const slides = {
  enter: direction => ({ x: direction > 0 ? '100%' : '-100%' }),
  center: { x: 0 },
  leave: direction => ({ x: direction > 0 ? '-100%' : '100%' }),
};
export default function RouteTransitions({ location, children }) {
  const mobile = useIsMobile();
  const reduced = useReducedMotion();
  const direction = useNavigationType() === 'POP' ? -1 : 1;
  const animate = mobile && !reduced;
  return <div className="overflow-x-clip">
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div key={location.pathname} data-route-view={location.pathname} custom={direction} variants={slides} initial={animate ? 'enter' : false} animate="center" exit={animate ? 'leave' : undefined} transition={{ duration: animate ? 0.2 : 0 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  </div>;
}