"use client";

// Minimal native select wrapper with a shadcn-compatible subset of API.
// SelectItem's map to native <option> elements.

import * as React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  onValueChange?: (value: string) => void;
}

export function Select({ placeholder, onValueChange, children, value, ...props }: SelectProps) {
  return (
    <select
      value={value as string | undefined}
      onChange={(e) => onValueChange?.(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

export function SelectTrigger({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className={className} {...(props as any)} />;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({
  value,
  children,
  ...props
}: { value: string; children: React.ReactNode } & React.OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option value={value} {...(props as any)}>
      {children}
    </option>
  );
}
