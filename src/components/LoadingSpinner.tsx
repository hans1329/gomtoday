import { PenLine, Notebook } from "lucide-react";
import { useEffect, useState } from "react";

export const LoadingSpinner = () => {
  const [showPen, setShowPen] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowPen((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div
        className={`absolute transition-all duration-300 ${
          showPen
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 rotate-180"
        }`}
      >
        <PenLine className="w-8 h-8 text-primary" />
      </div>
      <div
        className={`absolute transition-all duration-300 ${
          !showPen
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 -rotate-180"
        }`}
      >
        <Notebook className="w-8 h-8 text-primary" />
      </div>
    </div>
  );
};
