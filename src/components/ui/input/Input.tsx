import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({ className, ...props }: InputProps) => {
  return <input {...props} className={`input-style ${className || ""}`} />;
};

export default Input;
