/**
 * 图标组件库
 * 使用内联 SVG 实现常用图标
 */

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const IconWrapper: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 20,
  color = 'currentColor',
  className,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

export const CameraIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </IconWrapper>
);

export const CameraCaptureIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <circle cx="12" cy="13" r="3" />
    <circle cx="12" cy="13" r="1.5" fill="currentColor" />
  </IconWrapper>
);

export const RotateLeftIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M1 4v6h6" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </IconWrapper>
);

export const RotateRightIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
  </IconWrapper>
);

export const UploadIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </IconWrapper>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polyline points="20 6 9 17 4 12" />
  </IconWrapper>
);

export const XIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconWrapper>
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </IconWrapper>
);

export const DownloadIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </IconWrapper>
);

export const ProcessIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconWrapper>
);

export const MagicIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    <line x1="6" y1="3" x2="6" y2="21" />
    <line x1="18" y1="3" x2="18" y2="21" />
    <line x1="12" y1="3" x2="12" y2="9" />
  </IconWrapper>
);

export const RefreshIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </IconWrapper>
);

export const PlayIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </IconWrapper>
);

export const StopIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <rect x="6" y="6" width="12" height="12" />
  </IconWrapper>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </IconWrapper>
);

export const CircleIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="10" />
  </IconWrapper>
);

export const SquareIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </IconWrapper>
);

export const TrashIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </IconWrapper>
);
