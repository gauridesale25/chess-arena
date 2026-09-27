export const Button = ({
  className,
  onClick,
  children,
  disabled = false,
}: {
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      className={`${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
