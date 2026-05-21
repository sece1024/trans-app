export const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export const cardVariants = {
  hidden:  { opacity: 0, scale: 0.88, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 } },
};
