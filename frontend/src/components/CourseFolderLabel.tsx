import React from 'react';

interface CourseFolderLabelProps {
  name: string;
  color: string;
  subtitle?: string;
  size?: 'sm' | 'md';
}

/** Consistent course folder title with color bar — used in sidebar and lecture header. */
const CourseFolderLabel: React.FC<CourseFolderLabelProps> = ({
  name,
  color,
  subtitle,
  size = 'md',
}) => (
  <div className="min-w-0">
    <span
      className={`block rounded-full ${size === 'md' ? 'h-1 mb-2' : 'h-0.5 mb-1.5'}`}
      style={{ backgroundColor: color }}
      aria-hidden
    />
    <p
      className={`font-serif text-stone-900 leading-tight truncate ${
        size === 'md' ? 'text-lg' : 'text-base'
      }`}
    >
      {name}
    </p>
    {subtitle && <p className="text-xs text-stone-500 mt-0.5 truncate">{subtitle}</p>}
  </div>
);

export default CourseFolderLabel;
