"use client";

import React from "react";
import { motion } from "framer-motion";

export type AnimatedTestimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export function TestimonialsColumn(props: {
  className?: string;
  testimonials: AnimatedTestimonial[];
  duration?: number;
}) {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 12,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 bg-background pb-6"
      >
        {[...new Array(2).fill(0)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/10" key={`${index}-${i}`}>
                <div className="text-sm leading-7 text-white/80">{text}</div>
                <div className="mt-5 flex items-center gap-3">
                  <img width={40} height={40} src={image} alt={name} className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex flex-col">
                    <div className="font-medium leading-5 tracking-tight text-white">{name}</div>
                    <div className="leading-5 tracking-tight text-white/55">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
