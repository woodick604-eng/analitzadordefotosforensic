import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (isCopied) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-base-300 text-content-200 hover:text-content-100 transition-all duration-200 flex-shrink-0"
      aria-label={isCopied ? "Copiat!" : "Copiar al porta-retalls"}
      title={isCopied ? "Copiat!" : "Copiar al porta-retalls"}
    >
      {isCopied ? (
        <CheckIcon className="w-5 h-5 text-green-400" />
      ) : (
        <ClipboardIcon className="w-5 h-5" />
      )}
    </button>
  );
};

export default CopyButton;
