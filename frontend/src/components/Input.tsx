import React from "react";

export const Input = ({
    src,
    placeholder,
    type,
    className,
    onChange,
    value,
}: {
    src?: string;
    placeholder?: string;
    type?: string;
    className?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    value: string;
}) => {
    return (
        <div className="relative w-full">
            {src && (
                <img
                    src={src}
                    alt="icon"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                />
            )}
            <input
                type={type || "text"}
                placeholder={placeholder}
                className={`pl-10 pr-4 py-2 border rounded ${className}`}
                onChange={onChange}
                value={value}
            />
        </div>
    );
};
