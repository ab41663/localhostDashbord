import React from 'react';

// Common SVG props
const iconProps = {
    viewBox: "0 0 64 64",
    width: "24px",
    height: "24px",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { marginRight: '8px', verticalAlign: 'middle' }
};

export const S3Icon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <ellipse cx="32" cy="16" rx="20" ry="8" />
        <path d="M12 16v32c0 4.4 9 8 20 8s20-3.6 20-8V16" />
        <path d="M12 32c0 4.4 9 8 20 8s20-3.6 20-8" />
    </svg>
);

export const DynamoDBIcon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <rect x="12" y="8" width="40" height="48" rx="4" />
        <path d="M12 24h40" />
        <path d="M12 40h40" />
        <circle cx="20" cy="16" r="2" fill={color} />
        <circle cx="20" cy="32" r="2" fill={color} />
        <circle cx="20" cy="48" r="2" fill={color} />
    </svg>
);

export const SQSIcon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <rect x="8" y="20" width="12" height="24" rx="2" />
        <rect x="26" y="20" width="12" height="24" rx="2" />
        <rect x="44" y="20" width="12" height="24" rx="2" />
        <path d="M14 12l24 0M34 6l6 6-6 6" />
    </svg>
);

export const IAMIcon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <circle cx="32" cy="24" r="10" />
        <path d="M16 52c0-8.8 7.2-16 16-16s16 7.2 16 16" />
        <path d="M40 40l12-12m-2-2l4 4m2-6l4 4" />
    </svg>
);

export const SESIcon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <rect x="8" y="16" width="48" height="32" rx="4" />
        <path d="M8 20l24 16 24-16" />
    </svg>
);

export const SSMIcon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <circle cx="32" cy="32" r="8" />
        <path d="M32 16v-6M32 54v-6M16 32h-6M54 32h-6M20.7 20.7l-4.2-4.2M47.5 47.5l-4.2-4.2M20.7 43.3l-4.2 4.2M47.5 16.5l-4.2 4.2" />
    </svg>
);

export const HomeIcon = ({ color = "#ec7211", ...props }) => (
    <svg {...iconProps} stroke={color} {...props}>
        <path d="M12 24l20-16 20 16v24a4 4 0 01-4 4H16a4 4 0 01-4-4V24z" />
        <path d="M26 48V32h12v16" />
    </svg>
);
