import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
};

const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={variants}
    initial="initial"
    animate="enter"
    exit="exit"
    className="min-h-screen"
  >
    {children}
  </motion.div>
);

export default PageTransition;
