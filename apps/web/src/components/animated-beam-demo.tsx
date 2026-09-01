"use client";

import React, { forwardRef, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

const Icons = {
  notion: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-free-size="true"
      style={{ width: "22px", height: "22px" }}
    >
      <path
        d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"
        fill="#ffffff"
      />
      <path
        d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
        fill="#000000"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  ),
  googleDrive: () => (
    <svg
      width="22"
      height="20"
      viewBox="0 0 87.3 78"
      xmlns="http://www.w3.org/2000/svg"
      data-free-size="true"
      style={{ width: "22px", height: "20px" }}
    >
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  ),
  telegram: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-free-size="true"
      style={{ width: "24px", height: "24px" }}
    >
      <circle cx="120" cy="120" r="120" fill="#24A1DE" />
      <path
        d="M54 118L174 69c5.5-2.3 10.3 1.1 8.5 9.4l-20.4 96.2c-1.5 6.8-5.6 8.5-11.3 5.3l-31.2-23-15.1 14.5c-1.7 1.7-3.1 3.1-6.3 3.1l2.2-31.9 58.1-52.5c2.5-2.2-.5-3.5-3.9-1.2l-71.8 45.2-31-9.7c-6.7-2.1-6.9-6.7 1.4-9.9z"
        fill="#ffffff"
      />
    </svg>
  ),
  googleDocs: () => (
    <svg
      width="18"
      height="22"
      viewBox="0 0 47 65"
      xmlns="http://www.w3.org/2000/svg"
      data-free-size="true"
      style={{ width: "18px", height: "22px" }}
    >
      <path
        d="M29.375 0H4.406C1.983 0 0 1.994 0 4.432v56.136C0 63.006 1.983 65 4.406 65h38.188C45.017 65 47 63.006 47 60.568V17.727L29.375 0z"
        fill="#4285F4"
      />
      <path
        d="M11.75 47.273h23.5v-2.955H11.75v2.955zm0 5.909h17.625v-2.955H11.75v2.955zm0-20.682v2.955h23.5V32.5H11.75zm0 8.864h23.5v-2.955H11.75v2.955z"
        fill="#F1F1F1"
      />
      <path d="M29.375 0v17.727H47L29.375 0z" fill="#A1C2FA" />
    </svg>
  ),
  customLogo: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-free-size="true"
      style={{ width: "22px", height: "22px" }}
    >
      <defs>
        <linearGradient id="custom-logo-orange-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FF2A2A" />
        </linearGradient>
        <linearGradient id="custom-logo-gray" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A8A49C" />
          <stop offset="100%" stopColor="#87837B" />
        </linearGradient>
        <linearGradient id="custom-logo-orange-bottom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF2A2A" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
      </defs>
      <path
        d="M 8 20 H 44 V 36 H 25 V 60 H 8 Z"
        fill="url(#custom-logo-orange-top)"
      />
      <path
        d="M 48 10 H 94 V 60 H 64 V 36 H 48 Z"
        fill="url(#custom-logo-gray)"
      />
      <path
        d="M 19 64 H 25 V 75 H 68 V 64 H 74 V 96 H 19 Z"
        fill="url(#custom-logo-orange-bottom)"
      />
    </svg>
  ),
  messenger: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      data-free-size="true"
      style={{ width: "22px", height: "22px" }}
    >
      <radialGradient id="msg-beam-gradient-filika" cx="11.087" cy="7.022" r="47.612" gradientTransform="matrix(1 0 0 -1 0 50)" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#1292ff" />
        <stop offset=".079" stopColor="#2982ff" />
        <stop offset=".23" stopColor="#4e69ff" />
        <stop offset=".351" stopColor="#6559ff" />
        <stop offset=".428" stopColor="#6d53ff" />
        <stop offset=".754" stopColor="#df47aa" />
        <stop offset=".946" stopColor="#ff6257" />
      </radialGradient>
      <path
        fill="url(#msg-beam-gradient-filika)"
        d="M44 23.5C44 34.27 35.05 43 24 43c-1.651 0-3.25-.194-4.784-.564-.465-.112-.951-.069-1.379.145L13.46 44.77C12.33 45.335 11 44.513 11 43.249v-4.025c0-.575-.257-1.111-.681-1.499C6.425 34.165 4 29.11 4 23.5 4 12.73 12.95 4 24 4s20 8.73 20 19.5z"
      />
      <path
        fill="#ffffff"
        d="M34.394 18.501l-5.7 4.22c-.61.46-1.44.46-2.04.01L22.68 19.74c-1.68-1.25-4.06-.82-5.19.94l-1.21 1.89-4.11 6.68c-.6.94.55 2.01 1.44 1.34l5.7-4.22c.61-.46 1.44-.46 2.04-.01l3.974 2.991c1.68 1.25 4.06.82 5.19-.94l1.21-1.89 4.11-6.68c.55-.89-.6-1.96-1.44-1.29z"
      />
    </svg>
  ),
};

export function AnimatedBeamDemo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);
  const div7Ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-[280px] w-full items-center justify-center px-2 py-4 sm:px-4",
        className,
      )}
    >
      <div className="flex size-full max-h-[220px] w-full max-w-[320px] flex-col items-stretch justify-between gap-6">
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div1Ref}>
            <Icons.googleDrive />
          </Circle>
          <Circle ref={div5Ref}>
            <Icons.googleDocs />
          </Circle>
        </div>
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div2Ref}>
            <Icons.notion />
          </Circle>
          <Circle
            ref={div4Ref}
            className="size-16 p-3 shadow-[0_6px_25px_rgba(0,159,227,0.22)] dark:bg-[#1f2028]"
          >
            <Image
              src="/filika-logo.svg"
              alt="Filika"
              width={36}
              height={36}
              className="size-9 object-contain"
              unoptimized
            />
          </Circle>
          <Circle ref={div6Ref}>
            <Icons.customLogo />
          </Circle>
        </div>
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div3Ref}>
            <Icons.telegram />
          </Circle>
          <Circle ref={div7Ref}>
            <Icons.messenger />
          </Circle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div4Ref}
        curvature={-60}
        endYOffset={-10}
        gradientStartColor="#009fe3"
        gradientStopColor="#009fe3"
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={div4Ref}
        gradientStartColor="#009fe3"
        gradientStopColor="#009fe3"
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div4Ref}
        curvature={60}
        endYOffset={10}
        gradientStartColor="#009fe3"
        gradientStopColor="#009fe3"
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div4Ref}
        curvature={-60}
        endYOffset={-10}
        reverse
        gradientStartColor="#009fe3"
        gradientStopColor="#009fe3"
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={div4Ref}
        reverse
        gradientStartColor="#009fe3"
        gradientStopColor="#009fe3"
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div7Ref}
        toRef={div4Ref}
        curvature={60}
        endYOffset={10}
        reverse
        gradientStartColor="#009fe3"
        gradientStopColor="#009fe3"
        duration={3}
      />
    </div>
  );
}
